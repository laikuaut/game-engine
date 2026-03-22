# アクションゲーム開発パイプライン

## 概要

ノベルエンジンの資産（キャラ・背景・BGM/SE・シナリオ）を活用しつつ、
2Dサイドスクロール or トップダウンのアクション要素を追加する。

---

## パイプライン全体像

```
1. ステージ設計（エディタ）
   ├── マップ作成（タイルマップ）
   ├── 敵・ギミック配置
   ├── プレイヤー設定
   └── イベント設定（ノベルパート連携）
       ↓
2. テストプレイ（エディタ内プレビュー）
   ├── ステージ単体テスト
   ├── 操作確認（キーボード/ゲームパッド）
   ├── 当たり判定確認（デバッグ表示）
   └── ノベルパート連動確認
       ↓
3. バランス調整
   ├── 敵HP/攻撃力/速度調整
   ├── アイテムドロップ率
   ├── ステージ難易度カーブ
   └── プレイ時間計測
       ↓
4. ビルド・デプロイ
   ├── game-data.json 出力（actionData含む）
   ├── アセットコピー
   ├── Electron exe ビルド
   └── DLsite 出品
```

---

## Phase 1: ステージ設計

### 1-1. マップエディタ（既存拡張）

既存のRPGマップエディタを拡張して使う。

| 項目 | RPG | アクション |
|---|---|---|
| 視点 | トップダウン | サイドスクロール or トップダウン |
| マップサイズ | 12×10〜 | 横長（40×12、60×15 等） |
| レイヤー | 地形 + オブジェクト | 地形 + 背景 + 前景 |
| 物理 | なし | 重力・当たり判定 |

### 1-2. タイル属性

```json
{
  "id": "brick",
  "label": "レンガ",
  "color": "#8B4513",
  "physics": {
    "solid": true,
    "platform": false,
    "damage": 0,
    "breakable": false
  }
}
```

| 属性 | 説明 |
|---|---|
| `solid` | 壁・床（通過不可） |
| `platform` | 足場（下から通過可、上に立てる） |
| `damage` | 接触ダメージ（トゲ等） |
| `breakable` | 壊せるブロック |

### 1-3. プレイヤー設定

```json
{
  "playerConfig": {
    "speed": 4,
    "jumpPower": 10,
    "hp": 100,
    "gravity": 0.5,
    "maxFallSpeed": 12,
    "invincibleTime": 1000,
    "sprites": {
      "idle": "player_idle.png",
      "run": "player_run.png",
      "jump": "player_jump.png",
      "attack": "player_attack.png",
      "damage": "player_damage.png"
    },
    "hitbox": { "width": 24, "height": 32, "offsetX": 4, "offsetY": 0 },
    "attacks": [
      {
        "name": "通常攻撃",
        "damage": 10,
        "range": 32,
        "cooldown": 300,
        "animation": "attack"
      }
    ]
  }
}
```

### 1-4. 敵設定

```json
{
  "enemies": [
    {
      "id": "slime",
      "name": "スライム",
      "hp": 30,
      "damage": 10,
      "speed": 1.5,
      "behavior": "patrol",
      "sprite": "enemy_slime.png",
      "hitbox": { "width": 24, "height": 24 },
      "drops": [
        { "itemId": "coin", "chance": 0.5 }
      ]
    },
    {
      "id": "bat",
      "name": "コウモリ",
      "hp": 20,
      "damage": 15,
      "speed": 3,
      "behavior": "fly_sine",
      "sprite": "enemy_bat.png"
    }
  ]
}
```

| behavior | 動作 |
|---|---|
| `patrol` | 左右往復 |
| `chase` | プレイヤー追跡 |
| `fly_sine` | 正弦波で飛行 |
| `stationary` | 固定（砲台等） |
| `boss` | ボス（専用AI） |

### 1-5. ステージ定義

```json
{
  "stages": [
    {
      "id": "stage_1",
      "name": "草原ステージ",
      "mapId": 0,
      "bgm": "adventure",
      "timeLimit": 180,
      "clearCondition": "reach_goal",
      "spawnPoint": { "x": 2, "y": 10 },
      "goalPoint": { "x": 38, "y": 10 },
      "enemyPlacements": [
        { "enemyId": "slime", "x": 10, "y": 10 },
        { "enemyId": "slime", "x": 18, "y": 8 },
        { "enemyId": "bat", "x": 25, "y": 5 }
      ],
      "itemPlacements": [
        { "itemId": "coin", "x": 5, "y": 8 },
        { "itemId": "heart", "x": 15, "y": 6 }
      ],
      "events": [
        {
          "trigger": "reach",
          "x": 20, "y": 10,
          "action": "novel",
          "sceneId": "mid_stage_dialog"
        },
        {
          "trigger": "clear",
          "action": "novel",
          "sceneId": "stage_clear_dialog"
        }
      ]
    }
  ]
}
```

