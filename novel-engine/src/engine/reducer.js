import { ACTION } from "./constants";

export const initialState = {
  scriptIndex: 0,
  displayedText: "",
  isTyping: false,
  currentSpeaker: "",
  currentBg: "school_gate",
  bgTransition: false,
  characters: {},
  showChoice: false,
  choiceOptions: [],
  backlog: [],
  showBacklog: false,
  showConfig: false,
  showSaveLoad: false,
  saveLoadMode: "save",
  saves: [null, null, null],
  textSpeed: 40,
  autoMode: false,
  autoDelay: 2500,
  bgmPlaying: null,
  lastSE: null,
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
      return { ...state, currentBg: action.payload, bgTransition: true };
    case ACTION.BG_TRANSITION_END:
      return { ...state, bgTransition: false };
    case ACTION.SET_CHARA:
      return { ...state, characters: { ...state.characters, [action.payload.id]: action.payload } };
    case ACTION.MOD_CHARA:
      return {
        ...state,
        characters: {
          ...state.characters,
          [action.payload.id]: { ...state.characters[action.payload.id], ...action.payload },
        },
      };
    case ACTION.REMOVE_CHARA: {
      const c = { ...state.characters };
      delete c[action.payload];
      return { ...state, characters: c };
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
      };
      return { ...state, saves: newSaves };
    }
    case ACTION.LOAD_GAME: {
      const save = state.saves[action.payload.slot];
      if (!save) return state;
      return {
        ...state,
        scriptIndex: save.scriptIndex,
        currentBg: save.currentBg,
        characters: save.characters,
        backlog: save.backlog,
        bgmPlaying: save.bgmPlaying,
        displayedText: save.text || "",
        currentSpeaker: save.speaker || "",
        isTyping: false,
        showChoice: false,
        showSaveLoad: false,
        showBacklog: false,
        showConfig: false,
      };
    }
    case ACTION.CLOSE_ALL_UI:
      return { ...state, showBacklog: false, showConfig: false, showSaveLoad: false };
    default:
      return state;
  }
}
