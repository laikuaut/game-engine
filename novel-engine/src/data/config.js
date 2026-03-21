// 画面サイズ設定
export const SCREEN = {
  width: 1280,
  height: 720,
  minWidth: 960,
  minHeight: 540,
  aspectRatio: "16/9",
};

// ゲーム画面のコンテナスタイル（共通）
export const GAME_CONTAINER_STYLE = {
  width: "100%",
  maxWidth: SCREEN.width,
  aspectRatio: SCREEN.aspectRatio,
  position: "relative",
  overflow: "hidden",
  borderRadius: 4,
  boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
};

// === カラーパレット ===
export const COLORS = {
  // ゴールド系（メインテーマ）
  gold: "#E8D4B0",
  goldAccent: "#C8A870",
  goldDim: "rgba(200,180,140,0.5)",
  goldBorder: "rgba(200,180,140,0.3)",
  goldBorderLight: "rgba(200,180,140,0.15)",
  goldBg: "rgba(200,180,140,0.15)",
  goldBgSubtle: "rgba(200,180,140,0.08)",
  goldGlow: "rgba(200,180,140,0.3)",

  // テキスト
  textPrimary: "#E8E4DC",
  textSecondary: "#ccc",
  textMuted: "#aaa",
  textDim: "#888",
  textFaint: "#666",
  textDisabled: "#555",

  // 背景
  bgDarkest: "#0a0a14",
  bgDark: "#0f0f1a",
  bgBase: "#1a1a2e",
  bgLight: "#16213e",
  bgPanel: "#12121f",
  bgOverlay: "rgba(10,10,20,0.95)",
  bgSurface: "rgba(255,255,255,0.04)",
  bgSurfaceHover: "rgba(255,255,255,0.08)",
  bgWhiteFaint: "rgba(255,255,255,0.06)",
  bgWhiteBorder: "rgba(255,255,255,0.15)",
  bgWhiteBorderDim: "rgba(255,255,255,0.1)",

  // 機能色
  danger: "#EF5350",
  dangerBg: "rgba(239,83,80,0.08)",
  dangerBorder: "rgba(239,83,80,0.2)",
  success: "#8BC34A",
  warning: "#FFB74D",
  info: "#C8A870", // ゴールド統一
};

// === フォント ===
export const FONTS = {
  serif: "'Noto Serif JP', 'Yu Mincho', 'HGS明朝E', serif",
  mono: "monospace",
};

// === 共通ボタンスタイル ===
export const BTN = {
  // ベース（全ボタン共通）
  base: {
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: FONTS.serif,
    transition: "all 0.2s",
    border: "1px solid",
  },
  // プライマリ（ゴールド系）
  primary: {
    background: "rgba(200,180,140,0.15)",
    borderColor: "rgba(200,180,140,0.4)",
    color: "#E8D4B0",
  },
  // セカンダリ（ニュートラル）
  secondary: {
    background: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.15)",
    color: "#aaa",
  },
  // ゴーストボタン
  ghost: {
    background: "none",
    borderColor: "rgba(255,255,255,0.2)",
    color: "#aaa",
  },
  // 危険（削除等）
  danger: {
    background: "rgba(239,83,80,0.08)",
    borderColor: "rgba(239,83,80,0.2)",
    color: "#EF5350",
  },
  // サイズバリエーション
  sm: { padding: "3px 12px", fontSize: 11 },
  md: { padding: "6px 16px", fontSize: 13 },
  lg: { padding: "12px 24px", fontSize: 15 },
};

// 共通閉じるボタン
export const CLOSE_BTN_STYLE = {
  ...BTN.base,
  ...BTN.ghost,
  ...BTN.sm,
  padding: "4px 16px",
  fontSize: 12,
};

// 共通オーバーレイヘッダースタイル
export const OVERLAY_HEADER_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};

// 共通オーバーレイタイトル
export const OVERLAY_TITLE_STYLE = {
  color: COLORS.gold,
  fontSize: 18,
  letterSpacing: 3,
};

// === 設定の永続化 ===
const CONFIG_STORAGE_KEY = "doujin_engine_config";

export function loadPersistedConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function persistConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

// 背景スタイル定義
export const BG_STYLES = {
  school_gate: {
    background: "linear-gradient(170deg, #87CEEB 0%, #E0F0FF 40%, #98D8A0 60%, #5A8F3C 100%)",
  },
  classroom: {
    background: "linear-gradient(180deg, #F5E6D0 0%, #E8D5B8 30%, #C4956A 80%, #8B6914 100%)",
  },
  rooftop: {
    background: "linear-gradient(180deg, #4A90D9 0%, #87CEEB 40%, #B0C4DE 90%)",
  },
};
