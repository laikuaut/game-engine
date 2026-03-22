---
name: doujin-metrics
description: プロジェクトの規模を測定し、コード量・テスト網羅率・機能数・ファイル構成を一覧化する。
argument-hint: "[対象ディレクトリ（省略時はdoujin-engine全体）]"
---

# doujin-metrics — 規模測定スキル

プロジェクトの規模を多角的に測定し、レポートを出力する。

## 測定項目

### 1. コード規模
以下をファイル種別ごとに集計する:

```bash
# 対象: doujin-engine/src/ 配下
# JSX/JS ファイルの行数・ファイル数
find doujin-engine/src -name "*.jsx" -o -name "*.js" | xargs wc -l
```

- **ソースコード**: `src/` 配下の `.js`, `.jsx` ファイル（テスト除く）
- **テストコード**: `src/test/` 配下
- **設定ファイル**: `vite.config.js`, `package.json`, `electron/`
- **ドキュメント**: `docs/`, `CLAUDE.md`, `README.md`
- 各カテゴリの**ファイル数**と**総行数**

### 2. ディレクトリ別集計
`src/` の主要ディレクトリごとに行数を集計:
- `src/engine/` — エンジンコア
- `src/editor/` — エディタUI
- `src/components/` — ゲームUIコンポーネント
- `src/audio/` — 音声管理
- `src/effects/` — 画面エフェクト
- `src/rpg/` — RPGエンジン
- `src/action/` — アクションエンジン
- `src/save/` — セーブ管理
- `src/project/` — プロジェクト管理
- `src/data/` — サンプルデータ
- `src/test/` — テスト

### 3. テスト情報
```bash
npx vitest run 2>&1 | tail -5
```
- テストファイル数
- テストケース数
- Pass / Fail 数

### 4. 機能数
`src/engine/constants.js` から:
- **コマンド型数**: `CMD` オブジェクトのキー数
- **アクション型数**: `ACTION` オブジェクトのキー数

`src/editor/EditorScreen.jsx` から:
- **エディタタブ数**: TABS 配列の長さ

### 5. 依存パッケージ
```bash
cat doujin-engine/package.json | grep -c "\":" # dependencies + devDependencies
```
- dependencies 数
- devDependencies 数

### 6. データ規模（プロジェクトデータ）
```bash
# data/projects/ 配下のプロジェクト数
ls doujin-engine/data/projects/ | grep -v _index | wc -l
```

### 7. Git 統計
```bash
git log --oneline | wc -l            # 総コミット数
git log --oneline --since="1 week"   # 直近1週間のコミット数
```

## 出力フォーマット

以下のマークダウンテーブルで出力する:

```markdown
## プロジェクト規模レポート

### コード規模
| カテゴリ | ファイル数 | 行数 |
|---------|----------|------|
| ソースコード（テスト除く） | XX | XX,XXX |
| テストコード | XX | X,XXX |
| Electron | X | X,XXX |
| ドキュメント | X | X,XXX |
| **合計** | **XX** | **XX,XXX** |

### ディレクトリ別
| ディレクトリ | ファイル数 | 行数 | 説明 |
|------------|----------|------|------|
| src/engine/ | X | X,XXX | エンジンコア |
| src/editor/ | X | X,XXX | エディタUI |
| ... | ... | ... | ... |

### テスト
| 項目 | 値 |
|------|-----|
| テストファイル数 | XX |
| テストケース数 | XXX |
| Pass | XXX |
| Fail | 0 |

### 機能
| 項目 | 値 |
|------|-----|
| コマンド型数 | XX |
| アクション型数 | XX |
| エディタタブ数 | XX |

### 依存パッケージ
| 項目 | 値 |
|------|-----|
| dependencies | XX |
| devDependencies | XX |

### Git
| 項目 | 値 |
|------|-----|
| 総コミット数 | XX |
| 直近1週間 | XX |

---
測定日: YYYY-MM-DD
```

## 注意事項
- 行数の集計には空行・コメント行を含む（gross lines）
- バイナリファイル（画像・音声）は除外
- `node_modules/`, `dist/`, `deploy/` は除外
- 引数でサブディレクトリを指定した場合はそのディレクトリのみ集計
