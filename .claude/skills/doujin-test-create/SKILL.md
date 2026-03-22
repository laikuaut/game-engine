---
name: doujin-test-create
description: 変更内容に対するテストを作成または更新する。
argument-hint: ""
---

# doujin-test-create — テスト作成スキル

## 基本情報

- テストファイルの場所: `doujin-engine/src/test/`
- テストフレームワーク: vitest
- 既存テスト: `commands.test.js`, `reducer.test.js`, `constants.test.js` 等

## 手順

1. 直前の実装で変更した内容を確認する
2. テスト可能な変更か判断する:
   - **テスト必須**: reducer, commands, utils 等の純粋関数の変更
   - **テスト不要**: UI のみの変更、スタイル変更、コンポーネントの変更（jsdom 未設定のため）
3. テスト不要の場合は理由を述べてスキップ
4. テストを作成する:

```js
import { describe, it, expect, vi } from "vitest";
```

## テスト方針

- 既存テストのパターンに従う
- 新しい定数を追加した場合は `constants.test.js` を更新
- エッジケース（空配列、null、未定義値）を含める
- バグ修正の場合は **再現テスト必須**（修正前なら失敗するテスト）
