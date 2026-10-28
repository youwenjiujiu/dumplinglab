#!/bin/bash
# Dumpling Lab 出单：读线上已付款订单，打到厨房和吧台。窗口开着就一直出单。
cd "$(dirname "$0")"
stop() { echo; echo "$1"; read -p "按回车关闭窗口" _; exit 1; }
# Mac 自带的 python3 需要先装「命令行开发者工具」
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install 2>/dev/null
  stop "这台 Mac 还没装「命令行开发者工具」。请在弹出的窗口点「安装」，装完（约 5–10 分钟）再双击一次这个文件。"
fi
if ! python3 -c "import PIL" 2>/dev/null; then
  echo "第一次使用，正在安装打印组件……"
  python3 -m pip install --user Pillow || stop "打印组件安装失败，请确认这台 Mac 能上网，再双击一次。"
fi
if [ ! -s .password ]; then
  read -s -p "请输入店员密码（只需输入一次）：" pw; echo
  printf '%s' "$pw" > .password; chmod 600 .password
fi
echo "出单中……这个窗口不要关。"
# caffeinate 让 Mac 在出单期间不睡眠
DL_STAFF_PASSWORD="$(cat .password)" caffeinate -i python3 printer-bridge.py --config live-config.json --watch
stop "出单程序停了（原因见上面）。把这个窗口截图发给我们。"
