#!/bin/bash
# Doujin Engine — 開発サーバー起動
# ポート 5555 で Vite dev server を起動

cd "$(dirname "$0")"

echo "=== Doujin Engine — Dev Server ==="
echo "Starting on http://localhost:5555 ..."
echo ""

# node_modules チェック
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Running npm install..."
  npm install
  echo ""
fi

# Vite dev server 起動
npm run dev
