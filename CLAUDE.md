# CLAUDE.md — React ノベルゲームエンジン for DLsite

## プロジェクト概要

DLsite成人向け同人ノベルゲームを販売するための、React製ノベルゲームエンジンを開発中。
Electron でパッケージングし Windows exe として DLsite に出品する。

### 目標

- **自作エンジンを資産化**: 1作目で基盤を作り、2作目以降は使い回す
- **販売先**: DLsite（同人・成人向け）
- **配布形式**: Windows exe（Electron + electron-builder）
- **強み**: ストーリー・テキスト量、AI画像生成（Stable Diffusion）

---

## 技術スタック

| 区分 | 技術 |
|------|------|
| フロントエンド | React 18+, CSS-in-JS (inline styles) |
| パッケージング | Electron + electron-builder |
| 言語 | JavaScript（TypeScript移行は任意） |
| フォント | Noto Serif JP（Google Fonts） |
| 画像素材 | Stable Diffusion で AI 生成（PNG） |
| BGM/SE | Web Audio API or HTML5 Audio (.ogg, .mp3) |
| セーブデータ | Electron: fs でローカルファイル保存 / ブラウザ: localStorage |

---

## アーキテクチャ

### シナリオデータ形式

シナリオは JavaScript の配列として定義する。各要素がゲームコマンド。

```js
const SCRIPT = [
  { type: "bg", src: "classroom", transition: "fade" },
  { type: "bgm", name: "morning_theme" },
  { type: "chara", id: "sakura", position: "center", expression: "smile" },
  { type: "dialog", speaker: "桜", text: "おはよう、先輩。" },
  { type: "chara_mod", id: "sakura", expression: "shy" },
  { type: "choice", options: [
    { text: "選択肢A", jump: 10 },
    { text: "選択肢B", jump: 15 },
  ]},
  { type: "se", name: "chime" },
  { type: "chara_hide", id: "sakura" },
  // 画面効果（未実装）
  { type: "effect", name: "shake" },
  { type: "effect", name: "flash", color: "#fff" },
  { type: "effect", name: "fadeout", color: "#000", time: 1000 },
];
```

### コマンド一覧

| type | 説明 | パラメータ |
|------|------|-----------|
| `bg` | 背景変更 | `src`, `transition` (fade/crossfade/none) |
| `bgm` | BGM再生 | `name`, `loop` (default: true), `volume` |
| `bgm_stop` | BGM停止 | `fadeout` (ms) |
| `se` | SE再生 | `name`, `volume` |
| `chara` | キャラ表示 | `id`, `position` (left/center/right), `expression` |
| `chara_mod` | 表情変更 | `id`, `expression`, `anim` (shake/bounce/zoom/nod/tremble) |
| `chara_hide` | キャラ非表示 | `id` |
| `dialog` | テキスト表示 | `speaker`, `text` |
| `choice` | 選択肢 | `options: [{ text, jump }]` ※jump はラベル名 |
| `effect` | 画面効果 | `name` (shake/flash/fadeout/whitefade/fadein), `color`, `time` |
| `wait` | 待機 | `time` (ms) |
| `jump` | ジャンプ | `target` (ラベル名) |
| `label` | ラベル | `name` ※jump/choice の飛び先 |
| `cg` | CG表示（レイヤー） | `id`, `variant` (数値、差分インデックス) ※cgCatalog から src を解決 |
| `cg_hide` | CG非表示 | — |
| `nvl_on` | NVLモード開始 | — |
| `nvl_off` | NVLモード終了 | — |
| `nvl_clear` | NVLログクリア | — |
| `scene` | シーン参照 | `sceneId` ※シーン編集で作成した部品を参照 |

### シーン（スクリプト部品化）

スクリプトを「シーン」単位で分割管理できる。各シーンは独立したコマンド配列を持ち、
スクリプトからは `{ type: "scene", sceneId: "xxx" }` で参照する。

- **展開方式**: シーンのコマンドを直接スクリプトに結合（label 自動挿入）
- **参照方式**: scene コマンドとして参照を残す（エンジンが実行時に展開）
- スクリプトリストではシーンをツリー展開して内容を確認可能

### ステート管理

useReducer による集中管理。主要ステート:

```
scriptIndex       現在のスクリプト位置
displayedText     表示中のテキスト
isTyping          タイプ中フラグ
currentSpeaker    現在の話者
currentBg         現在の背景キー
characters        表示中キャラ { id: { position, expression } }
showChoice        選択肢表示中
backlog           バックログ配列
saves             セーブスロット（100枠）
textSpeed         テキスト表示速度 (ms/字)
autoMode          オートモード
bgmPlaying        再生中BGM
showBacklog       バックログUI表示
showConfig        設定UI表示
showSaveLoad      セーブ/ロードUI表示
```

---

## 実装済み機能 ✅

