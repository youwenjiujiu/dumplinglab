"""Single additive shop update; carries no credentials, ledger, or live config."""
from pathlib import Path
import shutil,zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'editions/atelier/test-output/refund-printer'
folder=OUT/'Dumpling Lab 退款小票与时间修复';folder.mkdir(parents=True,exist_ok=True)
for name in ['printer-bridge.py','printer-update.py']:shutil.copy2(ROOT/'scripts'/name,folder/name)
shutil.copy2(ROOT/'web/brand/dumpling-lab-primary.png',folder/'refund-logo.png')
command=folder/'双击更新退款小票.command'
command.write_text('''#!/bin/bash
cd "$(dirname "$0")" || exit 1
python3 printer-update.py --bridge-only
echo
read -p "按回车关闭窗口" _
''');command.chmod(0o755)
(folder/'使用说明.txt').write_text('''Dumpling Lab 退款小票与时间修复

1. 等当前打印结束，在原出单终端按 Control+C 停止。
2. 解压此 ZIP，双击「双击更新退款小票.command」。
3. 如需选文件夹，选择店里原来出单的恢复文件夹；里面有 live-config.json 和打印记录。
4. 更新程序自动备份旧程序，保留配置和打印记录，完成后启动原出单程序。出单窗口保持打开。

本次合并：退款凭证（中英文与 logo，吧台打印）、退款补打、原出餐单日期时间独立一行不换行。
后台退款入口：订单汇总 → 对应订单 → 退款；柜台退款需先实际退款并勾选确认。
补打入口：订单汇总 → 对应订单 → 补打退款凭证。补打只打印凭证，不会再次退款。
首次启用不会自动补打历史退款；需要历史凭证时，更新并启动后在后台点补打。
打印发送中断时不会盲目重打；先核对纸张，再决定是否补打。

若提示代码已更新但未启动，请双击原恢复文件夹的「双击恢复出单.command」。
本更新包不包含订单、顾客资料、密码或打印机地址。
''')
archive=OUT/(folder.name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in folder.iterdir():z.write(p,folder.name+'/'+p.name)
with zipfile.ZipFile(archive) as z:
 assert (z.getinfo(folder.name+'/'+command.name).external_attr>>16)&0o111
 assert all('config' not in n and 'sqlite' not in n and 'password' not in n for n in z.namelist())
print(archive)
