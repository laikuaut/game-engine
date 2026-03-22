import { describe, it, expect } from "vitest";
import { expandScenes, buildLabelMap } from "../engine/commands";
import { CMD } from "../engine/constants";

// シナリオデータの整合性を検証するユーティリティ
function validateScript(script, scenes, options = {}) {
  const errors = [];
  const { characters = {}, bgStyles = {}, bgmCatalog = [], seCatalog = [], cgCatalog = [] } = options;

  // シーン展開
  const expanded = expandScenes(script, scenes);
  const labelMap = buildLabelMap(expanded);

  // シーン参照チェック
  const sceneMap = {};
  (scenes || []).forEach(s => { sceneMap[s.id] = s; });
  script.forEach((cmd, i) => {
    if (cmd.type === CMD.SCENE && !sceneMap[cmd.sceneId]) {
      errors.push(`script[${i}]: 未定義のシーン "${cmd.sceneId}"`);
    }
  });

  // 展開後のチェック
  let nvlDepth = 0;
  expanded.forEach((cmd, i) => {
    // NVL対応チェック
    if (cmd.type === CMD.NVL_ON) nvlDepth++;
    if (cmd.type === CMD.NVL_OFF) nvlDepth--;
    if (nvlDepth < 0) errors.push(`expanded[${i}]: nvl_off が nvl_on より多い`);
    if (nvlDepth > 1) errors.push(`expanded[${i}]: nvl_on がネストしている`);

    // jump/choice のラベル参照チェック
    if (cmd.type === CMD.JUMP && typeof cmd.target === "string") {
      if (labelMap[cmd.target] === undefined) {
        errors.push(`expanded[${i}]: jump先ラベル "${cmd.target}" が未定義`);
      }
    }
    if (cmd.type === CMD.CHOICE) {
      (cmd.options || []).forEach((opt, oi) => {
        if (typeof opt.jump === "string" && labelMap[opt.jump] === undefined) {
          errors.push(`expanded[${i}]: choice[${oi}] "${opt.text}" のジャンプ先 "${opt.jump}" が未定義`);
        }
      });
    }

    // キャラ参照チェック
    if ((cmd.type === CMD.CHARA || cmd.type === CMD.CHARA_MOD || cmd.type === CMD.CHARA_HIDE) && cmd.id) {
      if (Object.keys(characters).length > 0 && !characters[cmd.id]) {
        errors.push(`expanded[${i}]: 未定義キャラ "${cmd.id}"`);
      }
    }

    // 背景参照チェック
    if (cmd.type === CMD.BG && cmd.src) {
      if (Object.keys(bgStyles).length > 0 && !bgStyles[cmd.src]) {
        errors.push(`expanded[${i}]: 未定義背景 "${cmd.src}"`);
      }
    }

    // BGM参照チェック
    if (cmd.type === CMD.BGM && cmd.name) {
      if (bgmCatalog.length > 0 && !bgmCatalog.find(b => b.name === cmd.name)) {
        errors.push(`expanded[${i}]: 未定義BGM "${cmd.name}"`);
      }
    }

    // SE参照チェック
    if (cmd.type === CMD.SE && cmd.name) {
      if (seCatalog.length > 0 && !seCatalog.find(s => s.name === cmd.name)) {
        errors.push(`expanded[${i}]: 未定義SE "${cmd.name}"`);
      }
    }
  });

  // NVL閉じ忘れチェック
  if (nvlDepth !== 0) errors.push(`nvl_on/nvl_off の対応が取れていない (depth=${nvlDepth})`);

  // fadeout 後の fadein チェック（END直前を除く）
  for (let i = 0; i < expanded.length; i++) {
    if (expanded[i].type === CMD.EFFECT && expanded[i].name === "fadeout") {
      // 以降で fadein があるか探す（次のdialog/choiceが来る前に）
      let foundFadein = false;
      let isEnd = true;
      for (let j = i + 1; j < expanded.length; j++) {
        if (expanded[j].type === CMD.EFFECT && expanded[j].name === "fadein") {
          foundFadein = true;
          break;
        }
        if (expanded[j].type === CMD.DIALOG || expanded[j].type === CMD.CHOICE) {
          isEnd = false;
          break;
        }
      }
      // 末尾到達 = END直前 → fadein不要
      if (!foundFadein && !isEnd) {
        errors.push(`expanded[${i}]: fadeout の後に fadein がない`);
      }
    }
  }

  return errors;
}