| clearCondition | 説明 |
|---|---|
| `reach_goal` | ゴール地点到達 |
| `defeat_all` | 全敵撃破 |
| `defeat_boss` | ボス撃破 |
| `survive` | 制限時間生存 |
| `collect_all` | 全アイテム収集 |

### 1-6. ノベルパート連携

アクションステージの途中や前後でノベルパートを挿入:

```
ノベル（プロローグ）
  → アクション（ステージ1）
    → ノベル（中間イベント）※ステージ内イベント
  → ノベル（ステージクリア後の会話）
  → アクション（ステージ2）
  → ...
  → ノベル（エンディング）
```

script.json での制御:
```json
[
  { "type": "scene", "sceneId": "prologue" },
  { "type": "action_stage", "stageId": "stage_1" },
  { "type": "scene", "sceneId": "after_stage1" },
  { "type": "action_stage", "stageId": "stage_2" },
  { "type": "scene", "sceneId": "ending" },
  { "type": "label", "name": "script_end" }
]
```

---

## Phase 2: テストプレイ

### 2-1. エディタ内プレビュー

| 機能 | 説明 |
|---|---|
| ステージ単体起動 | 選択ステージだけをプレイ |
| デバッグ表示 | 当たり判定枠、敵AI状態、FPS |
| 無敵モード | ダメージ無効でステージ確認 |
| ワープ | 任意座標にジャンプ |
| 速度変更 | 0.5x / 1x / 2x |

### 2-2. デバッグオーバーレイ

```
┌────────────────────────────────────┐
│ FPS: 60  |  Stage: stage_1        │
│ Player: (120, 320)  HP: 80/100    │
│ Enemies: 3/5  Items: 2/4          │
│ [F1] Hitbox  [F2] Grid  [F3] God  │
└────────────────────────────────────┘
```

### 2-3. キーバインド

| キー | アクション |
|---|---|
| ← → | 移動 |
| Space / ↑ | ジャンプ |
| Z | 攻撃 |
| X | 特殊攻撃 |
| P | ポーズ |
| Escape | メニュー / ノベルパートへ戻る |

---

## Phase 3: バランス調整

### 3-1. パラメータシート（エディタUI）

| パラメータ | 調整方法 |
|---|---|
| プレイヤー能力 | actionData.playerConfig で一元管理 |
| 敵パラメータ | actionData.enemies の配列で管理 |
| ステージ難易度 | 敵配置数・種類で調整 |
| アイテム配置 | 回復量・配置密度 |

### 3-2. 難易度カーブ

```
ステージ1: 敵3体、ダメージ低、アイテム多
ステージ2: 敵5体、新敵種追加
ステージ3: ギミック追加（動く足場）
ステージ4: 中ボス
ステージ5: ボス戦
```

---

## Phase 4: ビルド・デプロイ

### 4-1. エクスポートフロー

```
1. ゲームエクスポート（DeployPanel）
   - game-data.json に actionData を含む
   - ステージマップ・敵・アイテムデータ
   - プレイヤースプライト

2. Vite ビルド（npm run build）
   - アクションエンジンをバンドル

3. Electron ビルド（electron-builder）
   - Windows exe 出力

4. テスト実行
   - exe でステージ1〜最終ステージを通しプレイ
   - ノベル→アクション→ノベルの遷移確認
```

### 4-2. DLsite 出品チェックリスト

- [ ] 全ステージクリア可能
- [ ] 死亡→リトライが正常動作
- [ ] ノベルパートのセーブ/ロード
- [ ] アクションパートのチェックポイント
- [ ] キーボード操作の説明表示
- [ ] ゲームパッド対応（任意）
- [ ] 画面サイズ変更対応
- [ ] BGM/SE の音量設定

---

## 実装優先順

### Phase 1（MVP）
1. **ActionEngine コンポーネント** — Canvas ベースの2Dレンダリング
2. **物理演算** — 重力、当たり判定（AABB）
3. **プレイヤー操作** — 移動、ジャンプ、攻撃
4. **敵AI** — patrol, chase
5. **ステージクリア判定** — reach_goal

### Phase 2（拡張）
6. **ボス戦** — 専用AIパターン
7. **アイテム** — コイン、HP回復
8. **ノベル連携** — ステージ内イベント発火
9. **チェックポイント** — 中間セーブ

### Phase 3（仕上げ）
10. **エディタUI** — ステージプレビュー、敵配置ビジュアル
11. **デバッグツール** — ヒットボックス表示、ワープ
12. **パフォーマンス最適化** — スプライトバッチ、オフスクリーン除外

---

## 技術選定

| 要素 | 技術 |
|---|---|
| レンダリング | Canvas 2D API（React内） |
| 物理 | 自作AABB（軽量） |
| スプライト | スプライトシート + アニメーション |
| マップ | 既存タイルマップシステム拡張 |
| 入力 | KeyboardEvent + Gamepad API |
| ゲームループ | requestAnimationFrame |
| FPS | 60fps 固定（deltaTime制御） |
