# 要件定義書 — Doujin Engine v0.1.0

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Doujin Engine |
| 目的 | DLsite 同人ゲームの制作・販売（ノベル / RPG / ミニゲーム対応） |
| 配布形式 | Windows exe（Electron パッケージ） |
| 対象ユーザー | DLsite 利用者（Windows 10/11 64bit） |
| 開発者 | 個人開発（サークル単位） |

### ゴール

- 1作目でエンジン基盤を確立し、2作目以降で使い回せる資産にする
- 必要十分な機能を備えた同人ゲームエンジンを自前で持つ
- AI 画像生成（Stable Diffusion）との効率的なワークフローを実現する

---

## 2. 機能要件

### 2.1 プロジェクト管理

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| PM-001 | プロジェクト一覧表示 | 必須 | ✅ 実装済 | カード形式で全プロジェクトを表示。名前・説明・更新日時を表示 |
| PM-002 | プロジェクト新規作成 | 必須 | ✅ 実装済 | 名前・説明を入力して新規作成。デフォルトスクリプト付き |
| PM-003 | プロジェクト削除 | 必須 | ✅ 実装済 | 確認ダイアログ付き。関連セーブデータも削除 |
| PM-004 | プロジェクト複製 | 高 | ✅ 実装済 | 既存プロジェクトのコピーを作成 |
| PM-005 | プロジェクト選択→タイトル画面遷移 | 必須 | ✅ 実装済 | 選択時に activeProjectId を localStorage に保持 |
| PM-006 | プロジェクトデータ永続化 | 必須 | ✅ 実装済 | localStorage（`doujin-engine-projects`）に JSON 保存 |
| PM-007 | プロジェクトのエクスポート/インポート | 中 | 🔲 未実装 | JSON ファイルとしてエクスポート/インポート |
| PM-008 | プロジェクトテンプレート選択 | 低 | 🔲 未実装 | ノベル/RPG/ミニゲームのテンプレートから選んで作成 |

#### PM-007 詳細要件: プロジェクトのエクスポート/インポート

- **エクスポート**: プロジェクトデータ（スクリプト・キャラ・背景・セーブ）を1つの `.json` ファイルとしてダウンロード
- **インポート**: `.json` ファイルを選択してプロジェクトを復元
- **形式**: `{ version: "1.0", project: {...}, exportedAt: "ISO日時" }`
- **アセット**: 画像・音声ファイルは含まない（パスのみ保持）

---

### 2.2 エンジンコア（ノベルゲーム実行）

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| E-001 | テキストのタイプライター表示 | 必須 | ✅ 実装済 | 1文字ずつ表示。速度は設定可能（10〜100ms/字） |
| E-002 | テキスト速度調整 | 必須 | ✅ 実装済 | 設定画面の range スライダーで変更 |
| E-003 | クリック/Enter/Space でテキスト送り | 必須 | ✅ 実装済 | |
| E-004 | タイプ中クリックで全文即時表示 | 必須 | ✅ 実装済 | |
| E-005 | キャラクター立ち絵表示（left/center/right） | 必須 | ✅ 実装済 | 現在は絵文字プレースホルダー |
| E-006 | キャラクター表情切替 | 必須 | ✅ 実装済 | `chara_mod` コマンドで expression 変更 |
| E-007 | キャラクター非表示 | 必須 | ✅ 実装済 | `chara_hide` コマンド |
| E-008 | 背景切替（フェードトランジション） | 必須 | ✅ 実装済 | CSS transition 0.8s |
| E-009 | 選択肢表示・分岐 | 必須 | ✅ 実装済 | `choice` コマンドの `options[].jump` で分岐 |
| E-010 | BGM 再生 | 必須 | 🔲 未実装 | |
| E-011 | SE 再生 | 必須 | 🔲 未実装 | |
| E-012 | 画面エフェクト | 必須 | 🔲 未実装 | |
| E-013 | wait コマンド | 高 | 🔲 未実装 | |
| E-014 | jump / label コマンド | 高 | 🔲 未実装 | |
| E-015 | スキップ機能 | 高 | 🔲 未実装 | |
| E-016 | トランジション強化 | 中 | 🔲 未実装 | |
| E-017 | キャラアニメーション | 中 | 🔲 未実装 | |
| E-018 | NVL モード | 低 | 🔲 未実装 | |

