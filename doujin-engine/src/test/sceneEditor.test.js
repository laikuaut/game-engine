import { describe, it, expect } from "vitest";
import { CMD } from "../engine/constants";

// シーン分割ロジックのテスト（SceneEditor のインポートから分離したロジック）

// labelでスクリプトをシーンに分割するロジック
function splitScriptToScenes(script) {
  const scenes = [];
  let current = { commands: [] };
  let sceneName = "オープニング";

  for (const cmd of script) {
    if (cmd.type === CMD.LABEL) {
      if (current.commands.length > 0) {
        scenes.push({ name: sceneName, commands: current.commands });
      }
      sceneName = cmd.name || `シーン ${scenes.length + 1}`;
      current = { commands: [] };
    } else {
      current.commands.push(cmd);
    }
  }
  if (current.commands.length > 0) {
    scenes.push({ name: sceneName, commands: current.commands });
  }
  return scenes;
}

// シーンをスクリプトに結合するロジック
function buildScriptFromScenes(scenes, order) {
  const result = [];
  for (const id of order) {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) continue;
    result.push({ type: CMD.LABEL, name: scene.name });
    result.push(...scene.commands);
  }
  return result;
}

describe("シーン分割ロジック", () => {
  it("label がないスクリプトは 1 シーンになる", () => {
    const script = [
      { type: "dialog", speaker: "", text: "Hello" },
      { type: "dialog", speaker: "", text: "World" },
    ];
    const scenes = splitScriptToScenes(script);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].name).toBe("オープニング");
    expect(scenes[0].commands).toHaveLength(2);
  });

  it("label でシーンが分割される", () => {
    const script = [
      { type: "dialog", speaker: "", text: "プロローグ" },
      { type: "label", name: "chapter1" },
      { type: "dialog", speaker: "", text: "第1章" },
      { type: "label", name: "chapter2" },
      { type: "dialog", speaker: "", text: "第2章" },
    ];
    const scenes = splitScriptToScenes(script);
    expect(scenes).toHaveLength(3);
    expect(scenes[0].name).toBe("オープニング");
    expect(scenes[0].commands).toHaveLength(1);
    expect(scenes[1].name).toBe("chapter1");
    expect(scenes[1].commands).toHaveLength(1);
    expect(scenes[2].name).toBe("chapter2");
    expect(scenes[2].commands).toHaveLength(1);
  });

  it("先頭が label の場合、オープニングは空でスキップ", () => {
    const script = [
      { type: "label", name: "start" },
      { type: "dialog", speaker: "", text: "最初" },
    ];
    const scenes = splitScriptToScenes(script);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].name).toBe("start");
  });

  it("連続する label の間に空シーンは生成されない", () => {
    const script = [
      { type: "label", name: "a" },
      { type: "label", name: "b" },
      { type: "dialog", speaker: "", text: "test" },
    ];
    const scenes = splitScriptToScenes(script);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].name).toBe("b");
  });

  it("空スクリプトは 0 シーン", () => {
    expect(splitScriptToScenes([])).toHaveLength(0);
  });
});

describe("シーン結合ロジック", () => {
  const scenes = [
    { id: "s1", name: "プロローグ", commands: [{ type: "dialog", speaker: "", text: "始まり" }] },
    { id: "s2", name: "第1章", commands: [{ type: "dialog", speaker: "", text: "展開" }] },
    { id: "s3", name: "エンディング", commands: [{ type: "dialog", speaker: "", text: "終わり" }] },
  ];

  it("order 順にシーンが結合される", () => {
    const result = buildScriptFromScenes(scenes, ["s1", "s2", "s3"]);
    expect(result).toHaveLength(6); // 3 labels + 3 dialogs
    expect(result[0]).toEqual({ type: CMD.LABEL, name: "プロローグ" });
    expect(result[1].text).toBe("始まり");
    expect(result[2]).toEqual({ type: CMD.LABEL, name: "第1章" });
  });

  it("order を入れ替えるとスクリプトの順序も変わる", () => {
    const result = buildScriptFromScenes(scenes, ["s3", "s1"]);
    expect(result).toHaveLength(4);
    expect(result[0].name).toBe("エンディング");
    expect(result[2].name).toBe("プロローグ");
  });

  it("order に存在しない id はスキップ", () => {
    const result = buildScriptFromScenes(scenes, ["s1", "unknown", "s3"]);
    expect(result).toHaveLength(4);
  });

  it("空の order は空のスクリプト", () => {
    expect(buildScriptFromScenes(scenes, [])).toHaveLength(0);
  });
});
