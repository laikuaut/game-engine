import { describe, it, expect, vi } from "vitest";
import { expandScenes, buildLabelMap, processCommand } from "../engine/commands";
import { CMD } from "../engine/constants";

describe("マルチバイト文字 — シーン展開", () => {
  it("日本語シーンID・名前で正しく展開される", () => {
    const script = [{ type: "scene", sceneId: "シーン_01" }];
    const scenes = [{
      id: "シーン_01",
      name: "第1話：放課後",
      commands: [
        { type: "dialog", speaker: "凛", text: "こんにちは" },
      ],
    }];
    const result = expandScenes(script, scenes);
    expect(result.length).toBe(2); // label + dialog
    expect(result[0]).toEqual({ type: "label", name: "第1話：放課後" });
    expect(result[1].speaker).toBe("凛");
  });

  it("日本語ラベル名でジャンプできる", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "jump", target: "エンディング" },
      { type: "dialog", speaker: "", text: "スキップ" },
      { type: "label", name: "エンディング" },
      { type: "dialog", speaker: "", text: "到達" },
    ];
    const labelMap = buildLabelMap(script);
    expect(labelMap["エンディング"]).toBe(2);
    const result = processCommand(script, 0, dispatch, labelMap);
    expect(result.index).toBe(3);
  });

  it("日本語ラベルでchoice分岐できる", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "choice", options: [
        { text: "戦う", jump: "バトル" },
        { text: "逃げる", jump: "逃走" },
      ]},
      { type: "label", name: "バトル" },
      { type: "dialog", speaker: "", text: "戦闘開始" },
      { type: "label", name: "逃走" },
      { type: "dialog", speaker: "", text: "逃げた" },
    ];
    const labelMap = buildLabelMap(script);
    expect(labelMap["バトル"]).toBe(1);
    expect(labelMap["逃走"]).toBe(3);
  });

  it("日本語シーンID内のラベルがスコープ化される", () => {
    const script = [{ type: "scene", sceneId: "戦闘シーン" }];
    const scenes = [{
      id: "戦闘シーン",
      name: "01-バトル",
      commands: [
        { type: "label", name: "開始" },
        { type: "dialog", speaker: "", text: "戦闘" },
        { type: "jump", target: "開始" },
      ],
    }];
    const result = expandScenes(script, scenes);
    // スコープ化: "開始" → "戦闘シーン/開始"
    expect(result[1].name).toBe("戦闘シーン/開始");
    expect(result[3].target).toBe("戦闘シーン/開始");
  });

  it("全角記号を含むシーン名で展開できる", () => {
    const script = [{ type: "scene", sceneId: "sc_01" }];
    const scenes = [{
      id: "sc_01",
      name: "BAD END 1 — 逃避",
      commands: [{ type: "dialog", speaker: "", text: "終了" }],
    }];
    const result = expandScenes(script, scenes);
    expect(result[0].name).toBe("BAD END 1 — 逃避");
  });

  it("絵文字を含むテキストでも正常動作", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "dialog", speaker: "🎮プレイヤー", text: "こんにちは！✨" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(0); // dialogでブロック
  });
});

describe("マルチバイト文字 — キャラID", () => {
  it("日本語キャラIDでchara系コマンドが動作", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "chara", id: "凛", position: "center", expression: "neutral" },
      { type: "chara_mod", id: "凛", expression: "smile", anim: "bounce" },
      { type: "chara_hide", id: "凛" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    const result = processCommand(script, 0, dispatch, {});
    expect(result.index).toBe(3);
    expect(dispatch).toHaveBeenCalledTimes(3);

    const charaCall = dispatch.mock.calls[0][0];
    expect(charaCall.payload.id).toBe("凛");
    const modCall = dispatch.mock.calls[1][0];
    expect(modCall.payload.id).toBe("凛");
    expect(modCall.payload.anim).toBe("bounce");
  });
});

describe("マルチバイト文字 — 背景・BGM・SE", () => {
  it("日本語背景キーでbgコマンドが動作", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "bg", src: "教室_夕方", transition: "fade" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    processCommand(script, 0, dispatch, {});
    const bgCall = dispatch.mock.calls[0][0];
    expect(bgCall.payload.src).toBe("教室_夕方");
  });

  it("日本語BGM名でbgmコマンドが動作", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "bgm", name: "昼下がり" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    processCommand(script, 0, dispatch, {});
    const bgmCall = dispatch.mock.calls[0][0];
    expect(bgmCall.payload.name).toBe("昼下がり");
  });

  it("日本語SE名でseコマンドが動作", () => {
    const dispatch = vi.fn();
    const script = [
      { type: "se", name: "決定音" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    processCommand(script, 0, dispatch, {});
    const seCall = dispatch.mock.calls[0][0];
    expect(seCall.payload.name).toBe("決定音");
  });
});

describe("マルチバイト文字 — ラベルマップ", () => {
  it("混在ラベル（半角+全角）で正しくマップ構築", () => {
    const script = [
      { type: "label", name: "prologue" },
      { type: "dialog", speaker: "", text: "a" },
      { type: "label", name: "第1章_開始" },
      { type: "dialog", speaker: "", text: "b" },
      { type: "label", name: "BAD_END_1" },
      { type: "dialog", speaker: "", text: "c" },
      { type: "label", name: "エンディング〜真実〜" },
    ];
    const map = buildLabelMap(script);
    expect(map["prologue"]).toBe(0);
    expect(map["第1章_開始"]).toBe(2);
    expect(map["BAD_END_1"]).toBe(4);
    expect(map["エンディング〜真実〜"]).toBe(6);
  });

  it("重複する日本語ラベルで警告", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const script = [
      { type: "label", name: "開始" },
      { type: "label", name: "開始" },
    ];
    buildLabelMap(script);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("日本語ラベルへのresolveTarget", async () => {
    const { resolveTarget } = await import("../engine/commands");
    const labelMap = { "エンディング": 10, "バッドエンド": 20 };
    expect(resolveTarget("エンディング", labelMap)).toBe(10);
    expect(resolveTarget("バッドエンド", labelMap)).toBe(20);
  });
});

describe("マルチバイト文字 — 展開後のシーン間ジャンプ", () => {
  it("日本語シーン名がラベルとして機能しジャンプできる", () => {
    const script = [
      { type: "scene", sceneId: "sc_a" },
      { type: "jump", target: "第2話：出会い" },
      { type: "scene", sceneId: "sc_b" },
    ];
    const scenes = [
      { id: "sc_a", name: "第1話：始まり", commands: [
        { type: "dialog", speaker: "", text: "1話" },
      ]},
      { id: "sc_b", name: "第2話：出会い", commands: [
        { type: "dialog", speaker: "", text: "2話" },
      ]},
    ];
    const expanded = expandScenes(script, scenes);
    const labelMap = buildLabelMap(expanded);

    // "第2話：出会い" ラベルが存在し、ジャンプ可能
    expect(labelMap["第2話：出会い"]).toBeDefined();

    const dispatch = vi.fn();
    // jumpコマンドのインデックスを探す
    const jumpIdx = expanded.findIndex(c => c.type === "jump");
    const result = processCommand(expanded, jumpIdx, dispatch, labelMap);
    // ジャンプ先（第2話ラベルの次のdialog）に到達
    const targetIdx = labelMap["第2話：出会い"];
    expect(result.index).toBe(targetIdx + 1); // label の次の dialog
  });
});