#### E-010 詳細要件: BGM 再生

- **ライブラリ**: Web Audio API（依存なし）or Howler.js
- **対応形式**: `.ogg`（推奨）, `.mp3`
- **機能**:
  - `{ type: "bgm", name: "track_name", volume: 0.8, loop: true }` でループ再生開始
  - `{ type: "bgm_stop", fadeout: 1000 }` でフェードアウト停止
  - BGM は同時に1曲のみ。新しい BGM 再生時は前の曲をクロスフェード
  - 音量は 0.0〜1.0（デフォルト 0.8）
  - 設定画面のマスター音量スライダーと乗算
- **アセットパス**: `assets/bgm/{name}.ogg`
- **AudioManager クラス**:
  - `playBGM(name, { volume, loop, fadeIn })` — BGM 再生
  - `stopBGM({ fadeOut })` — BGM 停止
  - `playSE(name, { volume })` — SE ワンショット再生
  - `setMasterVolume(type, volume)` — マスター音量設定
  - `dispose()` — 全リソース解放

#### E-011 詳細要件: SE 再生

- **対応形式**: `.ogg`, `.mp3`
- **機能**:
  - `{ type: "se", name: "click", volume: 1.0 }` でワンショット再生
  - 同時に複数 SE を重ねて再生可能
  - SE 再生はスクリプト進行をブロックしない
- **アセットパス**: `assets/se/{name}.ogg`

#### E-012 詳細要件: 画面エフェクト

- **実装方式**: CSS animation / JavaScript animation
- **対応エフェクト**:

| name | 説明 | パラメータ | アニメーション |
|------|------|-----------|--------------|
| `shake` | 画面揺れ | `intensity` (px, default: 8), `time` (ms, default: 500) | translateX/Y ランダム振動 |
| `flash` | 画面フラッシュ | `color` (default: `#fff`), `time` (ms, default: 300) | opacity 1→0 |
| `fadeout` | フェードアウト | `color` (default: `#000`), `time` (ms, default: 1000) | opacity 0→1 で暗転維持 |
| `fadein` | フェードイン | `time` (ms, default: 1000) | 暗転解除 opacity 1→0 |
| `whitefade` | ホワイトアウト | `time` (ms, default: 1000) | `#fff` で fadeout と同じ |

- **コマンド例**: `{ type: "effect", name: "shake", intensity: 10, time: 800 }`
- **実装**: `ScreenEffects.jsx` — ゲームコンテナの上にオーバーレイ div を配置
- **エフェクト完了後**: 自動的に次のコマンドへ進む（wait 不要）

#### E-013 詳細要件: wait コマンド

- **コマンド**: `{ type: "wait", time: 2000 }`
- **動作**: 指定ミリ秒間、スクリプト進行を停止。クリックでスキップ可能
- **用途**: エフェクト後の間、演出の余韻
- **実装**: `commands.js` で `setTimeout` + Promise ベース。advance 関数でキャンセル可能

#### E-014 詳細要件: jump / label コマンド

- **label**: `{ type: "label", name: "scene_2" }` — 目印のみ。実行時はスキップ
- **jump**: `{ type: "jump", target: "scene_2" }` — `label.name === target` のインデックスへ移動
- **choice との連携**: `options[].jump` はインデックス番号（既存）またはラベル名（新規）を受け付ける
- **実装**:
  - 起動時にラベル→インデックスのマップを構築: `{ scene_2: 42 }`
  - `jump` コマンド実行時にマップから解決
  - ラベルが見つからない場合はコンソール警告 + 次のコマンドへ進む

#### E-015 詳細要件: スキップ機能

