#!/usr/bin/env python3
"""Paid-order to ESC/POS bridge. Persistent deduplication; never replay history implicitly.

source may be a local orders.json (testing) or the live order site, e.g.
"https://order.dumplinglab.sg": then paid orders are read from /api/feed with the
staff password from DL_STAFF_PASSWORD (or "password" in the config)."""
import argparse, datetime, fcntl, hashlib, json, logging, math, os, socket, sqlite3, subprocess, tempfile, time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def orders_from(document):
    orders = {}
    rows = list(document.get('events', []))
    rows += [record.get('value', {}) for record in document.get('online', {}).values()]
    for record in document.get('tableStates', {}).values():
        rows += record.get('value', {}).get('events', [])
    for order in rows:
        if order.get('id') and order.get('status') == 'paid' and order.get('items'):
            previous = orders.get(order['id'])
            if not previous or order.get('paidAt', '') >= previous.get('paidAt', ''):
                orders[order['id']] = order
    return list(orders.values())


def load_source(config):
    source = config['source']
    if not source.startswith('https://'):
        return json.loads(Path(source).read_text())
    password = os.environ.get('DL_STAFF_PASSWORD') or config.get('password')
    if not password:
        raise ValueError('Set DL_STAFF_PASSWORD to read live orders')
    # macOS curl uses the system certificates; the password goes in on stdin, not argv.
    result = subprocess.run(['curl', '-sS', '--max-time', '10', '-K', '-', '-w', '\n%{http_code}', source.rstrip('/')+'/api/feed?after=0&refunds=1'],
                            input='user = "staff:'+password.replace('"', '\\"')+'"\n', capture_output=True, text=True)
    body, _, status = result.stdout.rpartition('\n')
    if result.returncode or status != '200':
        raise OSError('Live order feed unavailable (HTTP '+(status or '-')+') '+result.stderr.strip())
    return json.loads(body)


def paid_time(order):
    try:
        return datetime.datetime.fromisoformat(order['paidAt'].replace('Z', '+00:00')).timestamp()
    except (KeyError, ValueError):
        return 0


def station_items(order):
    result = {}
    for item in order['items']:
        station = item.get('printStation')
        if station not in ('kitchen', 'bar'):
            raise ValueError('Missing/invalid saved printStation; manual review required')
        result.setdefault(station, []).append(item)
    return result


def raster(lines):
    """Render (text, font) lines to one cut ESC/POS raster slip and its preview image."""
    wrapped = []
    for text, face in lines:
        text = ''.join(c for c in text if c >= ' ')[:500]
        line = ''
        for char in text:
            if face.getlength(line+char) > 480 and line:
                wrapped.append((line, face));line = ''
            line += char
        if line:
            wrapped.append((line, face))
    height = 30+sum(face.size+14 for _, face in wrapped)
    im = Image.new('RGB', (512, height), 'white');draw = ImageDraw.Draw(im);y = 12
    for line, face in wrapped:
        draw.text((16, y), line, font=face, fill='black');y += face.size+14
    mono = im.convert('L').point(lambda v: 255 if v > 160 else 0, mode='1')
    bits = bytes(b ^ 255 for b in mono.tobytes())
    header = b'\x1b@\x1ba\x00\x1dv0\x00'+bytes([64, 0, height & 255, height >> 8])
    return header+bits+b'\n\n\n\x1dV\x00', im


# Parse by the declared raster length: image bytes can themselves contain ESC/cut
# sequences, so splitting on a delimiter would corrupt perfectly valid pictures.
def print_frames(data):
    frames = []; offset = 0
    prefix = b'\x1b@\x1ba\x00\x1dv0\x00'
    trailer = b'\n\n\n\x1dV\x00'
    while offset < len(data):
        if data[offset:] == b'\x1bB\x03\x03':
            frames.append((data[offset:], False));break
        if data[offset:offset+9] != prefix or len(data)-offset < 13:
            raise ValueError('Invalid raster header')
        width = int.from_bytes(data[offset+9:offset+11], 'little')
        height = int.from_bytes(data[offset+11:offset+13], 'little')
        end = offset+13+width*height
        if width != 64 or not height or data[end:end+6] != trailer:
            raise ValueError('Invalid raster length/cut boundary')
        frames.append((data[offset:end+6], True));offset = end+6
    if not frames:
        raise ValueError('Empty print job')
    return frames


