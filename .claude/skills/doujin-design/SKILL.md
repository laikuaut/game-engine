---
name: doujin-design
description: タスクを分析し、影響範囲の特定と実装方針を決定する。
argument-hint: "<タスク説明>"
---

# doujin-design — 設計スキル

## 手順

1. タスク説明を解析し、関連するソースファイルを読む（`doujin-engine/src/` 以下）
2. 必要に応じて設計ドキュメントを読む:
   - `CLAUDE.md` — 仕様・コーディング規約
   - `doujin-engine/docs/design/project-data-schema.md` — データスキーマ
   - `doujin-engine/docs/design/commands.md` — コマンド仕様
   - その他関連する `docs/design/*.md`
3. 既存のパターン・慣習を確認する
4. 実装方針を以下の形式で出力する:

```
## 設計結果

### 変更ファイル
- ファイルパス — 変更概要

### 新規ファイル
- （あれば）

### 注意点
- （あれば）
```

5. 大規模（10ファイル以上）または重大な設計判断がある場合はユーザー確認を待つ
