import { describe, it, expect, vi } from "vitest";
import { processCommand, buildLabelMap } from "../engine/commands";
import { ACTION } from "../engine/constants";

describe("eventCommands - processCommand", () => {
  describe("set_flag", () => {
    it("flags ステートを変更する dispatch が呼ばれる", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_flag", key: "talked", value: true },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_FLAG,
        payload: { key: "talked", value: true },
      });
    });

    it("value 省略時は true になる", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_flag", key: "visited" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_FLAG,
        payload: { key: "visited", value: true },
      });
    });
  });

  describe("if_flag", () => {
    it("条件一致でジャンプする", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_flag", key: "talked", value: true, jump: "dest" },
        { type: "dialog", speaker: "", text: "skipped" },
        { type: "label", name: "dest" },
        { type: "dialog", speaker: "", text: "reached" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: { talked: true }, variables: {}, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3); // dest ラベルの次の dialog
    });

    it("条件不一致でスルーする", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_flag", key: "talked", value: true, jump: "dest" },
        { type: "dialog", speaker: "", text: "not skipped" },
        { type: "label", name: "dest" },
        { type: "dialog", speaker: "", text: "dest" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: {}, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(1); // 次の dialog で停止
    });

    it("!= 演算子で反転比較", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_flag", key: "talked", value: true, operator: "!=", jump: "dest" },
        { type: "dialog", speaker: "", text: "skipped" },
        { type: "label", name: "dest" },
        { type: "dialog", speaker: "", text: "reached" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: {}, items: {} }; // talked は未設定 = false
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3); // 不一致なのでジャンプ
    });
  });

  describe("set_variable", () => {
    it("= 演算子", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_variable", key: "score", value: 100, operator: "=" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_VARIABLE,
        payload: { key: "score", value: 100, operator: "=" },
      });
    });

    it("+= 演算子", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_variable", key: "score", value: 10, operator: "+=" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_VARIABLE,
        payload: { key: "score", value: 10, operator: "+=" },
      });
    });

    it("-= 演算子", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_variable", key: "hp", value: 5, operator: "-=" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_VARIABLE,
        payload: { key: "hp", value: 5, operator: "-=" },
      });
    });

    it("*= 演算子", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_variable", key: "multiplier", value: 2, operator: "*=" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_VARIABLE,
        payload: { key: "multiplier", value: 2, operator: "*=" },
      });
    });

    it("operator 省略時は = がデフォルト", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "set_variable", key: "x", value: 42 },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.SET_VARIABLE,
        payload: { key: "x", value: 42, operator: "=" },
      });
    });
  });

  describe("if_variable", () => {
    it("== 一致でジャンプ", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_variable", key: "score", value: 10, operator: "==", jump: "win" },
        { type: "dialog", speaker: "", text: "skipped" },
        { type: "label", name: "win" },
        { type: "dialog", speaker: "", text: "win!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: { score: 10 }, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3);
    });

    it("> 比較", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_variable", key: "score", value: 5, operator: ">", jump: "high" },
        { type: "dialog", speaker: "", text: "low" },
        { type: "label", name: "high" },
        { type: "dialog", speaker: "", text: "high!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: { score: 10 }, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3);
    });

    it("< 不一致でスルー", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_variable", key: "score", value: 5, operator: "<", jump: "low" },
        { type: "dialog", speaker: "", text: "not low" },
        { type: "label", name: "low" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: { score: 10 }, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(1); // dialog で停止
    });

    it(">= 比較", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_variable", key: "score", value: 10, operator: ">=", jump: "pass" },
        { type: "dialog", speaker: "", text: "fail" },
        { type: "label", name: "pass" },
        { type: "dialog", speaker: "", text: "pass!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: { score: 10 }, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3);
    });

    it("<= 比較", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_variable", key: "score", value: 10, operator: "<=", jump: "ok" },
        { type: "dialog", speaker: "", text: "over" },
        { type: "label", name: "ok" },
        { type: "dialog", speaker: "", text: "ok!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: { score: 10 }, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3);
    });

    it("!= 比較", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "if_variable", key: "score", value: 5, operator: "!=", jump: "diff" },
        { type: "dialog", speaker: "", text: "same" },
        { type: "label", name: "diff" },
        { type: "dialog", speaker: "", text: "diff!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: { score: 10 }, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3);
    });
  });

  describe("add_item", () => {
    it("アイテム追加の dispatch が呼ばれる", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "add_item", id: "potion", amount: 3 },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.ADD_ITEM,
        payload: { id: "potion", amount: 3 },
      });
    });

    it("amount 省略時は 1", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "add_item", id: "key" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.ADD_ITEM,
        payload: { id: "key", amount: 1 },
      });
    });
  });

  describe("remove_item", () => {
    it("アイテム削除の dispatch が呼ばれる", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "remove_item", id: "potion", amount: 2 },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.REMOVE_ITEM,
        payload: { id: "potion", amount: 2 },
      });
    });

    it("amount 省略時は 1", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "remove_item", id: "potion" },
        { type: "dialog", speaker: "", text: "test" },
      ];
      processCommand(script, 0, dispatch, {}, null, null);
      expect(dispatch).toHaveBeenCalledWith({
        type: ACTION.REMOVE_ITEM,
        payload: { id: "potion", amount: 1 },
      });
    });
  });

  describe("check_item", () => {
    it("所持数が足りればジャンプする", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "check_item", id: "key", jump: "unlock" },
        { type: "dialog", speaker: "", text: "locked" },
        { type: "label", name: "unlock" },
        { type: "dialog", speaker: "", text: "unlocked!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: {}, items: { key: 1 } };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(3);
    });

    it("所持数が足りなければスルーする", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "check_item", id: "key", jump: "unlock" },
        { type: "dialog", speaker: "", text: "locked" },
        { type: "label", name: "unlock" },
        { type: "dialog", speaker: "", text: "unlocked!" },
      ];
      const labelMap = buildLabelMap(script);
      const gs = { flags: {}, variables: {}, items: {} };
      const result = processCommand(script, 0, dispatch, labelMap, gs, null);
      expect(result.index).toBe(1); // dialog で停止
    });

    it("amount 指定で必要数を確認", () => {
      const dispatch = vi.fn();
      const script = [
        { type: "check_item", id: "coin", amount: 5, jump: "rich" },
        { type: "dialog", speaker: "", text: "poor" },
        { type: "label", name: "rich" },
        { type: "dialog", speaker: "", text: "rich!" },
      ];
      const labelMap = buildLabelMap(script);

      // 5個以上所持
      const gs1 = { flags: {}, variables: {}, items: { coin: 5 } };
      expect(processCommand(script, 0, dispatch, labelMap, gs1, null).index).toBe(3);

      // 4個しかない
      const gs2 = { flags: {}, variables: {}, items: { coin: 4 } };
      expect(processCommand(script, 0, dispatch, labelMap, gs2, null).index).toBe(1);
    });
  });
});
