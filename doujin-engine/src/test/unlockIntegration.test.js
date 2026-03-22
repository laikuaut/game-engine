import { describe, it, expect, vi } from "vitest";
import { processCommand, buildLabelMap } from "../engine/commands";

describe("unlockIntegration", () => {
  it("CG コマンド実行時に unlockFn('cg', id) が呼ばれる", () => {
    const dispatch = vi.fn();
    const unlockFn = vi.fn();
    const script = [
      { type: "cg", id: "ev01" },
      { type: "dialog", speaker: "", text: "test" },
    ];
    processCommand(script, 0, dispatch, {}, null, unlockFn);
    expect(unlockFn).toHaveBeenCalledWith("cg", "ev01");
  });

  it("recollection 付きラベル通過時に unlockFn('scene', name) が呼ばれる", () => {
    const dispatch = vi.fn();
    const unlockFn = vi.fn();
    const script = [
      { type: "label", name: "ending_a", recollection: true },
      { type: "dialog", speaker: "", text: "ending" },
    ];
    processCommand(script, 0, dispatch, {}, null, unlockFn);
    expect(unlockFn).toHaveBeenCalledWith("scene", "ending_a");
  });

  it("recollection なしのラベルでは unlockFn が呼ばれない", () => {
    const dispatch = vi.fn();
    const unlockFn = vi.fn();
    const script = [
      { type: "label", name: "normal_label" },
      { type: "dialog", speaker: "", text: "text" },
    ];
    processCommand(script, 0, dispatch, {}, null, unlockFn);
    expect(unlockFn).not.toHaveBeenCalled();
  });

  it("unlockFn が undefined でもエラーにならない", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "cg", id: "ev01" },
      { type: "label", name: "scene_a", recollection: true },
      { type: "dialog", speaker: "", text: "test" },
    ];
    // unlockFn を渡さなくてもクラッシュしない
    expect(() => processCommand(script, 0, dispatch, {}, null, undefined)).not.toThrow();
  });
});
