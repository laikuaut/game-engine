import { describe, it, expect } from "vitest";

// AudioCatalogEditor のデータ構造テスト

describe("BGM カタログデータ構造", () => {
  const createBGM = (name, overrides = {}) => ({
    id: `bgm_${Date.now().toString(36)}`,
    name,
    filename: null,
    description: "",
    volume: 1.0,
    loop: true,
    fadeIn: 500,
    fadeOut: 500,
    ...overrides,
  });

  it("BGM エントリの必須フィールドが揃っている", () => {
    const bgm = createBGM("battle_theme");
    expect(bgm.name).toBe("battle_theme");
    expect(bgm.id).toBeDefined();
    expect(bgm.filename).toBe(null);
    expect(bgm.volume).toBe(1.0);
    expect(bgm.loop).toBe(true);
    expect(bgm.fadeIn).toBe(500);
    expect(bgm.fadeOut).toBe(500);
  });

  it("カタログに追加・検索できる", () => {
    const catalog = [];
    catalog.push(createBGM("morning_theme", { id: "bgm_1" }));
    catalog.push(createBGM("battle_theme", { id: "bgm_2" }));
    catalog.push(createBGM("ending_theme", { id: "bgm_3" }));

    expect(catalog).toHaveLength(3);
    expect(catalog.find((b) => b.name === "battle_theme")).toBeDefined();
    expect(catalog.find((b) => b.id === "bgm_3").name).toBe("ending_theme");
  });

  it("カタログから削除できる", () => {
    let catalog = [
      createBGM("a", { id: "1" }),
      createBGM("b", { id: "2" }),
      createBGM("c", { id: "3" }),
    ];
    catalog = catalog.filter((b) => b.id !== "2");
    expect(catalog).toHaveLength(2);
    expect(catalog.find((b) => b.id === "2")).toBeUndefined();
  });

  it("フィールド更新が正しく動作する", () => {
    const catalog = [createBGM("theme", { id: "bgm_1", volume: 0.8 })];
    const updated = catalog.map((b) =>
      b.id === "bgm_1" ? { ...b, volume: 0.5, loop: false } : b
    );
    expect(updated[0].volume).toBe(0.5);
    expect(updated[0].loop).toBe(false);
    expect(updated[0].name).toBe("theme");
  });
});

describe("SE カタログデータ構造", () => {
  const createSE = (name, overrides = {}) => ({
    id: `se_${Date.now().toString(36)}`,
    name,
    filename: null,
    description: "",
    volume: 1.0,
    ...overrides,
  });

  it("SE エントリに loop/fade フィールドがない", () => {
    const se = createSE("click");
    expect(se.loop).toBeUndefined();
    expect(se.fadeIn).toBeUndefined();
    expect(se.fadeOut).toBeUndefined();
  });

  it("ファイル名の設定・クリアができる", () => {
    let se = createSE("decision", { id: "se_1" });
    expect(se.filename).toBe(null);

    se = { ...se, filename: "decision.ogg" };
    expect(se.filename).toBe("decision.ogg");

    se = { ...se, filename: null };
    expect(se.filename).toBe(null);
  });
});