- **トリガー**: Ctrl キー長押し or スキップボタン（Controls に追加）
- **動作**:
  - テキスト表示を瞬時完了 → 自動で次のコマンドへ進む
  - 選択肢に到達したら停止
  - 既読判定は不要（全テキストスキップ可能）。将来的に既読のみスキップに拡張
- **速度**: 50ms/コマンド（ダイアログ）。非ダイアログコマンドは即座に処理
- **UI**: Controls に「SKIP」ボタン追加。スキップ中は画面上部に「>> SKIP」インジケーター表示

#### E-016 詳細要件: トランジション強化

- **対応トランジション**:

| transition | 説明 | 実装方式 |
|------------|------|---------|
| `none` | 即座に切り替え | opacity 切り替えなし |
| `fade` | フェード（既存） | opacity 0→1, 0.8s |
| `crossfade` | クロスフェード | 旧背景 opacity 1→0 と新背景 opacity 0→1 を同時実行 |
| `wipe_left` | 左ワイプ | clip-path: inset(0 100% 0 0) → inset(0) |
| `wipe_right` | 右ワイプ | clip-path 逆方向 |
| `slide_left` | 左スライド | translateX(100%) → translateX(0) |

- **適用対象**: `bg` コマンドの `transition` パラメータ
- **実装**: `Background.jsx` にトランジション種別ごとの CSS クラスまたはインラインスタイルを追加

#### E-017 詳細要件: キャラアニメーション

- **登場アニメーション**:
  - `fade_in`: opacity 0→1 (0.5s)
  - `slide_in_left`: translateX(-100px)→0 + opacity
  - `slide_in_right`: translateX(100px)→0 + opacity
  - `bounce_in`: scale(0.8)→scale(1.05)→scale(1) + opacity
- **退場アニメーション**: 登場の逆
- **コマンド**: `{ type: "chara", ..., animation: "slide_in_left" }`
- **`chara_hide`**: `{ type: "chara_hide", id: "sakura", animation: "fade_out" }`
- **アニメーション完了後に次コマンドへ進む**

#### E-018 詳細要件: NVL モード

- **動作**: テキストボックスではなく、画面全体にテキストを重ねて表示
- **切替コマンド**: `{ type: "mode", value: "nvl" }` / `{ type: "mode", value: "adv" }`
- **NVL モード時**: 過去テキストも画面に残る（ページ送りでクリア）
- **優先度低**: フェーズ2以降

---

### 2.3 セーブ＆ロード

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| S-001 | セーブスロット（3スロット） | 必須 | ✅ 実装済 | インメモリ |
| S-002 | セーブ/ロード UI | 必須 | ✅ 実装済 | オーバーレイ形式 |
| S-003 | セーブデータ永続化 | 必須 | 🔲 未実装 | |
| S-004 | セーブ時スクリーンショット | 中 | 🔲 未実装 | |
| S-005 | オートセーブ | 中 | 🔲 未実装 | |

#### S-003 詳細要件: セーブデータ永続化

- **Electron 環境**:
  - IPC ハンドラは `electron/main.cjs` に実装済み（`save-file`, `load-file`, `list-saves`）
  - `preload.cjs` で `window.electronAPI` として公開済み
  - 保存先: `userData/saves/{projectId}/slot_{n}.json`
  - **未接続**: NovelEngine → electronAPI の呼び出しが未実装
- **ブラウザ環境**:
  - `localStorage` に `save_{projectId}_slot_{n}` キーで保存
- **SaveManager.js の実装**:
  - `save(projectId, slot, data)` — 環境を自動判定して保存
  - `load(projectId, slot)` — 環境を自動判定して読み込み
  - `listSaves(projectId)` — 全スロットのメタデータ一覧
  - `deleteSave(projectId, slot)` — スロット削除
