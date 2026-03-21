import { describe, it, expect, beforeEach } from "vitest";
import { getUnlocks, unlock, isUnlocked, resetUnlocks, unlockAll } from "../save/UnlockStore";

describe("UnlockStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初期状態は空", () => {
    const u = getUnlocks();
    expect(u.cg).toEqual([]);
    expect(u.scene).toEqual([]);
  });

  it("CG を解放できる", () => {
    unlock("cg", "ev_01");
    expect(isUnlocked("cg", "ev_01")).toBe(true);
    expect(isUnlocked("cg", "ev_02")).toBe(false);
  });

  it("シーンを解放できる", () => {
    unlock("scene", "scene_a");
    expect(isUnlocked("scene", "scene_a")).toBe(true);
  });

  it("重複解放しない", () => {
    unlock("cg", "ev_01");
    unlock("cg", "ev_01");
    expect(getUnlocks().cg).toEqual(["ev_01"]);
  });

  it("unlockAll で一括解放", () => {
    const catalog = [{ id: "ev_01" }, { id: "ev_02" }, { id: "ev_03" }];
    unlockAll(catalog, "cg");
    expect(getUnlocks().cg).toEqual(["ev_01", "ev_02", "ev_03"]);
  });

  it("resetUnlocks でリセット", () => {
    unlock("cg", "ev_01");
    unlock("scene", "scene_a");
    resetUnlocks();
    expect(getUnlocks().cg).toEqual([]);
    expect(getUnlocks().scene).toEqual([]);
  });
});
