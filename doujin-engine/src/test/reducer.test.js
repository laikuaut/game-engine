import { describe, it, expect } from "vitest";
import { engineReducer, initialState } from "../engine/reducer";
import { ACTION } from "../engine/constants";

describe("engineReducer", () => {
  it("初期状態が正しい", () => {
    expect(initialState.scriptIndex).toBe(0);
    expect(initialState.isTyping).toBe(false);
    expect(initialState.characters).toEqual({});
    expect(initialState.skipMode).toBe(false);
    expect(initialState.nvlMode).toBe(false);
  });

  it("SET_SCRIPT_INDEX", () => {
    const s = engineReducer(initialState, { type: ACTION.SET_SCRIPT_INDEX, payload: 5 });
    expect(s.scriptIndex).toBe(5);
  });

  it("SET_BG でトランジション開始", () => {
    const s = engineReducer(initialState, {
      type: ACTION.SET_BG,
      payload: { src: "rooftop", transition: "crossfade", time: 1200 },
    });
    expect(s.currentBg).toBe("rooftop");
    expect(s.prevBg).toBe("school_gate");
    expect(s.bgTransition).toBe(true);
    expect(s.bgTransitionType).toBe("crossfade");
    expect(s.bgTransitionTime).toBe(1200);
  });

  it("BG_TRANSITION_END で完了", () => {
    let s = engineReducer(initialState, { type: ACTION.SET_BG, payload: { src: "r" } });
    s = engineReducer(s, { type: ACTION.BG_TRANSITION_END });
    expect(s.bgTransition).toBe(false);
    expect(s.prevBg).toBe(null);
  });

  it("SET_CHARA で entering アニメ付き追加", () => {
    const s = engineReducer(initialState, {
      type: ACTION.SET_CHARA,
      payload: { id: "sakura", position: "center", expression: "smile" },
    });
    expect(s.characters.sakura.animState).toBe("entering");
  });

  it("MOD_CHARA で expression_change", () => {
    let s = engineReducer(initialState, {
      type: ACTION.SET_CHARA, payload: { id: "sakura", position: "center", expression: "smile" },
    });
    s = engineReducer(s, { type: ACTION.MOD_CHARA, payload: { id: "sakura", expression: "sad" } });
    expect(s.characters.sakura.expression).toBe("sad");
    expect(s.characters.sakura.animState).toBe("expression_change");
  });

  it("REMOVE_CHARA -> exiting -> REMOVE_CHARA_DONE", () => {
    let s = engineReducer(initialState, {
      type: ACTION.SET_CHARA, payload: { id: "sakura", position: "center", expression: "smile" },
    });
    s = engineReducer(s, { type: ACTION.REMOVE_CHARA, payload: "sakura" });
    expect(s.characters.sakura.animState).toBe("exiting");
    s = engineReducer(s, { type: ACTION.REMOVE_CHARA_DONE, payload: "sakura" });
    expect(s.characters.sakura).toBeUndefined();
  });

  it("SHOW_CHOICE / HIDE_CHOICE", () => {
    const opts = [{ text: "A", jump: 0 }];
    let s = engineReducer(initialState, { type: ACTION.SHOW_CHOICE, payload: opts });
    expect(s.showChoice).toBe(true);
    s = engineReducer(s, { type: ACTION.HIDE_CHOICE });
    expect(s.showChoice).toBe(false);
  });

  it("SET_SKIP_MODE で AUTO 解除", () => {
    let s = engineReducer(initialState, { type: ACTION.TOGGLE_AUTO });
    expect(s.autoMode).toBe(true);
    s = engineReducer(s, { type: ACTION.SET_SKIP_MODE, payload: true });
    expect(s.skipMode).toBe(true);
    expect(s.autoMode).toBe(false);
  });

  it("音量設定", () => {
    let s = engineReducer(initialState, { type: ACTION.SET_VOLUME_MASTER, payload: 0.5 });
    expect(s.volumeMaster).toBe(0.5);
    s = engineReducer(s, { type: ACTION.SET_VOLUME_BGM, payload: 0.3 });
    expect(s.volumeBGM).toBe(0.3);
  });

  it("BGM / SE / STOP_BGM", () => {
    // SET_BGM は文字列でもオブジェクトでも { name } 形式に正規化される
    let s = engineReducer(initialState, { type: ACTION.SET_BGM, payload: "theme" });
    expect(s.bgmPlaying).toEqual({ name: "theme" });
    s = engineReducer(s, { type: ACTION.SET_BGM, payload: { name: "battle", volume: 0.5 } });
    expect(s.bgmPlaying).toEqual({ name: "battle", volume: 0.5 });
    s = engineReducer(s, { type: ACTION.STOP_BGM });
    expect(s.bgmPlaying).toBe(null);
  });

  it("START_WAIT / END_WAIT", () => {
    let s = engineReducer(initialState, { type: ACTION.START_WAIT });
    expect(s.isWaiting).toBe(true);
    s = engineReducer(s, { type: ACTION.END_WAIT });
    expect(s.isWaiting).toBe(false);
  });

  it("エフェクト: fadeout でオーバーレイ維持", () => {
    let s = engineReducer(initialState, {
      type: ACTION.START_EFFECT, payload: { name: "fadeout", color: "#000", time: 1000 },
    });
    s = engineReducer(s, { type: ACTION.EFFECT_END });
    expect(s.activeEffect).toBe(null);
    expect(s.screenOverlay).toEqual({ color: "#000", opacity: 1 });
  });

  it("エフェクト: fadein でオーバーレイ解除", () => {
    let s = { ...initialState, screenOverlay: { color: "#000", opacity: 1 } };
    s = engineReducer(s, { type: ACTION.START_EFFECT, payload: { name: "fadein", time: 1000 } });
    s = engineReducer(s, { type: ACTION.EFFECT_END });
    expect(s.screenOverlay).toBe(null);
  });

  it("NVL モード", () => {
    let s = engineReducer(initialState, { type: ACTION.SET_NVL_MODE, payload: true });
    expect(s.nvlMode).toBe(true);
    s = engineReducer(s, { type: ACTION.ADD_NVL_TEXT, payload: { speaker: "", text: "test" } });
    expect(s.nvlLog).toHaveLength(1);
    s = engineReducer(s, { type: ACTION.CLEAR_NVL });
    expect(s.nvlLog).toEqual([]);
  });

  it("CG 表示 / 非表示", () => {
    let s = engineReducer(initialState, { type: ACTION.SHOW_CG, payload: { id: "ev01", src: "cg/ev01.png" } });
    expect(s.showCG.id).toBe("ev01");
    s = engineReducer(s, { type: ACTION.HIDE_CG });
    expect(s.showCG).toBe(null);
  });

  it("SAVE_GAME / LOAD_GAME", () => {
    let s = { ...initialState, scriptIndex: 5, displayedText: "test", currentSpeaker: "桜" };
    s = engineReducer(s, { type: ACTION.SAVE_GAME, payload: { slot: 0 } });
    expect(s.saves[0].scriptIndex).toBe(5);
    s = engineReducer({ ...initialState, saves: s.saves }, { type: ACTION.LOAD_GAME, payload: { slot: 0 } });
    expect(s.scriptIndex).toBe(5);
  });

  it("SET_SAVES", () => {
    const slots = [{ date: "test" }, null, null];
    const s = engineReducer(initialState, { type: ACTION.SET_SAVES, payload: slots });
    expect(s.saves).toEqual(slots);
  });

  it("未知のアクションで状態不変", () => {
    const s = engineReducer(initialState, { type: "UNKNOWN" });
    expect(s).toEqual(initialState);
  });

  // フラグ・変数・アイテム
  describe("SET_FLAG", () => {
    it("key/value を設定する", () => {
      const s = engineReducer(initialState, {
        type: ACTION.SET_FLAG,
        payload: { key: "talked", value: true },
      });
      expect(s.flags.talked).toBe(true);
    });

    it("既存フラグを上書きする", () => {
      const prev = { ...initialState, flags: { talked: true } };
      const s = engineReducer(prev, {
        type: ACTION.SET_FLAG,
        payload: { key: "talked", value: false },
      });
      expect(s.flags.talked).toBe(false);
    });
  });

  describe("SET_VARIABLE", () => {
    it("= 演算子で値を設定", () => {
      const s = engineReducer(initialState, {
        type: ACTION.SET_VARIABLE,
        payload: { key: "score", value: 100, operator: "=" },
      });
      expect(s.variables.score).toBe(100);
    });

    it("+= 演算子で加算", () => {
      const prev = { ...initialState, variables: { score: 10 } };
      const s = engineReducer(prev, {
        type: ACTION.SET_VARIABLE,
        payload: { key: "score", value: 5, operator: "+=" },
      });
      expect(s.variables.score).toBe(15);
    });

    it("-= 演算子で減算", () => {
      const prev = { ...initialState, variables: { hp: 100 } };
      const s = engineReducer(prev, {
        type: ACTION.SET_VARIABLE,
        payload: { key: "hp", value: 30, operator: "-=" },
      });
      expect(s.variables.hp).toBe(70);
    });

    it("*= 演算子で乗算", () => {
      const prev = { ...initialState, variables: { dmg: 10 } };
      const s = engineReducer(prev, {
        type: ACTION.SET_VARIABLE,
        payload: { key: "dmg", value: 3, operator: "*=" },
      });
      expect(s.variables.dmg).toBe(30);
    });

    it("未定義変数は 0 として演算", () => {
      const s = engineReducer(initialState, {
        type: ACTION.SET_VARIABLE,
        payload: { key: "newVar", value: 5, operator: "+=" },
      });
      expect(s.variables.newVar).toBe(5);
    });
  });

  describe("ADD_ITEM", () => {
    it("新規アイテムを追加する", () => {
      const s = engineReducer(initialState, {
        type: ACTION.ADD_ITEM,
        payload: { id: "potion", amount: 3 },
      });
      expect(s.items.potion).toBe(3);
    });

    it("既存アイテムに加算する", () => {
      const prev = { ...initialState, items: { potion: 2 } };
      const s = engineReducer(prev, {
        type: ACTION.ADD_ITEM,
        payload: { id: "potion", amount: 5 },
      });
      expect(s.items.potion).toBe(7);
    });

    it("amount 省略時は 1 を加算", () => {
      const s = engineReducer(initialState, {
        type: ACTION.ADD_ITEM,
        payload: { id: "key" },
      });
      expect(s.items.key).toBe(1);
    });
  });

  describe("REMOVE_ITEM", () => {
    it("アイテムを減算する", () => {
      const prev = { ...initialState, items: { potion: 5 } };
      const s = engineReducer(prev, {
        type: ACTION.REMOVE_ITEM,
        payload: { id: "potion", amount: 2 },
      });
      expect(s.items.potion).toBe(3);
    });

    it("0 以下になったら削除する", () => {
      const prev = { ...initialState, items: { potion: 1 } };
      const s = engineReducer(prev, {
        type: ACTION.REMOVE_ITEM,
        payload: { id: "potion", amount: 1 },
      });
      expect(s.items.potion).toBeUndefined();
    });

    it("残数がマイナスになっても削除する", () => {
      const prev = { ...initialState, items: { potion: 1 } };
      const s = engineReducer(prev, {
        type: ACTION.REMOVE_ITEM,
        payload: { id: "potion", amount: 5 },
      });
      expect(s.items.potion).toBeUndefined();
    });
  });

  describe("SAVE_GAME に flags/variables/items/choiceHistory が含まれる", () => {
    it("セーブデータに全フィールドが保存される", () => {
      const prev = {
        ...initialState,
        scriptIndex: 10,
        flags: { talked: true },
        variables: { score: 50 },
        items: { potion: 3 },
        choiceHistory: [{ label: "q1", choice: "A" }],
      };
      const s = engineReducer(prev, { type: ACTION.SAVE_GAME, payload: { slot: 0 } });
      const save = s.saves[0];
      expect(save.flags).toEqual({ talked: true });
      expect(save.variables).toEqual({ score: 50 });
      expect(save.items).toEqual({ potion: 3 });
      expect(save.choiceHistory).toEqual([{ label: "q1", choice: "A" }]);
    });
  });

  describe("LOAD_GAME に flags/variables/items/choiceHistory が復元される", () => {
    it("セーブデータから全フィールドが復元される", () => {
      const saves = [...initialState.saves];
      saves[0] = {
        scriptIndex: 10,
        currentBg: "forest",
        flags: { talked: true },
        variables: { score: 50 },
        items: { potion: 3 },
        choiceHistory: [{ label: "q1", choice: "A" }],
      };
      const s = engineReducer(
        { ...initialState, saves },
        { type: ACTION.LOAD_GAME, payload: { slot: 0 } }
      );
      expect(s.flags).toEqual({ talked: true });
      expect(s.variables).toEqual({ score: 50 });
      expect(s.items).toEqual({ potion: 3 });
      expect(s.choiceHistory).toEqual([{ label: "q1", choice: "A" }]);
    });

    it("後方互換: 古いセーブに flags 等がない場合は空オブジェクトになる", () => {
      const saves = [...initialState.saves];
      saves[0] = {
        scriptIndex: 5,
        currentBg: "school",
        // flags, variables, items, choiceHistory は無し
      };
      const s = engineReducer(
        { ...initialState, saves },
        { type: ACTION.LOAD_GAME, payload: { slot: 0 } }
      );
      expect(s.flags).toEqual({});
      expect(s.variables).toEqual({});
      expect(s.items).toEqual({});
      expect(s.choiceHistory).toEqual([]);
    });
  });
});
