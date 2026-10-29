import importlib.util,json,socket,tempfile,threading,time,datetime,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=importlib.util.spec_from_file_location('bridge',ROOT/'scripts/printer-bridge.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
font='/System/Library/Fonts/Hiragino Sans GB.ttc'
out=ROOT/'editions/atelier/test-output/refund-printer';out.mkdir(parents=True,exist_ok=True)
job={'id':'refund:'+str(uuid.uuid4())+':'+str(uuid.uuid4()),'refundId':str(uuid.uuid4()),'orderNo':'8177','table':'D3','at':'2026-10-29T05:05:00Z','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'amountCents':638,'itemRefundCents':580,'serviceRefundCents':58,'method':'original','reference':'RF-20261029-001','reason':'菜品售罄','items':[{'name':'红油抄手','englishName':'Wontons in Chilli Oil','style':'红油 · 5颗','qty':1}]}
data,im=m.refund_receipt(job,font,True);im.save(out/'refund-receipt-preview.png')
assert len(m.print_frames(data))==1 and im.width==512
# Footer must keep complete HH:MM on one line at actual printer resolution.
lines=[];original=m.raster
m.raster=lambda x:(lines.append(x) or original(x))
order={'id':'footer-fixture','table':'B9','no':'WD8309DD1','paidAt':'2026-10-29T03:33:00Z','items':[{'name':'韭菜虾仁猪肉','qty':1,'style':'清汤 · 5颗'}]}
_,preview=m.receipt(order,'kitchen',order['items'],font,False,True);preview.save(out/'order-time-preview.png')
footer=[(t,f) for t,f in lines[-1] if t.startswith('付款 ')];assert footer[0][0]=='付款 2026-10-29 11:33';assert footer[0][1].getlength(footer[0][0])<=480
m.raster=original
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);wire=socket.socket();wire.bind(('127.0.0.1',0));wire.listen();wire.settimeout(3);received=[]
 def read():
  try:
   while True:
    c,_=wire.accept();data=b''
    with c:
     while chunk:=c.recv(65536):data+=chunk
    received.append(data)
  except OSError:pass
 threading.Thread(target=read,daemon=True).start()
 config={'ledger':str(root/'jobs.sqlite'),'receipts':str(root/'receipts'),'font':font,'testMode':True,'beep':False,'printers':{'bar':{'host':'127.0.0.1','port':wire.getsockname()[1]},'kitchen':{'host':'invalid-kitchen-must-not-be-used'}}}
 bridge=m.Bridge(config)
 bridge.enqueue_refunds([dict(job,createdAt='2020-01-01T00:00:00Z')]);assert bridge.db.execute('select count(*) from jobs').fetchone()[0]==0
 job['createdAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 bridge.enqueue_refunds([job,job]);bridge.process();deadline=time.time()+2
 while len(received)<1 and time.time()<deadline:time.sleep(.01)
 assert len(received)==1;assert bridge.db.execute('select station,status from jobs').fetchone()[:]==('bar','sent')
 bridge.db.close();bridge=m.Bridge(config);bridge.enqueue_refunds([job]);bridge.process();assert len(received)==1
 copy=dict(job,id=job['id']+':'+str(uuid.uuid4()),reprint=True);bridge.enqueue_refunds([copy]);bridge.process();deadline=time.time()+2
 while len(received)<2 and time.time()<deadline:time.sleep(.01)
 assert len(received)==2
 bridge.db.execute("UPDATE jobs SET status='sending' WHERE key=?",(copy['id'],));bridge.db.commit();bridge.db.close();bridge=m.Bridge(config);bridge.process();assert bridge.db.execute('select status from jobs where key=?',(copy['id'],)).fetchone()[0]=='uncertain'
 assert len(received)==2
 wire.close()
print('PASS refund printer: bilingual logo raster, bar-only loopback printing, no history replay, dedupe across restart, explicit reprint, uncertain send not retried; full order timestamp fits 480px.')
print(out)