def send_paced(connection, frames, sleep=time.sleep):
    # Conservative pacing for the shop's network printers. This is transport
    # throttling, not a claim that the device acknowledged printing each slip.
    for frame, is_slip in frames:
        for offset in range(0, len(frame), 1024):
            connection.sendall(frame[offset:offset+1024])
            sleep(0.04)
        if is_slip:
            sleep(0.6)


def stack(images):
    """One preview PNG for several slips, with a gap where the paper is cut."""
    out = Image.new('RGB', (512, sum(i.height for i in images)+24*(len(images)-1)), (200, 200, 200));y = 0
    for i in images:
        out.paste(i, (0, y));y += i.height+24
    return out


def receipt(order, station, items, font_path, test_mode=True, per_dish=False):
    font = ImageFont.truetype(font_path, 24)
    large = ImageFont.truetype(font_path, 40)
    detail = ImageFont.truetype(font_path, 36)
    huge = ImageFont.truetype(font_path, 64)
    place = '桌号 '+str(order['table']) if order.get('table') else '自取 '+str((order.get('pickup') or {}).get('number', ''))
    station_name = '厨房' if station == 'kitchen' else '吧台 · 饮品及凉菜'
    paid = datetime.datetime.fromtimestamp(paid_time(order), datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y-%m-%d %H:%M') if paid_time(order) else ''
    # 买一赠一 arrives as a paid line plus a $0 line; print them as one dish with the gift noted.
    merged = {}
    for item in items:
        key = (item.get('id') or item.get('name'), item.get('style'), item.get('note'))
        line = merged.setdefault(key, dict(item, qty=0, gift=0))
        line['qty'] += item['qty']
        line['gift'] += item['qty'] if item.get('promo') == 'bogo' else 0
    items = list(merged.values())
    contact = []
    if order.get('mode') == 'takeaway':
        customer = order.get('customer') or {}
        fulfilment = order.get('fulfilment') or {}
        if fulfilment.get('date') and fulfilment.get('slot'):
            contact.append(('取餐：'+str(fulfilment['date'])+' '+str(fulfilment['slot']), detail))
        contact += [('取餐人：'+str(customer.get('name') or '未填写'), detail), ('电话：'+str(customer.get('phone') or '未填写'), detail)]
    dish = lambda item: str(item.get('name', '菜品'))+' × '+str(item['qty'])+('（含赠 '+str(item['gift'])+'）' if item['gift'] else '')
    if per_dish:
        # 午市分开出餐：每道菜一张，送餐的人看桌号就知道送去哪。
        slips = []
        for item in items:
            lines = [('测试单 / DO NOT PREPARE', font)] if test_mode else []
            lines += [(place, huge)] + contact + [(dish(item), large)]
            if item.get('style'):
                lines += [(str(item['style']), detail)]
            if item.get('note'):
                lines += [('这份：'+str(item['note']), large)]
            if order.get('note'):
                lines += [('备注：'+str(order['note']), detail)]
            lines += [(station_name.split(' · ')[0]+' · 订单 '+str(order.get('no', order['id'][:8])), font)]
            if paid:
                lines += [('付款 '+paid, font)]
            slips.append(raster(lines))
        return b''.join(data for data, _ in slips), stack([im for _, im in slips])
    lines = [('DUMPLING LAB', large), (station_name, large)]
    if test_mode:
        lines += [('测试单 / DO NOT PREPARE', font)]
    lines += [('订单 '+str(order.get('no', order['id'][:8]))+'  '+place, large)]
    lines += contact
    for item in items:
        lines += [(dish(item), large)]
        if item.get('style'):
            lines += [(str(item['style']), detail)]
        if item.get('note'):
            lines += [('这份：'+str(item['note']), large)]
    if order.get('note'):
        lines += [('备注：'+str(order['note']), detail)]
    lines += [('付款 '+paid, font), ('ID '+order['id'][:18], font)]
    return raster(lines)


def refund_receipt(job, font_path, test_mode=True):
    """Customer copy; never a kitchen preparation slip or a new refund request."""
    font = ImageFont.truetype(font_path, 24)
    small = ImageFont.truetype(font_path, 20)
    large = ImageFont.truetype(font_path, 38)
    title = ImageFont.truetype(font_path, 44)
    lines = []
    def add(text, face=font):
        lines.append((str(text), face))
    if test_mode:
        add('示意样张 / SAMPLE - NOT VALID', small)
    add('退款凭证', title);add('REFUND RECEIPT', font)
    if job.get('reprint'):
        add('补打 / REPRINT', font)
    add('------------------------------', small)
    add('原订单号 / Original order', small);add('#'+job['orderNo'])
    add(('桌号 / Table: '+job['table']) if job.get('table') else ('自取 / Pickup: '+str(job.get('pickupNumber') or '-')))
    add('退款时间 / Refund date & time', small)
    when = datetime.datetime.fromisoformat(job['at'].replace('Z', '+00:00')).astimezone(datetime.timezone(datetime.timedelta(hours=8)))
    add(when.strftime('%Y-%m-%d %H:%M'))
    add('------------------------------', small)
    add('退款项目 / Refunded items')
    for item in job.get('items', []):
        add(item['name']+' x '+str(item['qty']))
        if item.get('englishName'):add(item['englishName']+' x '+str(item['qty']), small)
        if item.get('style'):
            add(item['style'], small)
            style=item['style']
            for zh,en in [('红油花生酱拌','Chilli peanut sauce'),('水煮','Boiled'),('清汤','Clear soup'),('煎饺','Pan-fried'),('红油','Chilli oil'),('颗',' pieces'),('加面','with noodles')]:
                style=style.replace(zh,en)
            if style!=item['style']:add(style,small)
    if not job.get('items'):
        add('按金额退款 / Amount adjustment')
    if job.get('reason'):
        add('原因 / Reason: '+job['reason'],small)
    add('------------------------------',small)
    if 'itemRefundCents' in job:
        for zh,en,key in [('菜品退款','Item refund','itemRefundCents'),('服务费退回','Service charge refund','serviceRefundCents')]:
            amount='S$'+format(job[key]/100,'.2f')
            space=' '
            while font.getlength(zh+space+' '+amount)<=480:space+=' '
            add(zh+space+amount);add(en,small)
        add('------------------------------',small)
    add('退款合计 / TOTAL REFUND')
    add('S$'+format(job['amountCents']/100,'.2f'),large)
    add('含适用的服务费',small);add('Includes applicable service charge',small)
    add('------------------------------',small)
    add('退款方式 / Refund method',small)
    method=job['method']
    zh,en={'original':('原支付渠道退回','Original payment method'),'wallet':('店内余额退回','Store balance'),'cash':('现金','Cash'),'terminal':('柜台刷卡机','Counter card terminal')}[method]
    add(zh);add(en,small)
    add('退款编号 / Refund reference',small)
    # Full reference stays available, with wrapping independent from the timestamp.
    add(job['reference'],small)
    add('------------------------------',small)
    if method=='original':
        add('退款已提交',large);add('REFUND SUBMITTED')
        add('到账时间以银行为准',small);add('Processing time depends on your bank.',small)
    elif method=='wallet':
        add('已退回余额',large);add('REFUNDED TO STORE BALANCE',small)
    elif job.get('counterConfirmed'):
        add('柜台已退款',large);add('REFUNDED AT COUNTER')
    else:
        add('柜台退款记录',large);add('COUNTER REFUND RECORD')
        add('请向店员确认退款',small);add('Please confirm with staff.',small)
    add('请保留此凭证以便查询',small);add('Please keep this receipt for enquiries.',small)
    _, body = raster(lines)
    logo_path = Path(__file__).with_name('refund-logo.png')
    if not logo_path.is_file():
        logo_path=Path(__file__).resolve().parents[1]/'web/brand/dumpling-lab-primary.png'
    logo=Image.open(logo_path).convert('RGBA');logo.thumbnail((330,130))
    ink=Image.new('RGBA',logo.size,'black');ink.putalpha(logo.getchannel('A'))
    image=Image.new('RGB',(512,body.height+logo.height+40),'white')
    image.paste(ink,((512-logo.width)//2,16),ink);image.paste(body,(0,logo.height+40))
    mono=image.convert('L').point(lambda v:255 if v>160 else 0,mode='1')
    height=image.height
    header=b'\x1b@\x1ba\x00\x1dv0\x00'+bytes([64,0,height&255,height>>8])
    return header+bytes(b^255 for b in mono.tobytes())+b'\n\n\n\x1dV\x00',image


class Bridge:
    def __init__(self, config):
        self.config = config
        self.db = sqlite3.connect(config['ledger'])
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS jobs (key TEXT PRIMARY KEY, station TEXT, payload TEXT, status TEXT, attempts INTEGER DEFAULT 0, next_at REAL DEFAULT 0, error TEXT, updated REAL)')
        self.db.execute('INSERT OR IGNORE INTO meta VALUES (?,?)', ('since', str(time.time())))
        self.db.execute('INSERT OR IGNORE INTO meta VALUES (?,?)', ('refundsSince', str(time.time())))
        self.refunds_since = float(self.db.execute('SELECT value FROM meta WHERE key=?', ('refundsSince',)).fetchone()[0])
        self.since = float(self.db.execute('SELECT value FROM meta WHERE key=?', ('since',)).fetchone()[0])
        self.db.execute("UPDATE jobs SET status='uncertain',error='Interrupted while sending; verify paper before any manual reprint' WHERE status='sending'")
        self.db.commit()

    def enqueue(self, orders, include=()):
        for order in orders:
            if paid_time(order) < self.since and order['id'] not in include:
                continue
            for station, items in station_items(order).items():
                key = order['id']+':'+station
                self.db.execute('INSERT OR IGNORE INTO jobs(key,station,payload,status,updated) VALUES(?,?,?,?,?)',
                                (key, station, json.dumps({'order': order, 'items': items}, ensure_ascii=False), 'queued', time.time()))
        self.db.commit()

    def enqueue_refunds(self, jobs):
        for job in jobs:
            if datetime.datetime.fromisoformat(job['createdAt'].replace('Z', '+00:00')).timestamp() < self.refunds_since:
                continue
            key=job['id']
            if not key.startswith('refund:') or any(c not in 'abcdef0123456789:-' for c in key[7:]):
                raise ValueError('Invalid refund print job id')
            self.db.execute('INSERT OR IGNORE INTO jobs(key,station,payload,status,updated) VALUES(?,?,?,?,?)',
                            (key,'bar',json.dumps({'refund':job},ensure_ascii=False),'queued',time.time()))
        self.db.commit()

    def process(self):
        jobs = self.db.execute("SELECT * FROM jobs WHERE status='queued' AND next_at<=? ORDER BY updated", (time.time(),)).fetchall()
        for job in jobs:
            config = self.config['printers'].get(job['station'])
            if not config:
                self.finish(job, 'failed', 'Printer not configured');continue
            payload = json.loads(job['payload'])
            try:
                data, picture = refund_receipt(payload['refund'], self.config['font'], self.config.get('testMode', True)) if 'refund' in payload else receipt(payload['order'], job['station'], payload['items'], self.config['font'], self.config.get('testMode', True), self.config.get('slipPerDish', False))
            except Exception as error:
                self.finish(job, 'failed', 'Rendering failed: '+str(error));continue
            if self.config.get('beep', True):
                # 佳博 ESC B n t：响 n 声，每声 t×50ms。整单打完响一次，不按每道菜响。
                data += b'\x1bB\x03\x03'
            output = Path(self.config['receipts']);output.mkdir(parents=True, exist_ok=True)
            picture.save(output/(job['key'].replace(':', '-')+'.png'))
            try:
                frames = print_frames(data)
            except ValueError as error:
                self.finish(job, 'failed', str(error));continue
            output.joinpath(job['key'].replace(':', '-')+'.bin').write_bytes(data)
            logging.info('%s sending bytes=%s slips=%s sha256=%s transport=direct-v2', job['key'], len(data), sum(s for _, s in frames), hashlib.sha256(data).hexdigest())
            self.db.execute("UPDATE jobs SET status='sending',attempts=attempts+1,updated=? WHERE key=?", (time.time(), job['key']));self.db.commit()
            try:
                connection = socket.create_connection((config['host'], config.get('port', 9100)), timeout=3)
            except OSError as error:
                attempts = job['attempts']+1
                self.db.execute("UPDATE jobs SET status=?,error=?,next_at=?,updated=? WHERE key=?",
                                ('failed' if attempts >= 5 else 'queued', 'Connection failed: '+str(error), time.time()+min(300, 5*2**(attempts-1)), time.time(), job['key']))
                self.db.commit();logging.error('%s connection failed: %s', job['key'], error);continue
            try:
                with connection:
                    connection.settimeout(10);connection.sendall(data)
            except OSError as error:
                self.finish(job, 'uncertain', 'Send outcome unknown; do not auto-retry: '+str(error));continue
            self.finish(job, 'sent', '')

    def finish(self, job, status, error):
        self.db.execute('UPDATE jobs SET status=?,error=?,updated=? WHERE key=?', (status, error, time.time(), job['key']));self.db.commit()
        logging.info('%s %s %s', job['key'], status, error)


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--config', required=True);parser.add_argument('--include-order', action='append', default=[]);parser.add_argument('--watch', action='store_true');args = parser.parse_args()
    # One process across all copied folders on this Mac; the ledger lock alone
    # cannot stop an older copy using another database from writing to the same printer.
    process_lock = open(Path(tempfile.gettempdir())/('dumplinglab-printer-'+str(os.getuid())+'.lock'),'a')
    try:fcntl.flock(process_lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:raise SystemExit('已有出单程序运行，请使用原窗口，不要重复启动。')
    processes = subprocess.run(['ps','-axo','pid=,command='],capture_output=True,text=True,check=True)
    for row in processes.stdout.splitlines():
        parts=row.strip().split(None,1)
        if len(parts)==2 and parts[0]!=str(os.getpid()) and 'printer-bridge.py' in parts[1] and Path(parts[1].split()[0]).name.lower().startswith('python'):
            raise SystemExit('检测到另一份出单程序，请先关闭旧出单窗口；未发送任何订单。')
    config = json.loads(Path(args.config).read_text());Path(config['ledger']).parent.mkdir(parents=True, exist_ok=True)
    lock = open(config['ledger']+'.lock', 'a')
    try:fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:raise SystemExit('A printer bridge already owns this ledger')
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    live = config['source'].startswith('https://')
    bridge = Bridge(config);logging.info('Printer bridge direct-v2 (优化版：无固定限速，自提联系人). Watching %s paid orders; history cutoff=%s; testMode=%s', 'live' if live else 'local', bridge.since, config.get('testMode', True))
    while True:
        try:
            document=load_source(config)
            bridge.enqueue(orders_from(document), args.include_order)
            bridge.enqueue_refunds(document.get('refundPrintJobs', []));bridge.process()
        except (OSError, ValueError, sqlite3.Error):logging.exception('Printer cycle failed; no blind reprints')
        if not args.watch:break
        time.sleep(config.get('pollSeconds', 3 if live else 1))

if __name__ == '__main__':main()
