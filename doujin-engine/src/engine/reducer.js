import { ACTION, createEmptySaves } from "./constants";

export const initialState = {
  scriptIndex: 0,
  displayedText: "",
  isTyping: false,
  currentSpeaker: "",
  currentBg: "school_gate",
  prevBg: null,
  bgTransition: false,
  bgTransitionType: "fade",
  bgTransitionTime: 800,
  characters: {},
  showChoice: false,
  choiceOptions: [],
  backlog: [],
  showBacklog: false,
  showConfig: false,
  showSaveLoad: false,
  saveLoadMode: "save",
  saves: createEmptySaves(),
  textSpeed: 40,
  autoMode: false,
  autoDelay: 2500,
  bgmPlaying: null,
  lastSE: null,
  // wait
  isWaiting: false,
  // エフェクト
  activeEffect: null,
  screenOverlay: null,
  // 音量
  volumeMaster: 1.0,
  volumeBGM: 0.8,
  volumeSE: 1.0,
  // スキップ
  skipMode: false,
  ctrlPressed: false,
  // CG 表示
  showCG: null, // { id, src }
  // NVL モード
  nvlMode: false,
  nvlLog: [], // NVL モード用のテキスト蓄積
};

export function engineReducer(state, action) {
  switch (action.type) {
    case ACTION.SET_SCRIPT_INDEX:
      return { ...state, scriptIndex: action.payload };
    case ACTION.SET_DISPLAYED_TEXT:
      return { ...state, displayedText: action.payload };
    case ACTION.SET_TYPING:
      return { ...state, isTyping: action.payload };
    case ACTION.SET_SPEAKER:
      return { ...state, currentSpeaker: action.payload };
    case ACTION.SET_BG:
      return {
        ...state,
        prevBg: state.currentBg,
        currentBg: action.payload.src || action.payload,
        bgTransition: true,
        bgTransitionType: action.payload.transition || "fade",
        bgTransitionTime: action.payload.time || 800,
      };
    case ACTION.BG_TRANSITION_END:
      return { ...state, bgTransition: false, prevBg: null };
    case ACTION.SET_CHARA:
      return {
        ...state,
        characters: {
          ...state.characters,
          [action.payload.id]: { ...action.payload, animState: "entering" },
        },
      };
    case ACTION.MOD_CHARA:
      return {
        ...state,
        characters: {
          ...state.characters,
          [action.payload.id]: {
            ...state.characters[action.payload.id],
            ...action.payload,
            animState: "expression_change",
          },
        },
      };
    case ACTION.REMOVE_CHARA: {
      // exiting アニメへ移行
      if (!state.characters[action.payload]) {
        const c = { ...state.characters };
        delete c[action.payload];
        return { ...state, characters: c };
      }
      return {
        ...state,
        characters: {
          ...state.characters,
          [action.payload]: {
            ...state.characters[action.payload],
            animState: "exiting",
          },
        },
      };
    }
    case ACTION.REMOVE_CHARA_DONE: {
      const c = { ...state.characters };
      delete c[action.payload];
      return { ...state, characters: c };
    }
    case ACTION.CHARA_ANIM_DONE: {
      if (!state.characters[action.payload]) return state;
      return {
        ...state,
        characters: {
          ...state.characters,
          [action.payload]: {
            ...state.characters[action.payload],
            animState: "idle",
          },
        },
      };
    }
    case ACTION.SHOW_CHOICE:
      return { ...state, showChoice: true, choiceOptions: action.payload };
    case ACTION.HIDE_CHOICE:
      return { ...state, showChoice: false, choiceOptions: [] };
    case ACTION.ADD_BACKLOG:
      return { ...state, backlog: [...state.backlog, action.payload] };
    case ACTION.TOGGLE_BACKLOG:
      return { ...state, showBacklog: !state.showBacklog, showConfig: false, showSaveLoad: false };
    case ACTION.TOGGLE_CONFIG:
      return { ...state, showConfig: !state.showConfig, showBacklog: false, showSaveLoad: false };
    case ACTION.SHOW_SAVELOAD:
      return { ...state, showSaveLoad: true, saveLoadMode: action.payload, showBacklog: false, showConfig: false };
    case ACTION.HIDE_SAVELOAD:
      return { ...state, showSaveLoad: false };
    case ACTION.SET_TEXT_SPEED:
      return { ...state, textSpeed: action.payload };
    case ACTION.TOGGLE_AUTO:
      return { ...state, autoMode: !state.autoMode };
    case ACTION.SET_BGM:
      return { ...state, bgmPlaying: action.payload };
    case ACTION.SET_SE:
      return { ...state, lastSE: action.payload };
    case ACTION.SAVE_GAME: {
      const newSaves = [...state.saves];
      newSaves[action.payload.slot] = {
        scriptIndex: state.scriptIndex,
        currentBg: state.currentBg,
        characters: { ...state.characters },
        backlog: [...state.backlog],
        bgmPlaying: state.bgmPlaying,
        date: new Date().toLocaleString("ja-JP"),
        speaker: state.currentSpeaker,
        text: state.displayedText,
        thumbnail: action.payload.thumbnail || null,
      };
      return { ...state, saves: newSaves };
    }
    case ACTION.LOAD_GAME: {
      // 永続化データがある場合は action.payload.data を使用
      const save = action.payload.data || state.saves[action.payload.slot];
      if (!save) return state;
      return {
        ...state,
        scriptIndex: save.scriptIndex,
        currentBg: save.currentBg,
        characters: save.characters || {},
        backlog: save.backlog || [],
        bgmPlaying: save.bgmPlaying || null,
        displayedText: save.text || "",
        currentSpeaker: save.speaker || "",
        isTyping: false,
        showChoice: false,
        showSaveLoad: false,
        showBacklog: false,
        showConfig: false,
      };
    }
    case ACTION.SET_SAVES:
      return { ...state, saves: action.payload };
    case ACTION.CLOSE_ALL_UI:
      return { ...state, showBacklog: false, showConfig: false, showSaveLoad: false };
    // wait
    case ACTION.START_WAIT:
      return { ...state, isWaiting: true };
    case ACTION.END_WAIT:
      return { ...state, isWaiting: false };
    // エフェクト
    case ACTION.START_EFFECT:
      return { ...state, activeEffect: action.payload };
    case ACTION.EFFECT_END:
      // fadeout / whitefade はオーバーレイを維持
      if (state.activeEffect?.name === "fadeout" || state.activeEffect?.name === "whitefade") {
        return {
          ...state,
          activeEffect: null,
          screenOverlay: { color: state.activeEffect.color || "#000", opacity: 1 },
        };
      }
      // fadein はオーバーレイ解除
      if (state.activeEffect?.name === "fadein") {
        return { ...state, activeEffect: null, screenOverlay: null };
      }
      return { ...state, activeEffect: null };
    // BGM 停止
    case ACTION.STOP_BGM:
      return { ...state, bgmPlaying: null };
    // 音量
    case ACTION.SET_VOLUME_MASTER:
      return { ...state, volumeMaster: action.payload };
    case ACTION.SET_VOLUME_BGM:
      return { ...state, volumeBGM: action.payload };
    case ACTION.SET_VOLUME_SE:
      return { ...state, volumeSE: action.payload };
    // スキップ
    case ACTION.SET_SKIP_MODE:
      return { ...state, skipMode: action.payload, autoMode: action.payload ? false : state.autoMode };
    case ACTION.SET_CTRL_PRESSED:
      return { ...state, ctrlPressed: action.payload };
    // CG 表示
    case ACTION.SHOW_CG:
      return { ...state, showCG: action.payload };
    case ACTION.HIDE_CG:
      return { ...state, showCG: null };
    // NVL モード
    case ACTION.SET_NVL_MODE:
      return { ...state, nvlMode: action.payload, nvlLog: action.payload ? [] : state.nvlLog };
    case ACTION.ADD_NVL_TEXT:
      return { ...state, nvlLog: [...state.nvlLog, action.payload] };
    case ACTION.CLEAR_NVL:
      return { ...state, nvlLog: [] };
    default:
      return state;
  }
}
