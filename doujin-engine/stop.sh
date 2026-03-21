#!/bin/bash
# Doujin Engine — 開発サーバー停止
# ポート 5555 を使用しているプロセスを終了

cd "$(dirname "$0")"

echo "=== Doujin Engine — Stop Server ==="

# ポート 5555 を使用しているプロセスを検索・終了
if command -v lsof &> /dev/null; then
  # macOS / Linux
  PIDS=$(lsof -ti :5555 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "Killing processes on port 5555: $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null
    echo "Done."
  else
    echo "No process found on port 5555."
  fi
elif command -v netstat &> /dev/null; then
  # Windows (Git Bash / MSYS2)
  PIDS=$(netstat -ano 2>/dev/null | grep ":5555 " | grep "LISTENING" | awk '{print $5}' | sort -u)
  if [ -n "$PIDS" ]; then
    echo "Killing processes on port 5555: $PIDS"
    for PID in $PIDS; do
      taskkill //PID "$PID" //F 2>/dev/null
    done
    echo "Done."
  else
    echo "No process found on port 5555."
  fi
else
  echo "Cannot detect processes. Please stop manually (Ctrl+C)."
fi
