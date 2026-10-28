"""Install a printer update into an existing shop folder; never create a new ledger."""
import argparse, datetime, fcntl, json, os, shutil, subprocess
from pathlib import Path


def existing(folder):
    try:
        config = json.loads((folder / 'live-config.json').read_text())
        ledger = Path(config['ledger'])
        if not ledger.is_absolute():
            ledger = folder / ledger
        return ledger if ledger.is_file() else None
    except (OSError, ValueError, KeyError, TypeError):
        return None


def install(target, payload):
    ledger = existing(target)
    if not ledger:
        raise ValueError('没有找到原来的配置和打印记录，未进行更新。')
    with open(str(ledger) + '.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('原出单程序还开着。请等当前打印结束，在旧窗口按 Control+C，然后再双击本更新程序。')
        names = ['printer-bridge.py', '双击启动出单.command']
        for name in names:
            if not (payload / name).is_file():
                raise ValueError('更新包不完整，请重新解压。')
        backup = target / ('更新备份-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
        backup.mkdir()
        changed = []
        try:
            for name in names:
                dest = target / name
                if dest.exists():
                    shutil.copy2(dest, backup / name)
                staged = target / (name + '.update')
                shutil.copy2(payload / name, staged)
                staged.chmod(0o755 if name.endswith('.command') else 0o644)
                os.replace(staged, dest)
                changed.append(name)
        except Exception:
            for name in reversed(changed):
                if (backup / name).exists():
                    shutil.copy2(backup / name, target / name)
                else:
                    (target / name).unlink()
            raise
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', type=Path)
    parser.add_argument('--no-start', action='store_true')
    args = parser.parse_args()
    payload = Path(__file__).resolve().parent
    if args.target:
        target = args.target
    else:
        downloads = Path.home() / 'Downloads'
        candidates = [p for p in downloads.iterdir() if p.is_dir() and existing(p)] if downloads.is_dir() else []
        if len(candidates) == 1:
            target = candidates[0]
        else:
            selected = subprocess.run(['/usr/bin/osascript', '-e', 'POSIX path of (choose folder with prompt "请选择原来一直用于出单的「Dumpling Lab 出单」文件夹（不是新下载的更新包）")'], capture_output=True, text=True)
            if selected.returncode or not selected.stdout.strip():
                raise ValueError('已取消，未更新也未启动出单程序。')
            target = Path(selected.stdout.strip())
            if not existing(target):
                raise ValueError('选中的文件夹没有原配置和打印记录。请重新双击更新，选择原来一直用于出单的文件夹。')
    install(target, payload)
    print('更新完成，原配置和打印记录已保留。正在启动新版…', flush=True)
    if not args.no_start:
        os.execv('/bin/bash', ['bash', str(target / '双击启动出单.command')])


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError) as error:
        print(str(error), flush=True)
        raise SystemExit(1)
