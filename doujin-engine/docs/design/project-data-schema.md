# プロジェクトデータ JSON スキーマ設計

## 概要

各プロジェクトは `data/projects/{プロジェクト名}/` ディレクトリに分割保存される。
1つの巨大JSONではなく、データ種別ごとに個別のJSONファイルとして管理する。

---

## ディレクトリ構成

```
data/projects/
├── _index.json                          ← 全プロジェクトのメタ情報一覧
├── {プロジェクト名}/
│   ├── meta.json                        ← プロジェクト基本情報
│   ├── script.json                      ← シナリオコマンド配列
│   ├── characters.json                  ← キャラクター定義
│   ├── bgStyles.json                    ← 背景スタイル定義
│   ├── bgmCatalog.json                  ← BGMカタログ
│   ├── seCatalog.json                   ← SEカタログ
│   ├── saves.json                       ← セーブデータ（100スロット）
│   ├── storyScenes.json                 ← シーン部品（スクリプト分割管理用）
│   ├── sceneOrder.json                  ← シーン再生順序
│   ├── cgCatalog.json                   ← CGギャラリーカタログ
│   ├── sceneCatalog.json                ← シーン回想カタログ
│   ├── items.json                       ← アイテム定義
│   ├── gameEvents.json                  ← ゲームイベント定義
│   ├── maps.json                        ← RPGマップデータ（RPGのみ）
│   ├── customTiles.json                 ← カスタムタイル（RPGのみ）
│   ├── battleData.json                  ← バトルデータ（RPGのみ）
│   ├── minigames.json                   ← ミニゲーム定義（RPG/ミニゲームのみ）
│   └── assets/
│       ├── bg/                          ← 背景画像
│       ├── chara/                       ← キャラクター立ち絵
│       ├── cg/                          ← CG画像
│       ├── bgm/                         ← BGM音声ファイル
│       └── se/                          ← SE音声ファイル
```

---

## 1. `_index.json` — プロジェクト一覧インデックス

プロジェクト一覧画面で使用。フルデータを読まずにメタ情報だけ取得できる。

```jsonc
[
  {
    "id": "mn06s87jpj3hrm",          // 一意ID（Date.now base36 + random）
    "name": "放課後の幽霊少女",        // プロジェクト表示名
    "dirName": "放課後の幽霊少女",     // ファイルシステム上のディレクトリ名
    "description": "サンプルシナリオ",  // 説明文
    "gameType": "novel",              // "novel" | "rpg" | "minigame"
    "createdAt": "2026-03-21T10:29:58.543Z",
    "updatedAt": "2026-03-21T10:29:58.581Z",
    "scriptLength": 290,              // script配列の長さ（統計用）
    "mapCount": 0,                    // maps配列の長さ（統計用）
    "minigameCount": 0                // minigames配列の長さ（統計用）
  }
]
```

### dirName の決定ルール

- プロジェクト名から Windows 禁止文字 (`<>:"/\|?*`) を `_` に置換
- 末尾のドットを除去
- 他プロジェクトと重複する場合は `{name}_{id末尾6文字}` にフォールバック

---

## 2. `meta.json` — プロジェクト基本情報

`_index.json` のエントリとほぼ同じだが、dirName・統計フィールドは含まない。

```jsonc
{
  "id": "mn06s87jpj3hrm",
  "name": "放課後の幽霊少女",
  "description": "ラノベ風サンプルシナリオ（約10分・2ルート完結）",
  "gameType": "novel",               // "novel" | "rpg" | "minigame"
  "createdAt": "2026-03-21T10:29:58.543Z",
  "updatedAt": "2026-03-21T10:29:58.581Z"
}
```

---

## 3. `script.json` — シナリオコマンド配列

ゲームの進行を定義するコマンドの配列。各要素は `type` フィールドで種別を判別する。

```jsonc
[
  { "type": "label", "name": "prologue" },
  { "type": "bg", "src": "classroom", "transition": "fade", "time": 1500 },
  { "type": "bgm", "name": "calm_afternoon" },
  { "type": "nvl_on" },
  { "type": "dialog", "speaker": "", "text": "その噂は、いつの間にか学校中に広まっていた。" },
  { "type": "nvl_clear" },
  { "type": "nvl_off" },
  { "type": "chara", "id": "yukina", "position": "center", "expression": "neutral" },
  { "type": "chara_mod", "id": "yukina", "expression": "smile" },
  { "type": "chara_hide", "id": "yukina" },
  { "type": "se", "name": "chime", "volume": 1.0 },
  { "type": "wait", "time": 500 },
  { "type": "effect", "name": "shake" },
  { "type": "effect", "name": "flash", "color": "#fff" },
  { "type": "effect", "name": "fadeout", "color": "#000", "time": 1000 },
  { "type": "cg", "id": "cg01" },
  { "type": "cg", "id": "cg01", "variant": 1 },
  { "type": "cg_hide" },
  { "type": "choice", "options": [
    { "text": "選択肢A", "jump": "route_a" },
    { "text": "選択肢B", "jump": "route_b" }
  ]},
  { "type": "jump", "target": "ending" },
  { "type": "scene", "sceneId": "scene_001" },
  { "type": "bgm_stop", "fadeout": 1000 }
]
```