- **セーブデータ構造**:
  ```json
  {
    "version": "1.0",
    "projectId": "xxx",
    "slot": 0,
    "savedAt": "2026-03-21T12:00:00Z",
    "state": {
      "scriptIndex": 42,
      "currentBg": "classroom",
      "characters": {},
      "backlog": [],
      "bgmPlaying": "morning_theme",
      "speaker": "桜",
      "text": "おはよう"
    }
  }
  ```

#### S-004 詳細要件: セーブ時スクリーンショット

- **方式**: ゲームコンテナ要素を `html2canvas` or `canvas.toDataURL` でキャプチャ
- **サイズ**: 240×135px（16:9 サムネイル）
- **保存**: Base64 文字列としてセーブデータ JSON に `thumbnail` フィールドで埋め込み
- **表示**: セーブ/ロード画面のスロットにサムネイル画像を表示

#### S-005 詳細要件: オートセーブ

- **タイミング**: 選択肢到達時 / BGM 変更時 / 一定コマンド数（50）ごと
- **スロット**: 専用のオートセーブスロット（スロット0をオートセーブ専用にする）
- **UI**: セーブ/ロード画面で「AUTO」ラベル付きで区別

---

### 2.4 UI / UX

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| U-001 | バックログ表示 | 必須 | ✅ 実装済 | 全画面オーバーレイ、逆順表示 |
| U-002 | オート再生モード | 必須 | ✅ 実装済 | 2500ms 遅延 |
| U-003 | 設定画面（テキスト速度） | 必須 | ✅ 実装済 | range スライダー |
| U-004 | 設定画面（BGM/SE 音量） | 必須 | 🔲 未実装 | |
| U-005 | タイトル画面 | 必須 | ✅ 実装済 | NEW GAME / CONTINUE / EDITOR / BACK |
| U-006 | CG ギャラリー | 高 | 🔲 未実装 | |
| U-007 | シーン回想モード | 中 | 🔲 未実装 | |
| U-008 | キーボード操作 | 必須 | ✅ 実装済 | Enter/Space/Escape |

#### U-004 詳細要件: BGM/SE 音量スライダー

- **追加先**: `ConfigView.jsx`
- **スライダー**:
  - BGM 音量: 0〜100（デフォルト 80）
  - SE 音量: 0〜100（デフォルト 100）
  - マスター音量: 0〜100（デフォルト 100）
- **永続化**: プロジェクトデータの `config` に保存
- **AudioManager 連携**: スライダー変更時にリアルタイムで反映

#### U-006 詳細要件: CG ギャラリー

- **アクセス**: タイトル画面の「CG GALLERY」ボタン
- **CG 登録**: スクリプトコマンド `{ type: "cg", src: "event_01" }` で CG 表示 + フラグ記録
- **フラグ管理**: プロジェクトデータに `unlockedCGs: ["event_01", "event_02"]` を保持
- **UI**:
  - グリッド表示（4列）。未回収 CG はシルエット or 「？」表示
  - クリックで全画面拡大表示
  - 左右矢印キー or クリックで前後移動
  - Escape で一覧に戻る
- **CG 定義**: `src/data/cgList.js` に全 CG リストを定義
  ```js
  export const CG_LIST = [
    { id: "event_01", src: "assets/cg/event_01.png", title: "出会い" },
    { id: "event_02", src: "assets/cg/event_02.png", title: "告白" },
  ];
  ```

#### U-007 詳細要件: シーン回想モード

- **アクセス**: タイトル画面の「SCENE」ボタン
- **シーン登録**: `{ type: "label", name: "scene_rooftop", recollection: true }` のように `recollection: true` が付いたラベルを回想対象にする
- **フラグ管理**: ラベル通過時に `unlockedScenes[]` に追加
- **UI**: シーン名一覧 → 選択で該当ラベルからゲーム再生
- **回想終了**: 次の `recollection: true` ラベルまたはスクリプト末尾でタイトルに戻る

---

