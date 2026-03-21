#!/bin/bash
# Doujin Engine — ビルドスクリプト
# 引数1: web | electron | portable | all
# 引数2: プロジェクト名（任意、出力フォルダ分け用）

cd "$(dirname "$0")"

echo "=== Doujin Engine — Build ==="

# node_modules チェック
if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Running npm install..."
  npm install
  echo ""
fi

MODE=${1:-web}
PROJECT_NAME=${2:-}

# 出力先ディレクトリを決定
if [ -n "$PROJECT_NAME" ]; then
  OUT_DIR="release/$PROJECT_NAME"
  WEB_OUT="dist/$PROJECT_NAME"
else
  OUT_DIR="release"
  WEB_OUT="dist"
fi

echo "Mode: $MODE"
[ -n "$PROJECT_NAME" ] && echo "Project: $PROJECT_NAME"
echo "Output: $OUT_DIR/"
echo ""

# 古いビルド成果物をクリーン（win-unpacked がロック中でも続行）
clean_output() {
  if [ -d "$OUT_DIR" ]; then
    echo "Cleaning previous build: $OUT_DIR/"
    rm -rf "$OUT_DIR" 2>/dev/null || true
  fi
  # デフォルトの release/win-unpacked も削除（出力先が別でも残骸が邪魔になる）
  if [ -d "release/win-unpacked" ] && [ "$OUT_DIR" != "release" ]; then
    rm -rf "release/win-unpacked" 2>/dev/null || true
  fi
}

case "$MODE" in
  web)
    echo "[1/1] Building web (Vite)..."
    npx vite build --outDir "$WEB_OUT"
    echo ""
    echo "Done! Output: $WEB_OUT/"
    ;;

  electron)
    clean_output
    echo "[1/2] Building web (Vite)..."
    npm run build
    echo ""
    echo "[2/2] Building Electron (NSIS installer + portable)..."
    npx electron-builder --win --x64 -c.directories.output="$OUT_DIR"
    echo ""
    echo "Done! Output: $OUT_DIR/"
    ;;

  portable)
    clean_output
    echo "[1/2] Building web (Vite)..."
    npm run build
    echo ""
    echo "[2/2] Building Electron (portable exe only)..."
    npx electron-builder --win portable --x64 -c.directories.output="$OUT_DIR"
    echo ""
    echo "Done! Output: $OUT_DIR/"
    ;;

  all)
    clean_output
    echo "[1/3] Building web (Vite)..."
    npm run build
    echo ""
    echo "[2/3] Building Electron NSIS installer..."
    npx electron-builder --win nsis --x64 -c.directories.output="$OUT_DIR"
    echo ""
    echo "[3/3] Building Electron portable..."
    npx electron-builder --win portable --x64 -c.directories.output="$OUT_DIR"
    echo ""
    echo "Done! Output: $OUT_DIR/"
    ;;

  *)
    echo "Usage: ./build.sh [web|electron|portable|all] [project-name]"
    echo ""
    echo "  web       — Vite build only (dist/)"
    echo "  electron  — NSIS installer + portable (release/)"
    echo "  portable  — Portable exe only (release/)"
    echo "  all       — NSIS + portable (release/)"
    echo ""
    echo "  project-name — optional, creates release/{name}/ subfolder"
    exit 1
    ;;
esac

echo ""
echo "Build complete!"