### エンジンコア
- [x] テキストのタイプライター表示（速度調整可能）
- [x] キャラクター表示・表情切替・非表示（アニメーション付き）
- [x] 背景切替（fade/crossfade トランジション）
- [x] 選択肢による分岐（ラベル名でジャンプ）
- [x] セーブ＆ロード（100スロット、サムネイル付き）
- [x] セーブデータ永続化（Electron: fs / ブラウザ: localStorage）
- [x] バックログ表示
- [x] オート再生モード
- [x] スキップ機能（Ctrl 長押し）
- [x] BGM/SE 再生（Web Audio API、ループ、フェードイン/アウト、音量調整）
- [x] 画面エフェクト（shake, flash, fadeout, whitefade, fadein）
- [x] CG表示・非表示
- [x] NVLモード（全画面テキスト）
- [x] キーボード操作（Enter/Space で送り、Escape で閉じる、F11 フルスクリーン）
- [x] 画面サイズプリセット（960×540 / 1280×720 / 1600×900 / 1920×1080）

### エディタ
- [x] ビジュアルスクリプトエディタ（コマンド追加・編集・並替・削除）
- [x] シーン編集（スクリプト部品化 — 分割管理・ドラッグ順序変更・結合）
- [x] スクリプトリストでシーンのツリー展開表示
- [x] テキスト一括編集モード
- [x] キャラクターエディタ（表情管理、立ち絵アップロード）
- [x] 背景エディタ（画像アップロード or グラデーション）
- [x] BGM/SEエディタ（ファイルアップロード、D&D対応、テスト再生）
- [x] CGカタログ / シーン回想カタログ
- [x] イベントエディタ
- [x] フローグラフ（分岐可視化）
- [x] プレビュー（分割表示 / フルプレビュー）
- [x] セーブデータエディタ（JSON直接編集）
- [x] Deploy パネル（Web / Portable / NSIS ビルド）
- [x] Undo/Redo（Ctrl+Z / Ctrl+Y）
- [x] 入力バリデーション（未定義のキャラ/背景/BGM/SE/ラベルをエラー表示）
- [x] 表情・ラベル・シーンのプルダウン選択

### RPGエンジン
- [x] タイルマップエディタ（2レイヤー、ペイント/消しゴム）
- [x] タイルセット分割インポート（スプライトシートから一括切り出し）
- [x] カスタムタイル（画像アップロード）
- [x] マップイベント（ダイアログ、バトル、マップ移動等）
- [x] ランダムマップ生成
- [x] バトルシステム（ターン制RPG）
- [x] ミニゲーム（じゃんけん、クイズ、スロット）

### タイトル・UI
- [x] タイトル画面（NEW GAME / CONTINUE / CG GALLERY / シーン回想 / CONFIG / EXIT）
- [x] CGギャラリーモード
- [x] シーン回想モード
- [x] 設定画面（テキスト速度、音量、画面サイズ）
- [x] プロジェクト管理画面（作成/複製/インポート/エクスポート/削除）

### パッケージング
- [x] Electron パッケージング（electron-builder）
- [x] Windows exe 出力（NSIS インストーラー / Portable）
- [x] asar パッケージング
- [x] ゲームエクスポート（game-data.json + アセットコピー）

## 未実装 🔲

### 優先度高
- [ ] **トランジション強化** — wipe, slide 等の追加エフェクト
- [ ] **キャラアニメーション強化** — 揺れ、ズーム
- [ ] **多言語テキスト対応**（任意）

### DLsite販売準備
- [ ] ゲームアイコン (.ico) 設定
- [ ] 動作環境テスト（Win10/11 64bit）
- [ ] DLsite サークル登録
- [ ] 予告ページ作成
- [ ] 紹介画像（600×420px メイン + サブ4枚）
- [ ] 体験版ビルド
- [ ] Ci-en 開発日記

---

## ディレクトリ構成