describe("scriptValidation", () => {
  it("正常なスクリプトでエラーなし", () => {
    const script = [
      { type: "scene", sceneId: "sc_a" },
      { type: "jump", target: "script_end" },
      { type: "label", name: "script_end" },
    ];
    const scenes = [{
      id: "sc_a", name: "A",
      commands: [
        { type: "bg", src: "classroom" },
        { type: "dialog", speaker: "", text: "hello" },
      ],
    }];
    const errors = validateScript(script, scenes, {
      bgStyles: { classroom: {} },
    });
    expect(errors).toEqual([]);
  });

  it("未定義シーン参照を検出", () => {
    const script = [{ type: "scene", sceneId: "nonexistent" }];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("未定義のシーン"))).toBe(true);
  });

  it("未定義ジャンプ先ラベルを検出", () => {
    const script = [
      { type: "jump", target: "undefined_label" },
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("jump先ラベル"))).toBe(true);
  });

  it("choice の未定義ジャンプ先を検出", () => {
    const script = [
      { type: "choice", options: [
        { text: "A", jump: "route_a" },
        { text: "B", jump: "route_b" },
      ]},
      { type: "label", name: "route_a" },
      { type: "dialog", speaker: "", text: "a" },
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("route_b"))).toBe(true);
    expect(errors.some(e => e.includes("route_a"))).toBe(false);
  });

  it("nvl_on/off の不対応を検出", () => {
    const script = [
      { type: "nvl_on" },
      { type: "dialog", speaker: "", text: "hello" },
      // nvl_off がない
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("nvl_on/nvl_off"))).toBe(true);
  });

  it("nvl_off が多すぎる場合を検出", () => {
    const script = [
      { type: "nvl_off" },
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("nvl_off が nvl_on より多い"))).toBe(true);
  });

  it("未定義キャラを検出", () => {
    const script = [
      { type: "chara", id: "ghost", position: "center", expression: "neutral" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    const errors = validateScript(script, [], {
      characters: { rin: { name: "凛" } },
    });
    expect(errors.some(e => e.includes('未定義キャラ "ghost"'))).toBe(true);
  });

  it("未定義背景を検出", () => {
    const script = [
      { type: "bg", src: "unknown_bg" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    const errors = validateScript(script, [], {
      bgStyles: { classroom: {} },
    });
    expect(errors.some(e => e.includes('未定義背景 "unknown_bg"'))).toBe(true);
  });

  it("未定義BGMを検出", () => {
    const script = [
      { type: "bgm", name: "unknown_bgm" },
      { type: "dialog", speaker: "", text: "end" },
    ];
    const errors = validateScript(script, [], {
      bgmCatalog: [{ name: "theme" }],
    });
    expect(errors.some(e => e.includes('未定義BGM "unknown_bgm"'))).toBe(true);
  });

  it("fadeout 後に fadein がない場合を検出", () => {
    const script = [
      { type: "effect", name: "fadeout", color: "#000", time: 1000 },
      { type: "dialog", speaker: "", text: "暗転中にテキスト" },
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("fadein がない"))).toBe(true);
  });

  it("END直前の fadeout は fadein 不要", () => {
    const script = [
      { type: "dialog", speaker: "", text: "END" },
      { type: "effect", name: "fadeout", color: "#000", time: 2000 },
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("fadein がない"))).toBe(false);
  });

  it("fadeout → wait → fadein は正常", () => {
    const script = [
      { type: "effect", name: "fadeout", color: "#000", time: 1000 },
      { type: "wait", time: 500 },
      { type: "effect", name: "fadein", time: 1000 },
      { type: "dialog", speaker: "", text: "復帰" },
    ];
    const errors = validateScript(script, []);
    expect(errors.some(e => e.includes("fadein がない"))).toBe(false);
  });
});
