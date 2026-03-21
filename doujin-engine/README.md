# Doujin Engine

React製ノベル/RPGゲームエンジン＋ビジュアルエディタ。
Electron でパッケージングし Windows exe として DLsite に出品する。

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

## 主な機能

### ゲームエンジン
- ノベル（ADV/NVL）、RPG、ミニゲーム対応
- テキスト表示（タイプライター、オート、スキップ）
- キャラクター表示（立ち絵、表情差分、アニメーション）
- BGM/SE 再生（Web Audio API）
- 画面エフェクト（shake, flash, fade 等）
- セーブ/ロード（100スロット、サムネイル付き）
- 選択肢分岐（ラベルジャンプ）

### ビジュアルエディタ
- **スクリプト**: コマンド単位の編集、シーンツリー展開表示
- **シーン編集**: スクリプトを部品に分割して管理、ドラッグ順序変更
- **BGM/SE**: カタログ管理、ファイルアップロード（D&D対応）、テスト再生
- **キャラ/背景**: 画像アップロード、表情プルダウン選択
- **RPGマップ**: タイルペイント、タイルセット一括インポート
- **バリデーション**: 未定義のキャラ/背景/BGM/SE/ラベルをエラー表示
- **Deploy**: エディタからワンクリックでexeビルド

## ディレクトリ構成

```
doujin-engine/
├── electron/          Electron メインプロセス（main.cjs, preload.cjs）
├── src/
│   ├── engine/        ノベルエンジンコア（reducer, commands, constants）
│   ├── components/    ゲームUIコンポーネント
│   ├── editor/        ビジュアルエディタ（スクリプト、シーン、BGM/SE等）
│   ├── rpg/           RPGエンジン・マップ描画
│   ├── audio/         BGM/SE 再生管理（AudioManager, useAudio）
│   ├── save/          セーブ/ロード管理
│   ├── project/       プロジェクトデータ CRUD + アセット管理
│   ├── data/          設定定数・サンプルデータ
│   └── test/          vitest テスト
├── data/              プロジェクトデータ（※git管理外）
├── dist/              Vite ビルド出力
└── deploy/            Electron ビルド出力
```

## data/ ディレクトリについて

`data/` はユーザーが作成したプロジェクトデータの保存先です。

- `.gitignore` で除外されているため、git には含まれません
- 開発時: `doujin-engine/data/projects/{プロジェクトID}/` に保存
- 本番時: exe と同じフォルダの `data/projects/` に保存
- 各プロジェクトは `meta.json` + データファイル（script, characters, storyScenes 等）に分割保存
- アセット（画像・音声）は `assets/{type}/` サブディレクトリに保存

## 技術スタック

- React 18+ / Vite / Electron
- JavaScript (JSX)
- インラインスタイル（CSS-in-JS）
- useReducer によるステート集中管理
- Web Audio API（BGM/SE）
- vitest（テスト）
