#!/usr/bin/env python3
"""Build test assets locally; target Mac needs only standard-library Python."""
import base64, hashlib, importlib.util, json, shutil, zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'editions/atelier/test-output/printer-protocol/打印指令对照测试'


def encode(im, protocol):
    mono=im.convert('L').point(lambda v:255 if v>160 else 0,mode='1')
    bits=bytes(v^255 for v in mono.tobytes());w,h=mono.size;stride=w//8
    segments=[b'\x1b@\x1ba\x00'+f'TEST {protocol} / DO NOT PREPARE\n'.encode('ascii')]
    if protocol in ('A','B'):
        band=h if protocol=='A' else 16
        for y in range(0,h,band):
            n=min(band,h-y)
            segments.append(b'\x1dv0\x00'+stride.to_bytes(2,'little')+n.to_bytes(2,'little')+bits[y*stride:(y+n)*stride])
    else:
        segments.append(b'\x1b3\x18')
        for y in range(0,h,24):
            columns=bytearray()
            for x in range(w):
                for block in range(3):
                    byte=0
                    for bit in range(8):
                        row=y+block*8+bit
                        if row<h and bits[row*stride+x//8]&(128>>(x%8)):byte|=128>>bit
                    columns.append(byte)
            segments.append(b'\x1b*\x21'+w.to_bytes(2,'little')+columns+b'\n')
        segments.append(b'\x1b2')
    segments.append(b'\n\n\n\x1dV\x00')
    return segments, mono


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    # One synthetic image, same pixels in all three protocols.
    im=Image.new('RGB',(512,312),'white');draw=ImageDraw.Draw(im)
    font='/System/Library/Fonts/Hiragino Sans GB.ttc'
    for y,text,size in [(8,'测试 / 勿制作',44),(68,'温泉蛋 / 猪肉玉米',36),(120,'水煮 · 5颗',36),(172,'备注：不要葱花',36),(230,'0123456789 ABCDEF',24),(270,'TEST END — 请检查底部',24)]:
        draw.text((16,y),text,font=ImageFont.truetype(font,size),fill='black')
    im.save(OUT/'测试内容.png');cases=[]
    for protocol in 'ABC':
        segments,_=encode(im,protocol)
        cases.append({'name':protocol,'segments':[base64.b64encode(s).decode() for s in segments],'sha256':hashlib.sha256(b''.join(segments)).hexdigest()})
    (OUT/'test-cases.json').write_text(json.dumps({'printers':{'kitchen':'192.168.1.234','bar':'192.168.1.83'},'cases':cases}),encoding='utf-8')
    shutil.copyfile(ROOT/'scripts/printer-protocol-diagnostic.py',OUT/'printer-protocol-diagnostic.py')
    launcher=OUT/'双击测试.command';launcher.write_text('#!/bin/bash\ncd "$(dirname "$0")" || exit 1\npython3 printer-protocol-diagnostic.py\n',encoding='utf-8');launcher.chmod(0o755)
    (OUT/'说明.txt').write_text('这是诊断测试，不是修复更新包。\n等当前小票打完，暂停正式出单程序；双击测试，选择厨房或吧台。\n只打印三张 TEST 测试纸，不连接网站、不改配置、不删订单、不补打历史单。\n拍下 A/B/C 三张完整纸面，测试后重新打开原来的出单程序。\nA：整张 GS v 0；B：16 行分段 GS v 0；C：24 点 ESC *。\n没有实机验证前，不替换正式打印程序。\n',encoding='utf-8')
    archive=OUT.parent/'打印指令对照测试.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for file in OUT.iterdir():
            if file.is_file() and file.name!='测试结果.txt':z.write(file,OUT.name+'/'+file.name)
    print(archive)

if __name__=='__main__':build()