### 2.5 スクリプトエディタ（ノベル）

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| D-001 | スクリプトコマンド一覧表示 | 高 | ✅ 実装済 | タイプアイコン + 要約テキスト |
| D-002 | コマンド追加/削除/並べ替え | 高 | ✅ 実装済 | ドラッグ&ドロップ対応 |
| D-003 | コマンドプロパティ編集 | 高 | ✅ 実装済 | フィールド自動生成 |
| D-004 | リアルタイムプレビュー | 高 | ✅ 実装済 | ゲーム画面をインライン表示 |
| D-005 | テキストエディタ（一括編集） | 高 | ✅ 実装済 | ダイアログのみ抽出して編集 |
| D-006 | フローグラフ（分岐可視化） | 高 | ✅ 実装済 | choice/jump/label の関係を図示 |
| D-007 | デバッグパネル | 高 | ✅ 実装済 | ステート一覧表示 |
| D-008 | セーブデータエディタ | 中 | ✅ 実装済 | JSON 直接編集 |
| D-009 | デプロイパネル | 中 | ✅ 実装済 | ビルド情報表示 |
| D-010 | スクリプト JS インポート | 中 | 🔲 未実装 | |
| D-011 | アセットプレビュー | 中 | 🔲 未実装 | |

#### D-010 詳細要件: スクリプトインポート

- **入力**: JavaScript 配列テキスト（`[{ type: "bg", ... }, ...]`）
- **パース**: `JSON.parse` or `eval` でオブジェクト配列に変換
- **バリデーション**: 各コマンドに `type` フィールドが存在するか確認
- **UI**: テキストエリア + 「インポート」ボタン

---

### 2.6 RPG エディタ

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| R-001 | マップエディタ | 中 | ✅ ひな形 | タイルベースの2Dマップ編集 |
| R-002 | バトルエディタ | 中 | ✅ ひな形 | エネミー/スキル/バトル設定 |
| R-003 | マップ実行エンジン | 低 | 🔲 未実装 | マップ上でキャラを動かす |
| R-004 | バトル実行エンジン | 低 | 🔲 未実装 | ターン制バトルの実行 |

#### R-001 詳細要件: マップエディタ（ひな形実装済み）

- **マップ構造**:
  ```json
  {
    "id": "map_01",
    "name": "村の広場",
    "width": 20,
    "height": 15,
    "tileSize": 32,
    "layers": [
      { "name": "地面", "data": [[0,0,1,...], ...] },
      { "name": "オブジェクト", "data": [[null,null,...], ...] }
    ],
    "events": [
      { "x": 5, "y": 3, "type": "npc", "script": "scene_shopkeeper" }
    ]
  }
  ```
- **タイルパレット**: 色パレットによるプレースホルダー（将来的に画像タイルに差し替え）
- **ツール**: ペン / 塗りつぶし / 消しゴム / スポイト
- **レイヤー**: 地面 + オブジェクト + イベントの3レイヤー
- **エクスポート**: JSON 形式でプロジェクトデータに保存

#### R-002 詳細要件: バトルエディタ（ひな形実装済み）

- **エネミー定義**:
  ```json
  { "id": "slime", "name": "スライム", "hp": 30, "atk": 5, "def": 3, "exp": 10, "gold": 5 }
  ```
- **スキル定義**:
  ```json
  { "id": "fire", "name": "ファイア", "type": "magic", "power": 25, "mp": 8, "element": "fire" }
  ```
- **エンカウント設定**: マップ領域ごとの出現テーブル
- **UI**: テーブル形式でパラメータ入力、プレビュー表示

---

### 2.7 ミニゲームエディタ

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| MG-001 | クイズゲーム | 中 | ✅ ひな形 | 4択問題の作成・編集 |
| MG-002 | じゃんけんゲーム | 中 | ✅ ひな形 | ルール設定（勝利条件・報酬） |
| MG-003 | 数当てゲーム | 中 | ✅ ひな形 | 範囲・ヒント・制限回数設定 |
| MG-004 | 神経衰弱 | 中 | ✅ ひな形 | カード枚数・画像設定 |
| MG-005 | タイミングゲーム | 中 | ✅ ひな形 | 判定幅・速度設定 |
| MG-006 | ミニゲーム実行エンジン | 低 | 🔲 未実装 | 各ミニゲームの実行ランタイム |

