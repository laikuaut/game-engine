import { BG_STYLES as DEFAULT_BG_STYLES } from "../data/config";

export default function Background({ currentBg, bgTransition, bgStyles }) {
  const styles = bgStyles || DEFAULT_BG_STYLES;
  const bgStyle = styles[currentBg] || Object.values(styles)[0] || {};

  return (
    <div
      style={{
        ...bgStyle,
        position: "absolute",
        inset: 0,
        zIndex: 0,
        transition: "all 0.8s ease-in-out",
        opacity: bgTransition ? 0.3 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          fontSize: 11,
          color: "rgba(255,255,255,0.35)",
          fontFamily: "monospace",
          letterSpacing: 1,
        }}
      >
        BG: {currentBg}
      </div>
    </div>
  );
}
