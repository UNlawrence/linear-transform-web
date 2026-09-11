#!/bin/bash
# 双击启动「二维线性变换」本地版
cd "$(dirname "$0")" || exit 1
PORT=8791
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
URL="http://127.0.0.1:$PORT/"
( sleep 1; open "$URL" ) &
echo "本地服务已启动：$URL"
echo "关闭本窗口（或按 Ctrl+C）即停止。"
python3 -m http.server $PORT
