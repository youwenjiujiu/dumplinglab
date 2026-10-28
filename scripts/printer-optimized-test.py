import importlib.util,json,sqlite3,tempfile,fcntl
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
bridge=module('bridge','printer-bridge.py');update=module('update','printer-update.py')
order={'id':'pickup-test','mode':'takeaway','pickup':{'number':'A001'},'no':'TEST','customer':{'name':'林 小姐','phone':'+6591234567'},'fulfilment':{'date':'2026-10-29','slot':'17:30'},'paidAt':'2026-10-28T12:00:00Z','items':[{'name':'水','qty':1},{'name':'温泉蛋','qty':1}]}
lines=[];original=bridge.raster
bridge.raster=lambda value:(lines.append(value) or original(value))
data,image=bridge.receipt(order,'bar',order['items'],'/System/Library/Fonts/Hiragino Sans GB.ttc',False,True)
assert len(lines)==2
for slip in lines:
 text='\n'.join(t for t,_ in slip)
 for v in ['林 小姐','+6591234567','2026-10-29 17:30']:assert v in text
 assert slip[0][1].size==64
out=ROOT/'editions/atelier/test-output/printer-optimized';out.mkdir(exist_ok=True,parents=True);image.save(out/'pickup-preview.png')
with tempfile.TemporaryDirectory() as folder:
 target=Path(folder)/'Dumpling Lab 出单恢复';target.mkdir();ledger=target/'jobs.sqlite'
 db=sqlite3.connect(ledger);db.executescript("CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);INSERT INTO meta VALUES('since','12345');CREATE TABLE jobs(key TEXT,status TEXT);INSERT INTO jobs VALUES('paid-id:bar','sent');");db.commit();db.close()
 (target/'live-config.json').write_text(json.dumps({'ledger':'jobs.sqlite'}));(target/'.password').write_text('fixture-only');(target/'printer-bridge.py').write_text('old fixture')
 before={n:(target/n).read_bytes() for n in ['jobs.sqlite','live-config.json','.password']}
 update.install(target,ROOT/'scripts',True)
 assert (target/'printer-bridge.py').read_bytes()==(ROOT/'scripts/printer-bridge.py').read_bytes()
 assert all((target/n).read_bytes()==v for n,v in before.items())
 assert len(list(target.glob('更新备份-*/printer-bridge.py')))==1
 with open(str(ledger)+'.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  try:update.install(target,ROOT/'scripts',True);raise AssertionError('running bridge update accepted')
  except ValueError:pass
print('PASS pickup name/phone/time on every slip; enlarged fonts preserved; installer backs up script, preserves exact ledger/config/password bytes, refuses update while running.')
