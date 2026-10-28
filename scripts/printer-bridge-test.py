import importlib.util, json, socket, tempfile, threading, time
from pathlib import Path
spec=importlib.util.spec_from_file_location('bridge',Path(__file__).with_name('printer-bridge.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);server=socket.socket();server.bind(('127.0.0.1',0));server.listen();server.settimeout(4);received=[]
 def read():
  try:
   while True:
    c,_=server.accept();data=b''
    with c:
     while chunk:=c.recv(65536):data+=chunk
    received.append(data)
  except OSError:pass
 thread=threading.Thread(target=read,daemon=True);thread.start()
 config={'ledger':str(root/'ledger.sqlite'),'receipts':str(root/'receipts'),'font':'/System/Library/Fonts/Hiragino Sans GB.ttc','testMode':True,'printers':{'bar':{'host':'127.0.0.1','port':server.getsockname()[1]}}}
 bridge=m.Bridge(config);order={'id':'test-drink','status':'paid','paidAt':'2020-01-01T00:00:00Z','no':'TEST','table':'A1','items':[{'name':'软饮','style':'可乐','qty':1,'printStation':'bar'}]}
 doc={'online':{'x':{'value':order}},'tableStates':{'x':{'value':{'events':[order]}}},'events':[dict(order,status='pending')]}
 assert len(m.orders_from(doc))==1;bridge.enqueue(m.orders_from(doc));assert bridge.db.execute('SELECT count(*) FROM jobs').fetchone()[0]==0
 bridge.enqueue(m.orders_from(doc),['test-drink']);bridge.process()
 deadline=time.time()+3
 while not received and time.time()<deadline:time.sleep(.01)
 assert len(received)==1;assert received[0].startswith(b'\x1b@');assert b'\x1dv0' in received[0];assert received[0].endswith(b'\x1bB\x03\x03') and received[0].count(b'\x1bB')==1,'one beep per order'
 assert bridge.db.execute('SELECT status FROM jobs').fetchone()[0]=='sent'
 bridge.enqueue(m.orders_from(doc),['test-drink']);bridge.process();assert len(received)==1
 bridge.db.execute("UPDATE jobs SET status='sending'");bridge.db.commit();bridge.db.close();bridge=m.Bridge(config);bridge.process();assert bridge.db.execute('SELECT status FROM jobs').fetchone()[0]=='uncertain';assert len(received)==1
 bad=dict(order,id='invalid',items=[{'name':'饮品','qty':1}])
 try:bridge.enqueue([bad],['invalid']);raise AssertionError('Invalid destination accepted')
 except ValueError:pass
 mixed=dict(order,id='mixed',items=order['items']+[{'name':'饺子','qty':1,'printStation':'kitchen'}]);assert set(m.station_items(mixed))=={'bar','kitchen'}
 slips,_=m.receipt(dict(mixed,note='少辣'),'kitchen',[{'name':'饺子','qty':2,'printStation':'kitchen'},{'name':'云吞面','style':'汤面','qty':1,'printStation':'kitchen'},{'name':'鸡翅','qty':1,'printStation':'kitchen'}],config['font'],False,True)
 assert slips.count(b'\x1dV\x00')==3 and slips.count(b'\x1b@')==3,'one cut slip per dish'
 gift,_=m.receipt(order,'bar',[{'id':'beer','name':'啤酒','qty':1,'printStation':'bar'},{'id':'beer','name':'啤酒','qty':1,'promo':'bogo','printStation':'bar'}],config['font'],False,True)
 assert gift.count(b'\x1dV\x00')==1,'买一赠一 prints one slip for the pair'
 single,_=m.receipt(mixed,'kitchen',mixed['items'],config['font'],False);assert single.count(b'\x1dV\x00')==1,'default stays one ticket per station'
 server.close()
 print('PASS printer bridge: per-dish slips (one cut each, 买一赠一 merged), paid-only, no history replay, duplicate feed deduplication, real loopback raster send, restart suppression, interrupted sends require manual review, captured kitchen/bar split and invalid route rejection.')

# Pacing preserves all image bytes, even when bitmap pixels resemble cut commands.
face=m.ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc',24)
data,_=m.raster([('销魂皮蛋面',face)])
bitmap=bytearray(data);bitmap[20:26]=b'\n\n\n\x1dV\x00'
payload=bytes(bitmap)+data+b'\x1bB\x03\x03'
frames=m.print_frames(payload);assert len(frames)==3
class Wire:
 def __init__(self):self.chunks=[]
 def sendall(self,chunk):self.chunks.append(chunk)
wire=Wire();delays=[];m.send_paced(wire,frames,delays.append)
assert b''.join(wire.chunks)==payload
assert max(map(len,wire.chunks))<=1024
assert delays.count(.6)==2
for bad in [b'',data[:-1],data[:9]+b'\x01\x00'+data[11:]]:
 try:m.print_frames(bad);raise AssertionError('Malformed frame accepted')
 except ValueError:pass
class BrokenWire(Wire):
 def sendall(self,chunk):
  super().sendall(chunk)
  if len(self.chunks)==2:raise OSError('connection interrupted')
broken=BrokenWire()
try:m.send_paced(broken,frames,lambda _:None);raise AssertionError('Failure ignored')
except OSError:pass
assert len(broken.chunks)==2,'no retry after possible partial send'
print('PASS paced transport: exact bytes, <=1024-byte writes, per-slip pauses, embedded cut bytes, invalid lengths rejected, interrupted send stops without retry.')
