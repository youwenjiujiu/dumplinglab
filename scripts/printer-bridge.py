#!/usr/bin/env python3
"""Paid-order to ESC/POS bridge. Persistent deduplication; never replay history implicitly.

source may be a local orders.json (testing) or the live order site, e.g.
"https://order.dumplinglab.sg": then paid orders are read from /api/feed with the
staff password from DL_STAFF_PASSWORD (or "password" in the config)."""
import argparse, datetime, fcntl, hashlib, json, logging, math, os, socket, sqlite3, subprocess, time
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
    result = subprocess.run(['curl', '-sS', '--max-time', '10', '-K', '-', '-w', '\n%{http_code}', source.rstrip('/')+'/api/feed?after=0'],
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
    paid = datetime.datetime.fromtimestamp(paid_time(order), datetime.timezone(datetime.timedelta(hours=8))).strftime('%m-%d %H:%M') if paid_time(order) else ''
    # 买一赠一 arrives as a paid line plus a $0 line; print them as one dish with the gift noted.
    merged = {}
    for item in items:
        key = (item.get('id') or item.get('name'), item.get('style'), item.get('note'))
        line = merged.setdefault(key, dict(item, qty=0, gift=0))
        line['qty'] += item['qty']
        line['gift'] += item['qty'] if item.get('promo') == 'bogo' else 0
    items = list(merged.values())
    dish = lambda item: str(item.get('name', '菜品'))+' × '+str(item['qty'])+('（含赠 '+str(item['gift'])+'）' if item['gift'] else '')
    if per_dish:
        # 午市分开出餐：每道菜一张，送餐的人看桌号就知道送去哪。
        slips = []
        for item in items:
            lines = [('测试单 / DO NOT PREPARE', font)] if test_mode else []
            lines += [(place, huge), (dish(item), large)]
            if item.get('style'):
                lines += [(str(item['style']), detail)]
            if item.get('note'):
                lines += [('这份：'+str(item['note']), large)]
            if order.get('note'):
                lines += [('备注：'+str(order['note']), detail)]
            lines += [(station_name.split(' · ')[0]+' · 订单 '+str(order.get('no', order['id'][:8]))+' · '+paid, font)]
            slips.append(raster(lines))
        return b''.join(data for data, _ in slips), stack([im for _, im in slips])
    lines = [('DUMPLING LAB', large), (station_name, large)]
    if test_mode:
        lines += [('测试单 / DO NOT PREPARE', font)]
    lines += [('订单 '+str(order.get('no', order['id'][:8]))+'  '+place, large)]
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


class Bridge:
    def __init__(self, config):
        self.config = config
        self.db = sqlite3.connect(config['ledger'])
        self.db.row_factory = sqlite3.Row
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)')
        self.db.execute('CREATE TABLE IF NOT EXISTS jobs (key TEXT PRIMARY KEY, station TEXT, payload TEXT, status TEXT, attempts INTEGER DEFAULT 0, next_at REAL DEFAULT 0, error TEXT, updated REAL)')
        self.db.execute('INSERT OR IGNORE INTO meta VALUES (?,?)', ('since', str(time.time())))
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

    def process(self):
        jobs = self.db.execute("SELECT * FROM jobs WHERE status='queued' AND next_at<=? ORDER BY updated", (time.time(),)).fetchall()
        for job in jobs:
            config = self.config['printers'].get(job['station'])
            if not config:
                self.finish(job, 'failed', 'Printer not configured');continue
            payload = json.loads(job['payload'])
            try:
                data, picture = receipt(payload['order'], job['station'], payload['items'], self.config['font'], self.config.get('testMode', True), self.config.get('slipPerDish', False))
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
            logging.info('%s sending bytes=%s slips=%s sha256=%s transport=paced-v1', job['key'], len(data), sum(s for _, s in frames), hashlib.sha256(data).hexdigest())
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
                    connection.settimeout(10);send_paced(connection, frames)
            except OSError as error:
                self.finish(job, 'uncertain', 'Send outcome unknown; do not auto-retry: '+str(error));continue
            self.finish(job, 'sent', '')

    def finish(self, job, status, error):
        self.db.execute('UPDATE jobs SET status=?,error=?,updated=? WHERE key=?', (status, error, time.time(), job['key']));self.db.commit()
        logging.info('%s %s %s', job['key'], status, error)


def main():
    parser = argparse.ArgumentParser();parser.add_argument('--config', required=True);parser.add_argument('--include-order', action='append', default=[]);parser.add_argument('--watch', action='store_true');args = parser.parse_args()
    config = json.loads(Path(args.config).read_text());Path(config['ledger']).parent.mkdir(parents=True, exist_ok=True)
    lock = open(config['ledger']+'.lock', 'a')
    try:fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:raise SystemExit('A printer bridge already owns this ledger')
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    live = config['source'].startswith('https://')
    bridge = Bridge(config);logging.info('Printer bridge paced-v1. Watching %s paid orders; history cutoff=%s; testMode=%s', 'live' if live else 'local', bridge.since, config.get('testMode', True))
    while True:
        try:
            bridge.enqueue(orders_from(load_source(config)), args.include_order);bridge.process()
        except (OSError, ValueError, sqlite3.Error):logging.exception('Printer cycle failed; no blind reprints')
        if not args.watch:break
        time.sleep(config.get('pollSeconds', 3 if live else 1))

if __name__ == '__main__':main()
