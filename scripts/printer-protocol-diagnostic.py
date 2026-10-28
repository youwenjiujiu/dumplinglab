#!/usr/bin/env python3
"""Standalone, synthetic-only on-site printer comparison. No feed or ledger access."""
import base64, fcntl, hashlib, json, os, socket, subprocess, tempfile, time
from pathlib import Path


def bridge_running():
    result = subprocess.run(['ps', '-axo', 'pid=,command='], capture_output=True, text=True, check=True)
    return any('printer-bridge.py' in line and ('python' in line.lower()) for line in result.stdout.splitlines())


def send_segments(connection, segments, sleep=time.sleep):
    for segment in segments:
        # Preserve the existing transport throttle in every comparison.
        for offset in range(0,len(segment),1024):
            connection.sendall(segment[offset:offset+1024])
            sleep(0.04)
        sleep(0.12)


def load_cases(path):
    document = json.loads(path.read_text())
    cases = []
    for case in document['cases']:
        segments = [base64.b64decode(value, validate=True) for value in case['segments']]
        data = b''.join(segments)
        if hashlib.sha256(data).hexdigest() != case['sha256']:
            raise ValueError('测试文件校验失败，请勿继续')
        cases.append((case['name'], segments, case['sha256']))
    return document['printers'], cases


def main():
    lock = open(Path(tempfile.gettempdir())/'dumplinglab-printer-diagnostic.lock','a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise RuntimeError('已有一个测试窗口，请使用原窗口')
    printers, cases = load_cases(Path(__file__).with_name('test-cases.json'))
    if bridge_running():
        raise RuntimeError('正式出单程序仍在运行。请等正在打印的小票全部打完，暂停原出单窗口后再测试；测试后重新打开原出单程序。')
    print('仅打印 3 张「测试 / 勿制作」，不读取或更改订单。')
    choice = input('测哪台？输入 1 厨房，或 2 吧台：').strip()
    if choice not in ('1','2'):
        raise ValueError('未选择打印机，没有发送')
    host = printers['kitchen' if choice == '1' else 'bar']
    print('请确认旧小票已全部出完，且当前没有其他程序向这台打印机发送。')
    if input('输入 Y 开始：').strip().upper() != 'Y':
        print('已取消，没有发送');return
    log = Path(__file__).with_name('测试结果.txt')
    with log.open('a',encoding='utf-8') as out:
        for name, segments, digest in cases:
            if bridge_running():
                raise RuntimeError('检测到正式出单程序启动，已停止测试')
            out.write(f'{time.strftime("%Y-%m-%d %H:%M:%S")} {host} {name} start bytes={sum(map(len,segments))} sha256={digest}\n');out.flush()
            try:
                with socket.create_connection((host,9100),timeout=5) as connection:
                    connection.settimeout(10)
                    send_segments(connection,segments)
                    time.sleep(2)
            except OSError:
                out.write('发送中断：结果不确定，不自动重试。\n');out.flush()
                raise
            out.write('发送完成；纸张是否正常需现场核对。\n');out.flush()
            print(name+' 已发送');time.sleep(3)
    print('测试结束。请把 A、B、C 三张纸放在一起拍照，并重新打开原来的出单程序。')


if __name__ == '__main__':
    try:main()
    except Exception as error:print('未完成：'+str(error))
    input('按回车关闭窗口')
