import { useState } from "react";
import { GAME_CONTAINER_STYLE } from "../data/config";

// タイトル画面 — NEW GAME / CONTINUE / CG GALLERY / CONFIG / EXIT
export default function TitleScreen({
  title, onNewGame, onContinue,
  onCGGallery, onSceneRecollection, onConfig,
  onExit, hasSaveData,
}) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { label: "NEW GAME", action: onNewGame, enabled: true },
    { label: "CONTINUE", action: onContinue, enabled: hasSaveData },
    { label: "CG GALLERY", action: onCGGallery, enabled: !!onCGGallery },
    { label: "SCENE", action: onSceneRecollection, enabled: !!onSceneRecollection },
    { label: "CONFIG", action: onConfig, enabled: !!onConfig },
    { label: "EXIT", action: onExit, enabled: !!onExit },
  ];

  return (
    <div style={styles.container}>
      {/* 背景装飾 */}
      <div style={styles.bgOverlay} />

      {/* タイトルエリア */}
      <div style={styles.titleArea}>
        <h1 style={styles.title}>{title || "Doujin Engine"}</h1>
        <p style={styles.subtitle}>— 同人ゲーム作成エンジン —</p>
      </div>

      {/* メニュー */}
      <nav style={styles.menu}>
        {menuItems.map((item) => {
          const isHovered = hoveredItem === item.label && item.enabled;
          return (
            <button
              key={item.label}
              onClick={item.enabled ? item.action : undefined}
              style={{
                ...styles.menuBtn,
                opacity: item.enabled ? 1 : 0.3,
                cursor: item.enabled ? "pointer" : "default",
                background: isHovered ? "rgba(200,180,140,0.15)" : "transparent",
                borderColor: isHovered ? "#E8D4B0" : "rgba(200,180,140,0.3)",
                letterSpacing: isHovered ? 6 : 4,
              }}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* フッター */}
      <div style={styles.footer}>
        <span>Doujin Engine v0.1.0</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    ...GAME_CONTAINER_STYLE,
    fontFamily: "'Noto Serif JP', 'Yu Mincho', 'HGS明朝E', serif",
    userSelect: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(170deg, #0a0a14 0%, #1a1a2e 40%, #16213e 100%)",
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse at 30% 20%, rgba(200,180,140,0.06) 0%, transparent 60%)," +
      "radial-gradient(ellipse at 70% 80%, rgba(100,120,180,0.05) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  titleArea: {
    textAlign: "center",
    marginBottom: 48,
    zIndex: 1,
  },
  title: {
    fontSize: 42,
    color: "#E8D4B0",
    fontWeight: 600,
    letterSpacing: 6,
    margin: 0,
    textShadow: "0 2px 20px rgba(200,180,140,0.3)",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(200,180,140,0.5)",
    letterSpacing: 3,
    marginTop: 12,
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 1,
  },
  menuBtn: {
    background: "transparent",
    border: "1px solid rgba(200,180,140,0.3)",
    color: "#E8D4B0",
    padding: "12px 56px",
    borderRadius: 3,
    fontSize: 15,
    letterSpacing: 4,
    fontFamily: "'Noto Serif JP', serif",
    transition: "all 0.3s ease",
    minWidth: 280,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    right: 24,
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
};
