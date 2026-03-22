import { describe, it, expect, vi } from "vitest";
import { evaluateCondition, evaluateEvent, executeEventActions } from "../engine/eventEvaluator";
import { ACTION } from "../engine/constants";

describe("evaluateCondition", () => {
  describe("flag 条件", () => {
    it("== で一致する場合 true", () => {
      const gs = { flags: { talked: true }, variables: {}, items: {} };
      expect(evaluateCondition({ type: "flag", key: "talked", value: true, operator: "==" }, gs)).toBe(true);
    });

    it("== でデフォルト (value 省略) は true と比較", () => {
      const gs = { flags: { talked: true }, variables: {}, items: {} };
      expect(evaluateCondition({ type: "flag", key: "talked" }, gs)).toBe(true);
    });

    it("== で不一致の場合 false", () => {
      const gs = { flags: {}, variables: {}, items: {} };
      expect(evaluateCondition({ type: "flag", key: "talked", value: true, operator: "==" }, gs)).toBe(false);
    });

    it("!= で不一致の場合 true", () => {
      const gs = { flags: {}, variables: {}, items: {} };
      expect(evaluateCondition({ type: "flag", key: "talked", value: true, operator: "!=" }, gs)).toBe(true);
    });

    it("!= で一致の場合 false", () => {
      const gs = { flags: { talked: true }, variables: {}, items: {} };
      expect(evaluateCondition({ type: "flag", key: "talked", value: true, operator: "!=" }, gs)).toBe(false);
    });
  });

  describe("variable 条件", () => {
    const gs = { flags: {}, variables: { score: 10 }, items: {} };

    it("== 一致", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 10, operator: "==" }, gs)).toBe(true);
    });

    it("== 不一致", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 5, operator: "==" }, gs)).toBe(false);
    });

    it("!=", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 5, operator: "!=" }, gs)).toBe(true);
      expect(evaluateCondition({ type: "variable", key: "score", value: 10, operator: "!=" }, gs)).toBe(false);
    });

    it(">", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 5, operator: ">" }, gs)).toBe(true);
      expect(evaluateCondition({ type: "variable", key: "score", value: 10, operator: ">" }, gs)).toBe(false);
    });

    it("<", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 15, operator: "<" }, gs)).toBe(true);
      expect(evaluateCondition({ type: "variable", key: "score", value: 10, operator: "<" }, gs)).toBe(false);
    });

    it(">=", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 10, operator: ">=" }, gs)).toBe(true);
      expect(evaluateCondition({ type: "variable", key: "score", value: 11, operator: ">=" }, gs)).toBe(false);
    });

    it("<=", () => {
      expect(evaluateCondition({ type: "variable", key: "score", value: 10, operator: "<=" }, gs)).toBe(true);
      expect(evaluateCondition({ type: "variable", key: "score", value: 9, operator: "<=" }, gs)).toBe(false);
    });

    it("未定義変数は 0 扱い", () => {
      expect(evaluateCondition({ type: "variable", key: "unknown", value: 0, operator: "==" }, gs)).toBe(true);
    });
  });

  describe("item_check 条件", () => {
    it("所持数が閾値以上で true（デフォルト >=）", () => {
      const gs = { flags: {}, variables: {}, items: { potion: 3 } };
      expect(evaluateCondition({ type: "item_check", key: "potion", value: 2 }, gs)).toBe(true);
    });

    it("所持数が不足で false", () => {
      const gs = { flags: {}, variables: {}, items: { potion: 1 } };
      expect(evaluateCondition({ type: "item_check", key: "potion", value: 2 }, gs)).toBe(false);
    });

    it("未所持アイテムは 0 扱い", () => {
      const gs = { flags: {}, variables: {}, items: {} };
      expect(evaluateCondition({ type: "item_check", key: "potion", value: 1 }, gs)).toBe(false);
    });
  });

  describe("scene_viewed 条件", () => {
    it("unlockStore で解放済みなら true", () => {
      const gs = { flags: {}, variables: {}, items: {} };
      const unlock = { isUnlocked: (type, key) => type === "scene" && key === "ending_a" };
      expect(evaluateCondition({ type: "scene_viewed", key: "ending_a" }, gs, unlock)).toBe(true);
    });

    it("未解放なら false", () => {
      const gs = { flags: {}, variables: {}, items: {} };
      const unlock = { isUnlocked: () => false };
      expect(evaluateCondition({ type: "scene_viewed", key: "ending_a" }, gs, unlock)).toBe(false);
    });

    it("unlockStore が null なら false", () => {
      const gs = { flags: {}, variables: {}, items: {} };
      expect(evaluateCondition({ type: "scene_viewed", key: "ending_a" }, gs, null)).toBe(false);
    });
  });

  describe("choice_made 条件", () => {
    it("選択履歴に一致があれば true", () => {
      const gs = {
        flags: {}, variables: {}, items: {},
        choiceHistory: [{ label: "q1", choice: "A" }],
      };
      expect(evaluateCondition({ type: "choice_made", key: "q1", value: "A" }, gs)).toBe(true);
    });

    it("一致がなければ false", () => {
      const gs = {
        flags: {}, variables: {}, items: {},
        choiceHistory: [{ label: "q1", choice: "B" }],
      };
      expect(evaluateCondition({ type: "choice_made", key: "q1", value: "A" }, gs)).toBe(false);
    });

    it("choiceHistory が空なら false", () => {
      const gs = { flags: {}, variables: {}, items: {}, choiceHistory: [] };
      expect(evaluateCondition({ type: "choice_made", key: "q1", value: "A" }, gs)).toBe(false);
    });
  });

  it("未知の条件タイプで false", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gs = { flags: {}, variables: {}, items: {} };
    expect(evaluateCondition({ type: "unknown_type" }, gs)).toBe(false);
    warn.mockRestore();
  });
});

