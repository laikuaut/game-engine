import { describe, it, expect } from "vitest";
import { CMD, ACTION } from "../engine/constants";

describe("constants", () => {
  it("全 CMD が定義されている", () => {
    const expected = [
      "BG", "BGM", "BGM_STOP", "SE",
      "CHARA", "CHARA_MOD", "CHARA_HIDE",
      "DIALOG", "CHOICE", "EFFECT",
      "WAIT", "JUMP", "LABEL",
      "CG", "NVL_ON", "NVL_OFF", "NVL_CLEAR",
    ];
    expected.forEach((key) => {
      expect(CMD[key]).toBeDefined();
    });
  });

  it("全 ACTION が定義されている", () => {
    const expected = [
      "SET_SCRIPT_INDEX", "SET_DISPLAYED_TEXT", "SET_TYPING", "SET_SPEAKER",
      "SET_BG", "BG_TRANSITION_END",
      "SET_CHARA", "MOD_CHARA", "REMOVE_CHARA",
      "SHOW_CHOICE", "HIDE_CHOICE",
      "ADD_BACKLOG", "TOGGLE_BACKLOG", "TOGGLE_CONFIG",
      "SHOW_SAVELOAD", "HIDE_SAVELOAD",
      "SET_TEXT_SPEED", "TOGGLE_AUTO",
      "SET_BGM", "SET_SE", "STOP_BGM",
      "SAVE_GAME", "LOAD_GAME", "CLOSE_ALL_UI",
      "START_WAIT", "END_WAIT",
      "START_EFFECT", "EFFECT_END",
      "SET_VOLUME_MASTER", "SET_VOLUME_BGM", "SET_VOLUME_SE",
      "SET_SKIP_MODE", "SET_CTRL_PRESSED",
      "REMOVE_CHARA_DONE", "CHARA_ANIM_DONE",
      "SHOW_CG", "HIDE_CG",
      "SET_NVL_MODE", "ADD_NVL_TEXT", "CLEAR_NVL",
      "SET_SAVES",
    ];
    expected.forEach((key) => {
      expect(ACTION[key]).toBeDefined();
      expect(typeof ACTION[key]).toBe("string");
    });
  });

  it("CMD と ACTION の値に重複がない", () => {
    const cmdValues = Object.values(CMD);
    const actionValues = Object.values(ACTION);
    const allValues = [...cmdValues, ...actionValues];
    const unique = new Set(allValues);
    expect(unique.size).toBe(allValues.length);
  });
});
