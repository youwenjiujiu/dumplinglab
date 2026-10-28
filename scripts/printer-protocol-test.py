import importlib.util, socket, threading
from pathlib import Path
from PIL import Image

def module(name,file):
 spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
b=module('build','printer-protocol-build.py');d=module('diagnostic','printer-protocol-diagnostic.py');b.build()
im=Image.open(b.OUT/'测试内容.png');w,h=im.size
for protocol in 'ABC':
 segments,expected=b.encode(im,protocol);rows=[]
 if protocol in 'AB':
  for cmd in segments[1:-1]:
   assert cmd[:4]==b'\x1dv0\x00';stride=int.from_bytes(cmd[4:6],'little');height=int.from_bytes(cmd[6:8],'little')
   assert stride==64 and len(cmd)==8+stride*height
   if protocol=='B':assert height<=16
   rows.extend(bytes(v^255 for v in cmd[8:]))
  actual=Image.frombytes('1',(w,h),bytes(rows))
 else:
  actual=Image.new('1',(w,((h+23)//24)*24),1)
  for n,cmd in enumerate(segments[2:-2]):
   assert cmd[:3]==b'\x1b*\x21' and int.from_bytes(cmd[3:5],'little')==w and len(cmd)==5+w*3+1 and cmd[-1:]==b'\n'
   for x in range(w):
    for y in range(24):
     if cmd[5+x*3+y//8]&(128>>(y%8)):actual.putpixel((x,n*24+y),0)
  actual=actual.crop((0,0,w,h))
 assert actual.tobytes()==expected.tobytes(),protocol+' bitmap mismatch'
 print('PASS '+protocol+': independently decoded pixels exactly match test image; command lengths valid')
printers,cases=d.load_cases(b.OUT/'test-cases.json');assert len(cases)==3
server=socket.socket();server.bind(('127.0.0.1',0));server.listen();got=[]
def receiver():
 conn,_=server.accept()
 with conn:
  while chunk:=conn.recv(173):got.append(chunk)
thread=threading.Thread(target=receiver);thread.start()
with socket.create_connection(server.getsockname()) as conn:
 for _,segments,_ in cases:d.send_segments(conn,segments,lambda _:None)
thread.join(timeout=3);server.close();assert not thread.is_alive();assert b''.join(got)==b''.join(s for _,segments,_ in cases for s in segments)
class Broken:
 def __init__(self):self.calls=0
 def sendall(self,data):
  self.calls+=1
  if self.calls==2:raise OSError('simulated disconnect')
wire=Broken()
try:d.send_segments(wire,cases[0][1],lambda _:None);raise AssertionError('Ignored disconnect')
except OSError:pass
assert wire.calls==2
print('PASS localhost TCP receives exact bytes across all protocols; interrupted sends stop without retry; no production printer contacted')