### コマンドタイプ一覧

| type | 説明 | 必須パラメータ | オプション |
|------|------|---------------|-----------|
| `label` | ジャンプ先ラベル | `name` | — |
| `bg` | 背景変更 | `src` | `transition` (fade/crossfade/none), `time` |
| `bgm` | BGM再生 | `name` | `loop`, `volume` |
| `bgm_stop` | BGM停止 | — | `fadeout` (ms) |
| `se` | SE再生 | `name` | `volume` |
| `chara` | キャラ表示 | `id`, `position`, `expression` | — |
| `chara_mod` | 表情変更 | `id`, `expression` | `anim` (shake/bounce/zoom/nod/tremble) |
| `chara_hide` | キャラ非表示 | `id` | — |
| `dialog` | テキスト表示 | `speaker`, `text` | — |
| `choice` | 選択肢分岐 | `options[]` | — |
| `effect` | 画面効果 | `name` | `color`, `time` |
| `wait` | 待機 | `time` (ms) | — |
| `jump` | ラベルジャンプ | `target` | — |
| `cg` | CG表示（レイヤー） | `id` | `variant` (差分インデックス、省略時=メイン画像) |
| `cg_hide` | CG非表示 | — | — |
| `nvl_on` | NVLモード開始 | — | — |
| `nvl_off` | NVLモード終了 | — | — |
| `nvl_clear` | NVLログクリア | — | — |
| `scene` | シーン参照 | `sceneId` | — |

---

## 4. `characters.json` — キャラクター定義

キーがキャラクターID、値がキャラクター情報のオブジェクト。

```jsonc
{
  "{charaId}": {
    "name": "表示名",                   // ダイアログの話者名に使用
    "color": "#FFB7C5",                 // 名前表示のテーマカラー
    "expressions": {                    // 表情ID → 絵文字 or 説明テキスト
      "neutral": "🙂",
      "smile": "😊",
      "happy": "😄",
      "shy": "😳",
      "sad": "😢",
      "angry": "😠",
      "surprise": "😲"
    },
    "sprites": {                        // （任意）表情ID → 立ち絵ファイルパス
      "neutral": "shiraishi_rin/natural.png",
      "smile": "shiraishi_rin/smile.png"
    }
  }
}
```

### 補足

- `expressions` は必須。エディタのプルダウンで表情を選択する際に使用
- `sprites` は任意。指定がある場合は `assets/chara/` 配下の画像を立ち絵として表示
- `sprites` がない場合は絵文字のみで表情を表現（プロトタイピング用）

---

## 5. `bgStyles.json` — 背景スタイル定義

キーが背景ID（`bg` コマンドの `src` で参照）、値がCSSスタイル情報。

```jsonc
{
  "{bgId}": {
    "background": "url(/assets/bg/bg_classroom_an.jpg) center/cover no-repeat"
    // または画像なしグラデーション:
    // "background": "linear-gradient(180deg, #87CEEB 0%, #E0F0FF 40%, #98D8A0 60%)"
  }
}
```

### 補足

- `imageFile` はテンプレート定義時のみ使用（保存後はURL形式の `background` に変換される）
- エディタから画像アップロードすると `assets/bg/` に保存され、URLパスが自動設定される

---

## 6. `bgmCatalog.json` — BGMカタログ

```jsonc
[
  {
    "id": "bgm_calm_afternoon",         // 一意ID（bgm_ プレフィックス推奨）
    "name": "calm_afternoon",           // bgmコマンドの name で参照
    "filename": "calm_afternoon.mp3",   // assets/bgm/ 配下のファイル名（null = 未設定）
    "description": "穏やかな午後",       // エディタ上の説明
    "volume": 0.8,                      // 0.0 〜 1.0
    "loop": true,                       // ループ再生
    "fadeIn": 500,                      // フェードイン (ms)
    "fadeOut": 500                      // フェードアウト (ms)
  }
]
```

---

## 7. `seCatalog.json` — SEカタログ

