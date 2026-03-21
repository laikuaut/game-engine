#!/bin/bash
# Doujin Engine — ビルドスクリプト
# 引数: web | electron | portable | all

cd "$(dirname "$0")"

echo "=== Doujin Engine — Build ==="

# node_modules チェック
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Running npm install..."
  npm install
  echo ""
fi

MODE=${1:-web}

case "$MODE" in
  web)
    echo "[1/1] Building web (Vite)..."
    npm run build
    echo ""
    echo "Done! Output: dist/"
    ;;

  electron)
    echo "[1/2] Building web (Vite)..."
    npm run build
    echo ""
    echo "[2/2] Building Electron (NSIS installer + portable)..."
    npx electron-builder --win --x64
    echo ""
    echo "Done! Output: release/"
    ;;

  portable)
    echo "[1/2] Building web (Vite)..."
    npm run build
    echo ""
    echo "[2/2] Building Electron (portable exe only)..."
    npx electron-builder --win portable --x64
    echo ""
    echo "Done! Output: release/"
    ;;

  all)
    echo "[1/3] Building web (Vite)..."
    npm run build
    echo ""
    echo "[2/3] Building Electron NSIS installer..."
    npx electron-builder --win nsis --x64
    echo ""
    echo "[3/3] Building Electron portable..."
    npx electron-builder --win portable --x64
    echo ""
    echo "Done! Output: release/"
    ;;

  *)
    echo "Usage: ./build.sh [web|electron|portable|all]"
    echo ""
    echo "  web       — Vite build only (dist/)"
    echo "  electron  — NSIS installer + portable (release/)"
    echo "  portable  — Portable exe only (release/)"
    echo "  all       — NSIS + portable (release/)"
    exit 1
    ;;
esac

echo ""
echo "Build complete!"