describe("evaluateEvent", () => {
  const gs = { flags: { a: true }, variables: { x: 5 }, items: {} };

  it("全条件が true なら true", () => {
    const event = {
      enabled: true,
      conditions: [
        { type: "flag", key: "a", value: true },
        { type: "variable", key: "x", value: 5, operator: "==" },
      ],
    };
    expect(evaluateEvent(event, gs)).toBe(true);
  });

  it("1つでも false なら false", () => {
    const event = {
      enabled: true,
      conditions: [
        { type: "flag", key: "a", value: true },
        { type: "variable", key: "x", value: 99, operator: "==" },
      ],
    };
    expect(evaluateEvent(event, gs)).toBe(false);
  });

  it("enabled=false なら false", () => {
    const event = {
      enabled: false,
      conditions: [{ type: "flag", key: "a", value: true }],
    };
    expect(evaluateEvent(event, gs)).toBe(false);
  });

  it("conditions が空なら true", () => {
    expect(evaluateEvent({ enabled: true, conditions: [] }, gs)).toBe(true);
  });

  it("conditions が undefined なら true", () => {
    expect(evaluateEvent({ enabled: true }, gs)).toBe(true);
  });
});

describe("executeEventActions", () => {
  it("set_flag アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "set_flag", key: "done", value: true }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.SET_FLAG,
      payload: { key: "done", value: true },
    });
  });

  it("set_variable アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "set_variable", key: "score", value: 10, operator: "+=" }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.SET_VARIABLE,
      payload: { key: "score", value: 10, operator: "+=" },
    });
  });

  it("add_item アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "add_item", id: "potion", amount: 3 }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.ADD_ITEM,
      payload: { id: "potion", amount: 3 },
    });
  });

  it("remove_item アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "remove_item", id: "potion", amount: 1 }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.REMOVE_ITEM,
      payload: { id: "potion", amount: 1 },
    });
  });

  it("jump_label アクションでジャンプ先を返す", () => {
    const dispatch = vi.fn();
    const labelMap = { ending: 50 };
    const event = { actions: [{ type: "jump_label", label: "ending" }] };
    const result = executeEventActions(event, dispatch, labelMap);
    expect(result).toBe(50);
  });

  it("play_bgm アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "play_bgm", name: "battle", volume: 0.8 }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.SET_BGM,
      payload: { name: "battle", volume: 0.8 },
    });
  });

  it("play_se アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "play_se", name: "click", volume: 1.0 }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.SET_SE,
      payload: { name: "click", volume: 1.0 },
    });
  });

  it("change_bg アクションで dispatch する", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "change_bg", src: "forest", transition: "crossfade" }] };
    executeEventActions(event, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTION.SET_BG,
      payload: { src: "forest", transition: "crossfade" },
    });
  });

  it("actions が null なら null を返す", () => {
    const result = executeEventActions({ actions: null }, vi.fn(), {});
    expect(result).toBe(null);
  });

  it("jump_label がなければ null を返す", () => {
    const dispatch = vi.fn();
    const event = { actions: [{ type: "set_flag", key: "x", value: true }] };
    const result = executeEventActions(event, dispatch, {});
    expect(result).toBe(null);
  });
});