```jsonc
[
  {
    "id": "se_click",                   // 一意ID（se_ プレフィックス推奨）
    "name": "click",                    // seコマンドの name で参照
    "filename": "click.mp3",            // assets/se/ 配下のファイル名（null = 未設定）
    "description": "決定音",             // エディタ上の説明
    "volume": 1.0                       // 0.0 〜 1.0
  }
]
```

---

## 8. `saves.json` — セーブデータ

100スロットの配列。未使用スロットは `null`。

```jsonc
[
  null,                                 // スロット0: 空
  {                                     // スロット1: データあり
    "scriptIndex": 42,
    "displayedText": "現在表示中のテキスト",
    "currentSpeaker": "雪菜",
    "currentBg": "classroom_昼",
    "characters": {
      "yukina": { "position": "center", "expression": "smile" }
    },
    "bgmPlaying": "calm_afternoon",
    "savedAt": "2026-03-21T12:00:00.000Z",
    "thumbnail": "data:image/png;base64,..."
  },
  null,
  // ... （計100要素）
]
```

---

## 9. `storyScenes.json` — シーン部品

スクリプトを分割管理するためのシーン定義。

```jsonc
[
  {
    "id": "scene_001",                  // sceneコマンドの sceneId で参照
    "name": "プロローグ",               // エディタ上の表示名
    "commands": [                       // このシーンのコマンド配列（script.json と同形式）
      { "type": "bg", "src": "classroom", "transition": "fade" },
      { "type": "dialog", "speaker": "雪菜", "text": "おはよう。" }
    ]
  }
]
```

---

## 10. `sceneOrder.json` — シーン再生順序

シーンの表示・再生順を定義するID配列。

```jsonc
["scene_001", "scene_002", "scene_003"]
```

---

## 11. `cgCatalog.json` — CGカタログ

CGの定義。`cg` コマンドは `id` のみ指定し、画像ファイルはこのカタログから解決する。

```jsonc
[
  {
    "id": "ch01_01",                    // cgコマンドの id で参照
    "title": "窓際の白石凛",             // エディタ・ギャラリー上の表示名
    "group": "第1話",                   // グループ分類（ギャラリー表示用）
    "thumbnail": "ch01-01.png",         // サムネイル画像（assets/cg/ 配下）
    "src": "event_cg_01.png",          // 本体画像（assets/cg/ 配下）
    "variants": [                       // 差分画像のファイル名配列
      "event_cg_01.png",
      "event_cg_01b.png"
    ]
  }
]
```

### 補足

- `cg` コマンドは `id` のみ指定。`src` はカタログから自動解決される
- `variants` は差分（表情違い等）。ギャラリーで切り替え表示に使用
- 開放状態は `UnlockStore` で管理（カタログJSON自体には含めない）

---

## 12. `sceneCatalog.json` — シーン回想カタログ

シーン回想画面で再生可能なシーンの定義。

```jsonc
[
  {
    "id": "recall_001",
    "name": "初めての出会い",
    "thumbnail": "scene_thumb_01.png",
    "scriptRange": { "from": 0, "to": 50 },
    "unlocked": false
  }
]
```

---

## 13. `items.json` — アイテム定義

```jsonc
[
  {
    "id": "item_001",
    "name": "薬草",
    "description": "HPを20回復する",
    "type": "consumable",
    "effect": { "hp": 20 },
    "price": 10,
    "icon": "item_herb.png"
  }
]
```

---

## 14. `gameEvents.json` — ゲームイベント定義

マップ上やゲーム進行で発生するイベントの定義。

```jsonc
[
  {
    "id": "event_001",
    "name": "村長との会話",
    "trigger": "interact",
    "commands": [
      { "type": "dialog", "speaker": "村長", "text": "ようこそ、勇者よ。" }
    ]
  }
]
```

---

## 15. `maps.json` — RPGマップデータ（RPGプロジェクトのみ）

```jsonc
[
  {
    "name": "はじまりの村",
    "width": 14,                        // タイル数（横）
    "height": 12,                       // タイル数（縦）
    "tileSize": 32,                     // 1タイルのピクセルサイズ
    "layers": [
      {
        "name": "地形",                  // レイヤー名
        "tiles": [                       // height × width の2次元配列
          ["tree", "grass", "dirt", ...],
          // ... （height行）
        ]
      },
      {
        "name": "オブジェクト",
        "tiles": [                       // null = 空きタイル
          [null, null, "chest", ...],
          // ...
        ]
      }
    ],
    "events": [                          // マップ上のイベント
      {
        "x": 5, "y": 3,
        "type": "dialog",
        "data": { "speaker": "村人", "text": "いい天気だ" }
      }
    ]
  }
]
```