#### ミニゲーム共通仕様

- **スクリプト連携**: `{ type: "minigame", game: "quiz", config: "quiz_01" }` でノベルパート中にミニゲーム挿入
- **結果分岐**: ミニゲーム結果（勝利/敗北/スコア）に応じて `jump` 先を変更
- **データ保存**: プロジェクトデータの `minigames: {}` に設定を保持

#### MG-001 詳細要件: クイズゲーム

- **問題データ**:
  ```json
  {
    "id": "quiz_01",
    "questions": [
      {
        "text": "日本の首都は？",
        "options": ["東京", "大阪", "京都", "名古屋"],
        "answer": 0,
        "timeLimit": 15
      }
    ],
    "passScore": 3,
    "onPass": "label_quiz_win",
    "onFail": "label_quiz_lose"
  }
  ```

---

### 2.8 パッケージング＆配布

| ID | 機能 | 優先度 | 状態 | 詳細 |
|----|------|--------|------|------|
| P-001 | Electron exe 出力 | 必須 | ✅ 設定済 | electron-builder 設定完了。ビルド未検証 |
| P-002 | asar パッケージング | 必須 | ✅ 設定済 | `"asar": true` 設定済み |
| P-003 | ゲームアイコン (.ico) | 高 | 🔲 未実装 | `"icon": null` のため未設定 |
| P-004 | ポータブル exe | 高 | ✅ 設定済 | `electron:portable` スクリプトあり |
| P-005 | 体験版ビルド | 中 | 🔲 未実装 | |

#### P-003 詳細要件: ゲームアイコン

- **形式**: `.ico`（256×256, 128×128, 64×64, 48×48, 32×32, 16×16 含む）
- **配置**: `assets/icon.ico`
- **package.json**: `"icon": "assets/icon.ico"`
- **ツール**: png2ico or electron-icon-builder で生成

#### P-005 詳細要件: 体験版ビルド

- **方式**: スクリプトに `{ type: "trial_end" }` コマンドを挿入
- **動作**: `trial_end` 到達時に「体験版はここまでです。製品版をお買い求めください。」を表示してタイトルに戻る
- **ビルド**: 環境変数 `VITE_TRIAL=true` で体験版モードを切り替え

---

## 3. 非機能要件

### 3.1 パフォーマンス

| 項目 | 要件 |
|------|------|
| 起動時間 | 5秒以内（Electron 起動含む） |
| テキスト送り応答 | 100ms 以内 |
| 画面遷移（トランジション） | 60fps でスムーズに動作 |
| メモリ使用量 | 500MB 以下（画像アセット含む） |

### 3.2 対応環境

| 項目 | 要件 |
|------|------|
| OS | Windows 10 / 11（64bit） |
| 画面解像度 | 1920×1080 基準、フルスクリーン対応 |
| 最小ウィンドウ | 960×540 |
| アスペクト比 | 16:9 |
| ブラウザ版（開発用） | Chrome / Edge 最新版 |

### 3.3 セキュリティ

| 項目 | 要件 |
|------|------|
| 素材保護 | asar パッケージング（完全な保護ではないが最低限） |
| セーブデータ | ローカルファイル（暗号化は任意） |
| Electron | contextIsolation: true, nodeIntegration: false |

### 3.4 保守性

| 項目 | 要件 |
|------|------|
| コンポーネント分離 | 1コンポーネント = 1ファイル |
| ステート管理 | useReducer による集中管理 |
| シナリオ形式 | JS 配列ベース（JSON 互換） |
| 2作目以降の再利用 | エンジン部分とデータ部分を明確に分離 |

---

## 4. シナリオデータ仕様

### 4.1 コマンド一覧

