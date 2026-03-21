# Doujin Engine

React製ノベルゲームエンジン。Electron でパッケージングし Windows exe として DLsite に出品する。

## セットアップ

```bash
npm install
```

## 開発コマンド

```bash
npm run dev              # 開発サーバー起動（ブラウザプレビュー）
npm run electron:dev     # Electron で起動
npm test                 # テスト実行
npm run test:watch       # テスト（ウォッチモード）
```

## ビルド

```bash
npm run build            # Vite ビルド（dist/ に出力）
npm run electron:build   # Electron exe ビルド（deploy/ に出力）
```

## ディレクトリ構成

```
doujin-engine/
├── electron/          Electron メインプロセス
├── src/
│   ├── engine/        ノベルエンジンコア（reducer, commands, constants）
│   ├── components/    UIコンポーネント
│   ├── editor/        エディタ画面（シナリオ、マップ、アイテム等）
│   ├── rpg/           RPGエンジン・マップ描画
│   ├── audio/         BGM/SE 再生管理
│   ├── save/          セーブ/ロード管理
│   ├── project/       プロジェクトデータ CRUD
│   └── data/          サンプルデータ・設定定数
├── data/              プロジェクトデータ（※git管理外）
├── dist/              Vite ビルド出力
└── deploy/            Electron ビルド出力
```

## data/ ディレクトリについて

`data/` はユーザーが作成したプロジェクトデータ（シナリオ、アセット画像、セーブデータ等）の保存先です。

- `.gitignore` で除外されているため、git には含まれません
- 開発時: `doujin-engine/data/projects/{プロジェクトID}/` に保存
- 本番時: exe と同じフォルダの `data/projects/` に保存
- バックアップは手動で行ってください

## 技術スタック

- React 18+ / Vite / Electron
- JavaScript (JSX)
- インラインスタイル（CSS-in-JS）
- useReducer によるステート集中管理
