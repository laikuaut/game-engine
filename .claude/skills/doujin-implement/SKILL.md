---
name: doujin-implement
description: 設計方針に基づきコードを実装する。
argument-hint: "<タスク説明 or 設計結果を参照>"
---

# doujin-implement — 実装スキル

## コーディング規約

- JavaScript (JSX)、TypeScript 不可
- インラインスタイル or CSS Modules（Tailwind 不可）
- 関数コンポーネント + Hooks のみ
- PascalCase (コンポーネント), camelCase (関数), UPPER_SNAKE_CASE (定数)
- 日本語コメント OK

## エンジン変更時の必須対応

新しいコマンド/アクションを追加する場合:

1. `doujin-engine/src/engine/constants.js` — CMD/ACTION 定数を追加
2. `doujin-engine/src/engine/commands.js` — コマンド処理を追加、commandLabel にも追加
3. `doujin-engine/src/engine/reducer.js` — reducer case を追加

## エディタ対応の必須対応

新しいコマンドタイプを追加した場合:

1. `doujin-engine/src/editor/ScriptList.jsx` — `CMD_META` にラベル・色を追加
2. `doujin-engine/src/editor/CommandEditor.jsx` — `FIELD_DEFS` にフィールド定義を追加
3. `doujin-engine/src/editor/FlowGraph.jsx` — ノード表示を追加

## データ変更時の規約

- BGM/SE の `name`: 半角英数のみ
- キャラ ID: 半角英数のみ
- NVL 使用: 地の文3行以上連続のブロックのみ
- スキーマ: `doujin-engine/docs/design/project-data-schema.md` に準拠

## props 伝搬チェック

新しい props を追加した場合、以下の伝搬経路を確認:
- `App.jsx` → `NovelEngine.jsx` — ゲーム実行時
- `EditorScreen.jsx` → `CommandEditor.jsx` / `SceneEditor.jsx` — エディタ
- `EditorScreen.jsx` → `PreviewPanel.jsx` — プレビュー