| type | 説明 | 必須パラメータ | オプション |
|------|------|---------------|-----------|
| `bg` | 背景変更 | `src` | `transition` (fade/crossfade/none/wipe_left/slide_left) |
| `bgm` | BGM 再生 | `name` | `loop` (default: true), `volume` (0.0-1.0) |
| `bgm_stop` | BGM 停止 | — | `fadeout` (ms) |
| `se` | SE 再生 | `name` | `volume` (0.0-1.0) |
| `chara` | キャラ表示 | `id`, `position`, `expression` | `animation` |
| `chara_mod` | 表情変更 | `id`, `expression` | — |
| `chara_hide` | キャラ非表示 | `id` | `animation` |
| `dialog` | テキスト表示 | `text` | `speaker` |
| `choice` | 選択肢 | `options: [{text, jump}]` | — |
| `effect` | 画面効果 | `name` | `color`, `time`, `intensity` |
| `wait` | 待機 | `time` (ms) | — |
| `jump` | ジャンプ | `target` (index or label) | — |
| `label` | ラベル定義 | `name` | `recollection` (boolean) |
| `cg` | CG 表示 | `src` | — |
| `minigame` | ミニゲーム呼出 | `game`, `config` | — |
| `mode` | 表示モード切替 | `value` (adv/nvl) | — |
| `trial_end` | 体験版終了 | — | — |

### 4.2 データ形式

```js
const SCRIPT = [
  { type: "label", name: "chapter_1" },
  { type: "bg", src: "classroom", transition: "fade" },
  { type: "bgm", name: "morning_theme", volume: 0.8 },
  { type: "chara", id: "sakura", position: "center", expression: "smile", animation: "fade_in" },
  { type: "dialog", speaker: "桜", text: "おはよう、先輩。" },
  { type: "effect", name: "shake", time: 500 },
  { type: "wait", time: 1000 },
  { type: "cg", src: "event_01" },
  { type: "choice", options: [
    { text: "選択肢A", jump: "route_a" },
    { text: "選択肢B", jump: "route_b" },
  ]},
  { type: "label", name: "route_a" },
  // ...
  { type: "jump", target: "chapter_2" },
];
```

---

## 5. 画面一覧

| 画面 | 説明 | 遷移元 | 状態 |
|------|------|--------|------|
| プロジェクト管理 | プロジェクト選択・作成・削除・複製 | 起動時 | ✅ 実装済 |
| タイトル画面 | NEW GAME / CONTINUE / EDITOR / BACK | プロジェクト選択 | ✅ 実装済 |
| ゲーム画面 | ノベルゲーム実行 | タイトル | ✅ 実装済 |
| バックログ | 過去テキスト一覧 | ゲーム中 | ✅ 実装済 |
| セーブ/ロード | スロット選択 | ゲーム中 | ✅ 実装済 |
| 設定画面 | テキスト速度・音量 | ゲーム中/タイトル | ✅ 一部実装 |
| 選択肢 | 分岐選択 | ゲーム中 | ✅ 実装済 |
| CG ギャラリー | 回収 CG 一覧 | タイトル | 🔲 未実装 |
| シーン回想 | クリア済みシーン再プレイ | タイトル | 🔲 未実装 |
| エディタ（ノベル） | スクリプト/テキスト/フロー/プレビュー/デバッグ/セーブ | タイトル | ✅ 実装済 |
| エディタ（RPG） | マップ/バトル | エディタ内タブ | ✅ ひな形 |
| エディタ（ミニゲーム） | 各種ミニゲーム設定 | エディタ内タブ | ✅ ひな形 |
| デプロイパネル | ビルド情報・手順 | エディタ内タブ | ✅ 実装済 |

---

## 6. 開発フェーズ

### フェーズ 1: エンジン完成（現在）

1. BGM/SE の実際の再生実装（E-010, E-011）
2. 画面エフェクト実装（E-012）
3. wait / jump / label コマンド実装（E-013, E-014）
4. セーブデータ永続化（S-003）
5. スキップ機能（E-015）
6. 設定画面に音量スライダー追加（U-004）
7. CG ギャラリー（U-006）

