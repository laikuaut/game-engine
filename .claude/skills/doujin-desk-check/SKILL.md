---
name: doujin-desk-check
description: 実装したコードをセルフレビューし、問題があれば修正する。
argument-hint: ""
---

# doujin-desk-check — 机上確認スキル

## 手順

直前の実装で変更した全ファイルを再読し、以下の観点でレビューする。
問題を見つけたら即座に修正する。

## チェック観点

1. **正確性**: ロジックが正しいか、エッジケースを処理しているか
2. **一貫性**: 既存コードのパターンに従っているか
3. **完全性**:
   - import / export 漏れがないか
   - constants.js に定数定義漏れがないか
   - CMD_META / FIELD_DEFS への追加漏れがないか
4. **ステート整合性**: reducer の action type が constants.js に定義されているか
5. **props 伝搬**: 新しい props が全ての呼び出し元から渡されているか
   - App.jsx → NovelEngine
   - EditorScreen → CommandEditor / SceneEditor / PreviewPanel
6. **セキュリティ**: eval / dangerouslySetInnerHTML を不用意に使っていないか

## 出力

```
## 机上確認結果

### 確認ファイル
- ファイル一覧

### 発見した問題
- （あれば修正内容を記載）

### 結果
- OK / NG（修正済み）
```
