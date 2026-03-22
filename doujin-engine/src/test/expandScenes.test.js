import { describe, it, expect, vi } from "vitest";
import { expandScenes, buildLabelMap, processCommand } from "../engine/commands";
import { CMD } from "../engine/constants";

describe("expandScenes", () => {
  it("シーンなしでスクリプトをそのまま返す", () => {
    const script = [
      { type: "bg", src: "test" },
      { type: "dialog", speaker: "", text: "hello" },
    ];
    const result = expandScenes(script, []);
    expect(result).toBe(script);
  });

  it("シーンなし（null）でスクリプトをそのまま返す", () => {
    const script = [{ type: "dialog", speaker: "", text: "hello" }];
    expect(expandScenes(script, null)).toBe(script);
  });

  it("シーン参照を展開する", () => {
    const script = [
      { type: "scene", sceneId: "sc_a" },
    ];
    const scenes = [
      {
        id: "sc_a",
        name: "シーンA",
        commands: [
          { type: "dialog", speaker: "A", text: "hello" },
          { type: "dialog", speaker: "B", text: "world" },
        ],
      },
    ];
    const result = expandScenes(script, scenes);
    // label("シーンA") + dialog + dialog = 3
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ type: "label", name: "シーンA" });
    expect(result[1].type).toBe("dialog");
    expect(result[2].type).toBe("dialog");
  });

  it("sceneコマンドのlabel指定が優先される", () => {
    const script = [
      { type: "scene", sceneId: "sc_a", label: "custom_label" },
    ];
    const scenes = [
      { id: "sc_a", name: "シーンA", commands: [] },
    ];
    const result = expandScenes(script, scenes);
    expect(result[0]).toEqual({ type: "label", name: "custom_label" });
  });

  it("複数シーンを順番に展開する", () => {
    const script = [
      { type: "scene", sceneId: "sc_a" },
      { type: "dialog", speaker: "", text: "between" },
      { type: "scene", sceneId: "sc_b" },
    ];
    const scenes = [
      { id: "sc_a", name: "A", commands: [{ type: "dialog", speaker: "", text: "a1" }] },
      { id: "sc_b", name: "B", commands: [{ type: "dialog", speaker: "", text: "b1" }] },
    ];
    const result = expandScenes(script, scenes);
    // label(A) + dialog(a1) + dialog(between) + label(B) + dialog(b1) = 5
    expect(result.length).toBe(5);
    expect(result[0].name).toBe("A");
    expect(result[2].text).toBe("between");
    expect(result[3].name).toBe("B");
  });

  it("存在しないシーンIDは警告してスキップ", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const script = [
      { type: "scene", sceneId: "nonexistent" },
      { type: "dialog", speaker: "", text: "after" },
    ];
    // 存在しないシーンを含むが、別のシーンが定義されている場合
    const scenes = [{ id: "other", name: "Other", commands: [] }];
    const result = expandScenes(script, scenes);
    expect(result.length).toBe(1); // nonexistent はスキップ、dialogのみ
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("シーン内ラベルがスコープ化される", () => {
    const script = [{ type: "scene", sceneId: "sc_a" }];
    const scenes = [{
      id: "sc_a",
      name: "A",
      commands: [
        { type: "label", name: "local_start" },
        { type: "dialog", speaker: "", text: "hello" },
        { type: "jump", target: "local_start" },
      ],
    }];
    const result = expandScenes(script, scenes);
    // label はスコープ化: "local_start" → "sc_a/local_start"
    expect(result[1].name).toBe("sc_a/local_start");
    // jump の target も同じスコープに
    expect(result[3].target).toBe("sc_a/local_start");
  });

  it("シーン内choiceのjumpもスコープ化される", () => {
    const script = [{ type: "scene", sceneId: "sc_a" }];
    const scenes = [{
      id: "sc_a",
      name: "A",
      commands: [
        { type: "label", name: "route_a" },
        { type: "dialog", speaker: "", text: "text" },
        { type: "choice", options: [
          { text: "A", jump: "route_a" },
          { text: "B", jump: "global_label" },
        ]},
      ],
    }];
    const result = expandScenes(script, scenes);
    const choice = result.find(c => c.type === "choice");
    expect(choice.options[0].jump).toBe("sc_a/route_a"); // ローカル → スコープ化
    expect(choice.options[1].jump).toBe("global_label"); // グローバル → そのまま
  });

  it("展開後のラベルマップが正しく構築される", () => {
    const script = [
      { type: "scene", sceneId: "sc_a" },
      { type: "label", name: "after_scene" },
    ];
    const scenes = [{
      id: "sc_a",
      name: "A",
      commands: [
        { type: "dialog", speaker: "", text: "hello" },
      ],
    }];
    const expanded = expandScenes(script, scenes);
    const labelMap = buildLabelMap(expanded);
    expect(labelMap["A"]).toBe(0); // シーンエントリラベル
    expect(labelMap["after_scene"]).toBe(2); // label(A) + dialog + label(after)
  });
});

describe("processCommand — disabled", () => {
  it("disabled コマンドをスキップする", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "bg", src: "test", disabled: true },
      { type: "bgm", name: "theme", disabled: true },
      { type: "dialog", speaker: "", text: "reached" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(2);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("disabled dialog もスキップする", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "dialog", speaker: "", text: "skipped", disabled: true },
      { type: "dialog", speaker: "", text: "shown" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(1);
  });
});

describe("processCommand — clearText", () => {
  it("effect の clearText で台詞がクリアされる", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "effect", name: "fadeout", color: "#000", time: 1000, clearText: true },
    ];
    const result = processCommand(script, 0, dispatch, {});
    const calls = dispatch.mock.calls.map(c => c[0].type);
    expect(calls).toContain("SET_DISPLAYED_TEXT");
    expect(calls).toContain("SET_SPEAKER");
    expect(calls).toContain("START_EFFECT");
  });

  it("clearText なしでは台詞クリアされない", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "effect", name: "fadeout", color: "#000", time: 1000 },
    ];
    processCommand(script, 0, dispatch, {});
    const calls = dispatch.mock.calls.map(c => c[0].type);
    expect(calls).not.toContain("SET_DISPLAYED_TEXT");
    expect(calls).toContain("START_EFFECT");
  });
});

describe("processCommand — chara anim", () => {
  it("chara_mod に anim が渡される", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "chara_mod", id: "rin", expression: "surprise", anim: "shake" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    processCommand(script, 0, dispatch, {});
    const modCall = dispatch.mock.calls.find(c => c[0].type === "MOD_CHARA");
    expect(modCall[0].payload.anim).toBe("shake");
  });

  it("anim なしでも動作する", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "chara_mod", id: "rin", expression: "smile" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    processCommand(script, 0, dispatch, {});
    const modCall = dispatch.mock.calls.find(c => c[0].type === "MOD_CHARA");
    expect(modCall[0].payload.anim).toBeUndefined();
  });
});