---

## 16. `battleData.json` — バトルデータ（RPGプロジェクトのみ）

```jsonc
{
  "enemies": [
    {
      "id": "slime",
      "name": "スライム",
      "hp": 20,
      "atk": 4,
      "def": 2,
      "speed": 3,
      "exp": 5,                         // 獲得経験値
      "gold": 3,                        // 獲得ゴールド
      "skills": [],                     // 使用スキルID配列
      "drops": [                        // ドロップアイテム
        { "item": "スライムゼリー", "rate": 0.3 }
      ],
      "sprite": ""                      // 敵スプライト画像（空 = デフォルト）
    }
  ],
  "skills": [
    {
      "id": "sk_slash",
      "name": "斬撃",
      "type": "physical",
      "power": 15,
      "mpCost": 0,
      "target": "single",
      "description": "通常の斬撃"
    }
  ],
  "battles": [
    {
      "id": "battle_boss_01",
      "name": "魔王戦",
      "enemies": ["demon_lord"],
      "bgm": "bgm_battle",
      "background": "battle_bg_castle.png"
    }
  ]
}
```

---

## 17. `minigames.json` — ミニゲーム定義（RPG/ミニゲームプロジェクトのみ）

```jsonc
[
  {
    "id": "mg_quiz",
    "type": "quiz",                     // "quiz" | "janken" | "slot" など
    "title": "冒険者検定",
    "timeLimit": 30,                    // 制限時間（秒）
    "questions": [
      {
        "text": "スライムの弱点属性は？",
        "choices": ["火", "水", "雷", "弱点なし"],
        "answer": 3,                    // 正解のインデックス（0始まり）
        "points": 10
      }
    ]
  }
]
```

---

## 18. `customTiles.json` — カスタムタイル（RPGプロジェクトのみ）

マップエディタでユーザーがアップロードしたカスタムタイルの定義。

```jsonc
[
  {
    "id": "custom_tile_001",
    "name": "石畳",
    "src": "custom_stone.png",          // assets/配下のパス
    "passable": true                    // 通行可能か
  }
]
```

---

## データファイル分割ルール

### 分割対象（DATA_FILES）

以下の16種類のキーは個別JSONファイルとして保存される:

```
script, characters, items, gameEvents, bgStyles, maps, customTiles,
battleData, minigames, saves, bgmCatalog, seCatalog, cgCatalog,
sceneCatalog, storyScenes, sceneOrder
```

### meta.json に入るフィールド

上記 DATA_FILES に含まれない全フィールドが `meta.json` に保存される:

```
id, name, description, gameType, createdAt, updatedAt
```

### 保存・読み込みフロー

```
保存時:
  project オブジェクト
    → DATA_FILES に該当するキーを各 {key}.json に書き出し
    → 残りのフィールドを meta.json に書き出し
    → _index.json にメタ情報（dirName, 統計値含む）を更新

読み込み時:
  meta.json を読み込み
    → DATA_FILES の各 {key}.json を読み込んで結合
    → 単一の project オブジェクトとして返却
```

---

## ゲーム種別ごとの使用ファイル

| ファイル | novel | rpg | minigame |
|---------|:-----:|:---:|:--------:|
| meta.json | o | o | o |
| script.json | o | o | o |
| characters.json | o | o | - |
| bgStyles.json | o | o | o |
| bgmCatalog.json | o | o | o |
| seCatalog.json | o | o | o |
| saves.json | o | o | o |
| storyScenes.json | o | - | - |
| sceneOrder.json | o | - | - |
| cgCatalog.json | o | - | - |
| sceneCatalog.json | o | - | - |
| items.json | - | o | - |
| gameEvents.json | - | o | - |
| maps.json | - | o | - |
| customTiles.json | - | o | - |
| battleData.json | - | o | - |
| minigames.json | - | o | o |

※ `o` = 使用、`-` = 通常不使用（ファイル自体は空配列/オブジェクトで存在しうる）

---

## エクスポート形式

`exportProject()` で出力されるJSONは全データを単一オブジェクトに結合したもの。

```jsonc
{
  "id": "...",
  "name": "...",
  "description": "...",
  "gameType": "novel",
  "createdAt": "...",
  "updatedAt": "...",
  "script": [...],
  "characters": {...},
  "bgStyles": {...},
  "bgmCatalog": [...],
  "seCatalog": [...],
  "storyScenes": [...],
  "sceneOrder": [...],
  "_exportVersion": "1.0",
  "_exportedAt": "2026-03-21T12:00:00.000Z"
  // ※ saves は除外される
}
```
