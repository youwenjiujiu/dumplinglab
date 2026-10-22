"""Print one distinct, clearly labelled test receipt per station. No real order is created."""
from pathlib import Path
from datetime import datetime, timezone
import importlib.util
import json
import socket
from concurrent.futures import ThreadPoolExecutor

ROOT=Path(__file__).resolve().parent
candidates=[ROOT.parent/'dumplinglab/scripts/printer-bridge.py',ROOT.parent/'scripts/printer-bridge.py']
program=next((p for p in candidates if p.exists()),None)
if not program:raise SystemExit('Missing scripts/printer-bridge.py')
spec=importlib.util.spec_from_file_location('printer_bridge',program)
bridge=importlib.util.module_from_spec(spec);spec.loader.exec_module(bridge)
config_path=program.parent.parent/'.local/printer-bridge/config.json'
config=json.loads(config_path.read_text()) if config_path.exists() else {
 'font':'/System/Library/Fonts/Hiragino Sans GB.ttc',
 'printers':{'kitchen':{'host':'192.168.1.234','port':9100},'bar':{'host':'192.168.1.83','port':9100}}
}
order={'id':'PRINT-TEST-'+datetime.now().strftime('%Y%m%d%H%M%S'),'no':'TEST','table':'A1','paidAt':datetime.now(timezone.utc).isoformat(),'note':'分单测试，请勿制作',
 'items':[
  {'name':'韭菜虾仁猪肉饺子','style':'水煮 · 5颗','qty':1,'printStation':'kitchen'},
  {'name':'软饮','style':'可乐','qty':1,'printStation':'bar'},
  {'name':'酸梅汁','style':None,'qty':1,'printStation':'bar'}
 ]}
groups=bridge.station_items(order)
def test(station):
 target=config['printers'][station];name='厨房' if station=='kitchen' else '吧台／饮品及凉菜'
 payload,picture=bridge.receipt(order,station,groups[station],config['font'],test_mode=True)
 picture.save(ROOT/(station+'-'+order['id']+'.png'))
 try:
  with socket.create_connection((target['host'],target.get('port',9100)),timeout=5) as connection:
   connection.settimeout(10);connection.sendall(payload)
  return name+'：测试票已发送；内容：'+'、'.join(item['name']+('／'+item['style'] if item.get('style') else '') for item in groups[station])
 except OSError as error:return name+'：发送失败或结果不明：'+str(error)
if __name__=='__main__':
 with ThreadPoolExecutor(max_workers=2) as pool:
  for result in pool.map(test,['kitchen','bar']):print(result)