### フェーズ 2: 製品化

1. タイトル画面の完成（CG GALLERY / SCENE / CONFIG 接続）
2. シーン回想モード（U-007）
3. トランジション強化（E-016）
4. キャラアニメーション（E-017）
5. オートセーブ（S-005）
6. セーブスクリーンショット（S-004）
7. プロジェクトエクスポート/インポート（PM-007）

### フェーズ 3: DLsite 販売準備

1. ゲームアイコン作成（P-003）
2. 体験版ビルド対応（P-005）
3. exe ビルド検証（Win10/11 64bit）
4. DLsite サークル登録
5. 紹介画像作成（600×420px メイン + サブ4枚）
6. Ci-en 開発日記

---

## 7. 技術スタック

| 区分 | 技術 | バージョン |
|------|------|-----------|
| フレームワーク | React | 19.x |
| ビルドツール | Vite | 8.x |
| パッケージング | Electron + electron-builder | latest |
| 言語 | JavaScript (JSX) | ES2022+ |
| スタイリング | インラインスタイル | — |
| フォント | Noto Serif JP | Google Fonts |
| 音声再生 | Web Audio API or Howler.js | — |
| 画像生成 | Stable Diffusion | — |

---

## 8. ディレクトリ構成

```
doujin-engine/
├── docs/
│   └── requirements.md       ← この要件定義書
├── electron/
│   ├── main.cjs               ← Electron メインプロセス
│   └── preload.cjs            ← IPC ブリッジ
├── src/
│   ├── App.jsx               ← 画面遷移管理
│   ├── main.jsx              ← エントリーポイント
│   ├── engine/               ← エンジンコア
│   │   ├── NovelEngine.jsx
│   │   ├── reducer.js
│   │   ├── commands.js
│   │   └── constants.js
│   ├── components/           ← ゲーム UI コンポーネント
│   │   ├── TitleScreen.jsx
│   │   ├── TextBox.jsx
│   │   ├── Character.jsx
│   │   ├── Background.jsx
│   │   ├── ChoiceOverlay.jsx
│   │   ├── BacklogView.jsx
│   │   ├── SaveLoadView.jsx
│   │   ├── ConfigView.jsx
│   │   └── Controls.jsx
│   ├── project/              ← プロジェクト管理
│   │   ├── ProjectManager.jsx
│   │   └── ProjectStore.js
│   ├── editor/               ← エディタ
│   │   ├── EditorScreen.jsx  ← メインコンテナ（タブ管理）
│   │   ├── ScriptList.jsx
│   │   ├── CommandEditor.jsx
│   │   ├── PreviewPanel.jsx
│   │   ├── TextEditor.jsx
│   │   ├── FlowGraph.jsx
│   │   ├── DebugPanel.jsx
│   │   ├── SaveDataEditor.jsx
│   │   ├── DeployPanel.jsx
│   │   ├── rpg/
│   │   │   ├── MapEditor.jsx
│   │   │   └── BattleEditor.jsx
│   │   └── minigame/
│   │       └── MinigameEditor.jsx
│   ├── audio/                ← BGM/SE 管理（未実装）
│   │   └── AudioManager.js
│   ├── effects/              ← 画面エフェクト（未実装）
│   │   └── ScreenEffects.jsx
│   ├── save/                 ← セーブ管理（未実装）
│   │   └── SaveManager.js
│   └── data/                 ← デフォルトゲームデータ
│       ├── script.js
│       ├── characters.js
│       └── config.js
├── assets/
│   ├── bg/                   ← 背景画像
│   ├── chara/                ← 立ち絵
│   ├── cg/                   ← イベント CG
│   ├── bgm/                  ← BGM (.ogg)
│   ├── se/                   ← SE (.ogg)
│   ├── ui/                   ← UI 素材
│   └── font/                 ← フォント
├── index.html
├── package.json
├── vite.config.js
└── dist/                     ← ビルド出力
```
