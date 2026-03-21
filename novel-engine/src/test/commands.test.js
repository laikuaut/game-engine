import { describe, it, expect, vi } from "vitest";
import { processCommand, buildLabelMap, resolveTarget } from "../engine/commands";
import { CMD } from "../engine/constants";

describe("buildLabelMap", () => {
  it("ラベルマップを構築する", () => {
    const script = [
      { type: "bg", src: "test" },
      { type: "label", name: "scene_a" },
      { type: "dialog", speaker: "", text: "hello" },
      { type: "label", name: "scene_b" },
    ];
    const map = buildLabelMap(script);
    expect(map.scene_a).toBe(1);
    expect(map.scene_b).toBe(3);
  });

  it("空スクリプトで空マップ", () => {
    expect(buildLabelMap([])).toEqual({});
  });

  it("重複ラベルで警告", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const script = [
      { type: "label", name: "dup" },
      { type: "label", name: "dup" },
    ];
    buildLabelMap(script);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("resolveTarget", () => {
  const labelMap = { scene_a: 5, scene_b: 10 };

  it("数値をそのまま返す", () => {
    expect(resolveTarget(7, labelMap)).toBe(7);
  });

  it("ラベル名をインデックスに変換", () => {
    expect(resolveTarget("scene_a", labelMap)).toBe(5);
  });

  it("存在しないラベルで -1", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveTarget("unknown", labelMap)).toBe(-1);
    warn.mockRestore();
  });
});

describe("processCommand", () => {
  it("bg コマンドを処理して dialog で停止", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "bg", src: "school", transition: "fade" },
      { type: "bgm", name: "theme" },
      { type: "dialog", speaker: "A", text: "hello" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(2);
    expect(result.blocking).toBe(null);
    expect(dispatch).toHaveBeenCalledTimes(2); // SET_BG + SET_BGM
  });

  it("label をスキップする", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "label", name: "test" },
      { type: "dialog", speaker: "", text: "hi" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(1);
    expect(dispatch).not.toHaveBeenCalled(); // label は何も dispatch しない
  });

  it("jump でラベル先に飛ぶ", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "jump", target: "dest" },
      { type: "dialog", speaker: "", text: "skipped" },
      { type: "label", name: "dest" },
      { type: "dialog", speaker: "", text: "reached" },
    ];
    const labelMap = buildLabelMap(script);
    const result = processCommand(script, 0, dispatch, labelMap);
    expect(result.index).toBe(3); // dest ラベルの次の dialog
  });

  it("wait で blocking を返す", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "wait", time: 1000 },
      { type: "dialog", speaker: "", text: "after wait" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(0);
    expect(result.blocking).toBe("wait");
  });

  it("effect で blocking を返す", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "effect", name: "shake", time: 500 },
      { type: "dialog", speaker: "", text: "after effect" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(0);
    expect(result.blocking).toBe("effect");
  });

  it("cg で blocking を返す", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "cg", id: "ev01", src: "cg/ev01.png" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.blocking).toBe("cg");
  });

  it("bgm_stop を処理する", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "bgm_stop" },
      { type: "dialog", speaker: "", text: "silence" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "STOP_BGM" }));
    expect(result.index).toBe(1);
  });

  it("nvl_on / nvl_off / nvl_clear を処理する", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "nvl_on" },
      { type: "nvl_clear" },
      { type: "nvl_off" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(result.index).toBe(3);
  });

  it("chara / chara_mod / chara_hide を処理する", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "chara", id: "sakura", position: "center", expression: "smile" },
      { type: "chara_mod", id: "sakura", expression: "sad" },
      { type: "chara_hide", id: "sakura" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(result.index).toBe(3);
  });

  it("スクリプト末尾に到達", () => {
    const dispatch = vi.fn();
    const script = [{ type: "bg", src: "test" }];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(1); // length と同じ = 末尾
    expect(result.blocking).toBe(null);
  });
});
