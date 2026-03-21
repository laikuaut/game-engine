import { describe, it, expect } from "vitest";
import { SAVE_SLOT_COUNT, createEmptySaves } from "../engine/constants";
import { initialState } from "../engine/reducer";

describe("セーブスロット (100枠)", () => {
  it("SAVE_SLOT_COUNT が 100", () => {
    expect(SAVE_SLOT_COUNT).toBe(100);
  });

  it("createEmptySaves() が 100 個の null 配列を返す", () => {
    const saves = createEmptySaves();
    expect(saves).toHaveLength(100);
    expect(saves.every((s) => s === null)).toBe(true);
  });

  it("createEmptySaves() は毎回新しい配列を返す", () => {
    const a = createEmptySaves();
    const b = createEmptySaves();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("initialState.saves が 100 スロット", () => {
    expect(initialState.saves).toHaveLength(100);
  });

  it("任意のスロットにセーブ可能", () => {
    const saves = createEmptySaves();
    saves[0] = { scriptIndex: 5 };
    saves[49] = { scriptIndex: 50 };
    saves[99] = { scriptIndex: 100 };
    expect(saves[0].scriptIndex).toBe(5);
    expect(saves[49].scriptIndex).toBe(50);
    expect(saves[99].scriptIndex).toBe(100);
    expect(saves[1]).toBe(null);
  });
});