```
doujin-engine/
├── package.json
├── vite.config.js            ← Vite設定 + 開発サーバーAPI
├── electron/
│   ├── main.cjs              ← Electron メインプロセス（IPC, アセット, ビルド）
│   └── preload.cjs           ← IPC ブリッジ
├── src/
│   ├── App.jsx               ← エントリーポイント（画面遷移管理）
│   ├── engine/
│   │   ├── NovelEngine.jsx   ← メインエンジンコンポーネント
│   │   ├── reducer.js        ← ステート管理 (useReducer)
│   │   ├── commands.js       ← コマンド処理ロジック
│   │   └── constants.js      ← CMD/ACTION定数、SAVE_SLOT_COUNT
│   ├── components/           ← ゲームUI（TextBox, Character, Background 等）
│   ├── editor/
│   │   ├── EditorScreen.jsx  ← エディタ統合画面（タブ管理）
│   │   ├── ScriptList.jsx    ← スクリプトリスト（シーンツリー展開対応）
│   │   ├── CommandEditor.jsx ← コマンド編集（バリデーション付き）
│   │   ├── SceneEditor.jsx   ← シーン編集（スクリプト部品化）
│   │   ├── AudioCatalogEditor.jsx ← BGM/SE カタログ（再生プレビュー付き）
│   │   ├── CharacterEditor.jsx
│   │   ├── BackgroundEditor.jsx
│   │   ├── DeployPanel.jsx   ← ビルド実行UI
│   │   └── rpg/
│   │       ├── MapEditor.jsx ← タイルマップエディタ
│   │       └── TilesetSplitter.jsx ← タイルセット分割インポート
│   ├── audio/
│   │   ├── AudioManager.js   ← Web Audio API ラッパー
│   │   └── useAudio.js       ← state→audio フック
│   ├── rpg/                  ← RPGエンジン・マップ描画
│   ├── save/
│   │   └── SaveManager.js    ← セーブ/ロード + 永続化
│   ├── project/
│   │   ├── ProjectStore.js   ← プロジェクト CRUD + アセット管理
│   │   └── ProjectManager.jsx← プロジェクト一覧UI
│   ├── data/
│   │   ├── config.js         ← 画面設定、カラーパレット、フォント
│   │   ├── sample_scenario.js
│   │   └── sample_rpg.js
│   └── test/                 ← vitest テスト
├── data/                     ← プロジェクトデータ（※git管理外）
│   └── projects/{id}/
│       ├── meta.json
│       ├── script.json
│       ├── characters.json
│       ├── storyScenes.json  ← シーン部品
│       ├── sceneOrder.json   ← シーン再生順
│       ├── bgmCatalog.json
│       ├── seCatalog.json
│       └── assets/{type}/    ← アップロード画像・音声
├── dist/                     ← Vite ビルド出力
└── deploy/                   ← Electron ビルド出力
```

---

## コーディング規約

- **言語**: JavaScript (JSX)。TypeScript は任意（移行する場合は全体で統一）
- **スタイル**: インラインスタイル or CSS Modules。Tailwind は使わない
- **コンポーネント**: 関数コンポーネント + Hooks のみ。クラスコンポーネント禁止
- **ステート**: エンジン全体の状態は `useReducer` で集中管理
- **命名**: コンポーネント PascalCase、関数 camelCase、定数 UPPER_SNAKE_CASE
- **コメント**: 日本語OK。複雑なロジックには必ずコメント
- **アスペクト比**: ゲーム画面は **16:9**（960×540 基準、フルスクリーン対応）

---

## 開発コマンド（セットアップ後）

```bash
# 開発サーバー起動（ブラウザプレビュー）
npm run dev

# テスト実行
npm test              # 全テスト実行（vitest run）
npm run test:watch    # ウォッチモード（vitest）

# Electron で起動（デスクトップアプリとしてプレビュー）
npm run electron:dev

# プロダクションビルド（Windows exe）
npm run build
npm run electron:build

# exe だけ欲しい場合
npx electron-builder --win --x64
```

---

## Electron パッケージング メモ

```js
// electron/main.js 最小構成
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 540,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  // 本番は dist/index.html をロード
  win.loadFile("dist/index.html");
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
```

```json
// package.json の build 設定例
{
  "build": {
    "appId": "com.yoursircle.novelgame",
    "productName": "ゲームタイトル",
    "win": {
      "target": "portable",
      "icon": "assets/icon.ico"
    },
    "asar": true,
    "files": [
      "dist/**/*",
      "electron/**/*",
      "assets/**/*"
    ]
  }
}
```

---

## DLsite 販売情報

| 項目 | 値 |
|------|-----|
| 販売カテゴリ | 同人（男性成人向け） |
| ゲーム形式 | ノベルゲーム (ADV) |
| 推奨価格帯 | 1,500〜2,200円 |
| 手数料 | 約40%（700円以上の場合） |
| 配布形式 | ZIP圧縮した exe パッケージ |
| 紹介画像 | メイン 600×420px + サブ最大4枚 |
| 審査期間 | 通常 3〜7営業日 |

### 販売前チェックリスト

- 予告ページは発売2〜4週間前に作成
- Ci-en で開発日記を3〜5記事投稿してから発売
- 体験版を先行公開して予告ページのお気に入り登録を促す
- ジャンルタグの選定が検索流入の生命線（ニッチ × 需要ありを狙う）

---

## AI活用方針

| 工程 | AI の使い方 |
|------|------------|
| シナリオ | メインストーリーは自分で書く。サブテキスト（NPC会話、アイテム説明、分岐テキスト）はAIで量産 → 自分でリライト |
| 画像素材 | Stable Diffusion でキャラ立ち絵・背景・イベントCG生成。image-prompt スキルでプロンプト管理 |
| コーディング | Claude Code でエンジン機能の実装・デバッグ |
| テスト | AI にバランス調整やテキスト校正を依頼 |
