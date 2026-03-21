import { useState } from "react";
import { getUnlocks } from "../save/UnlockStore";

// CG ギャラリー画面
export default function CGGallery({ catalog, onBack }) {
  const [selectedCG, setSelectedCG] = useState(null);
  const [variantIndex, setVariantIndex] = useState(0);
  const unlocks = getUnlocks();

  const groups = {};
  (catalog || []).forEach((cg) => {
    const g = cg.group || "default";
    if (!groups[g]) groups[g] = [];
    groups[g].push(cg);
  });

  const [activeGroup, setActiveGroup] = useState(Object.keys(groups)[0] || "default");

  const items = groups[activeGroup] || [];

  return (
    <div onClick={(e) => e.stopPropagation()} style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>CG ギャラリー</span>
        <div style={styles.groupTabs}>
          {Object.keys(groups).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              style={{
                ...styles.tabBtn,
                ...(activeGroup === g ? styles.tabBtnActive : {}),
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <button onClick={onBack} style={styles.closeBtn}>閉じる</button>
      </div>

      {/* サムネイルグリッド */}
      <div style={styles.grid}>
        {items.map((cg) => {
          const unlocked = unlocks.cg.includes(cg.id);
          return (
            <div
              key={cg.id}
              onClick={() => unlocked && setSelectedCG(cg)}
              style={{
                ...styles.thumb,
                cursor: unlocked ? "pointer" : "default",
              }}
            >
              {unlocked ? (
                <>
                  {cg.thumbnail ? (
                    <img src={`./assets/${cg.thumbnail}`} alt={cg.title} style={styles.thumbImg} />
                  ) : (
                    <div style={styles.thumbPlaceholder}>{cg.title}</div>
                  )}
                  <div style={styles.thumbTitle}>{cg.title}</div>
                </>
              ) : (
                <div style={styles.locked}>
                  <span style={{ fontSize: 24 }}>？</span>
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && (
          <p style={{ color: "#666", fontSize: 14, gridColumn: "1 / -1" }}>CGが登録されていません</p>
        )}
      </div>

      {/* 拡大表示オーバーレイ */}
      {selectedCG && (
        <div
          onClick={() => { setSelectedCG(null); setVariantIndex(0); }}
          style={styles.overlay}
        >
          <img
            src={`./assets/${
              selectedCG.variants?.[variantIndex]
                ? `cg/${selectedCG.variants[variantIndex]}.png`
                : selectedCG.src
            }`}
            alt={selectedCG.title}
            style={styles.fullImg}
            onClick={(e) => e.stopPropagation()}
          />
          {selectedCG.variants && selectedCG.variants.length > 1 && (
            <div onClick={(e) => e.stopPropagation()} style={styles.variantNav}>
              <button
                onClick={() => setVariantIndex((v) => Math.max(0, v - 1))}
                style={styles.navBtn}
                disabled={variantIndex === 0}
              >
                ←
              </button>
              <span style={{ color: "#ccc", fontSize: 12 }}>
                {variantIndex + 1} / {selectedCG.variants.length}
              </span>
              <button
                onClick={() => setVariantIndex((v) => Math.min(selectedCG.variants.length - 1, v + 1))}
                style={styles.navBtn}
                disabled={variantIndex >= selectedCG.variants.length - 1}
              >
                →
              </button>
            </div>
          )}
          <div style={styles.overlayTitle}>{selectedCG.title}</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "absolute", inset: 0, zIndex: 40,
    background: "rgba(10,10,20,0.97)",
    display: "flex", flexDirection: "column",
    fontFamily: "'Noto Serif JP', serif",
  },
  header: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "20px 32px", flexShrink: 0,
  },
  title: {
    color: "#E8D4B0", fontSize: 18, letterSpacing: 3,
  },
  groupTabs: {
    display: "flex", gap: 4, flex: 1,
  },
  tabBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#888", padding: "4px 12px", borderRadius: 3,
    fontSize: 11, cursor: "pointer", fontFamily: "inherit",
  },
  tabBtnActive: {
    background: "rgba(200,180,140,0.15)",
    borderColor: "rgba(200,180,140,0.4)",
    color: "#E8D4B0",
  },
  closeBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#aaa", padding: "4px 16px", borderRadius: 3,
    cursor: "pointer", fontSize: 12, fontFamily: "inherit",
  },
  grid: {
    flex: 1, overflowY: "auto", padding: "0 32px 20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 12,
  },
  thumb: {
    aspectRatio: "16/9", borderRadius: 4,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden", position: "relative",
    transition: "all 0.2s",
  },
  thumbImg: {
    width: "100%", height: "100%", objectFit: "cover",
  },
  thumbPlaceholder: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#888", fontSize: 11, background: "rgba(200,180,140,0.05)",
  },
  thumbTitle: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    background: "rgba(0,0,0,0.7)", color: "#ccc",
    fontSize: 10, padding: "3px 6px", textAlign: "center",
  },
  locked: {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.02)", color: "#444",
  },
  overlay: {
    position: "absolute", inset: 0, zIndex: 50,
    background: "rgba(0,0,0,0.95)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", cursor: "pointer",
  },
  fullImg: {
    maxWidth: "90%", maxHeight: "80%", objectFit: "contain",
    borderRadius: 4, cursor: "default",
  },
  variantNav: {
    display: "flex", gap: 16, alignItems: "center",
    marginTop: 12,
  },
  navBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#ccc", padding: "6px 16px", borderRadius: 3,
    cursor: "pointer", fontSize: 14,
  },
  overlayTitle: {
    color: "rgba(255,255,255,0.5)", fontSize: 12,
    marginTop: 12, letterSpacing: 2,
  },
};
