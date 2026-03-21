import { getUnlocks } from "../save/UnlockStore";

export default function SceneRecollection({ catalog, onPlayScene, onBack }) {
  const unlocks = getUnlocks();

  const chapters = {};
  (catalog || []).forEach((scene) => {
    const ch = scene.chapter || "その他";
    if (!chapters[ch]) chapters[ch] = [];
    chapters[ch].push(scene);
  });

  return (
    <div onClick={(e) => e.stopPropagation()} style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>シーン回想</span>
        <button onClick={onBack} style={styles.closeBtn}>閉じる</button>
      </div>
      <div style={styles.list}>
        {Object.entries(chapters).map(([chapter, scenes]) => (
          <div key={chapter}>
            <div style={styles.chapterTitle}>{chapter}</div>
            {scenes.map((scene) => {
              const unlocked = unlocks.scene.includes(scene.name);
              return (
                <div
                  key={scene.name}
                  onClick={() => unlocked && onPlayScene && onPlayScene(scene.name)}
                  style={{
                    ...styles.sceneItem,
                    opacity: unlocked ? 1 : 0.3,
                    cursor: unlocked ? "pointer" : "default",
                  }}
                >
                  {scene.thumbnail && unlocked && (
                    <img src={`./assets/${scene.thumbnail}`} alt="" style={styles.sceneThumb} />
                  )}
                  {!unlocked && !scene.thumbnail && (
                    <span style={{ fontSize: 18, opacity: 0.4 }}>🔒</span>
                  )}
                  <div>
                    <div style={styles.sceneTitle}>
                      {unlocked ? scene.title : "？？？"}
                    </div>
                    {!unlocked && (
                      <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>未開放</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {(catalog || []).length === 0 && (
          <p style={{ color: "#666", fontSize: 14 }}>シーンが登録されていません</p>
        )}
      </div>
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
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 32px", flexShrink: 0,
  },
  title: { color: "#E8D4B0", fontSize: 18, letterSpacing: 3 },
  closeBtn: {
    background: "none", border: "1px solid rgba(255,255,255,0.2)",
    color: "#aaa", padding: "4px 16px", borderRadius: 3,
    cursor: "pointer", fontSize: 12, fontFamily: "inherit",
  },
  list: {
    flex: 1, overflowY: "auto", padding: "0 32px 20px",
  },
  chapterTitle: {
    color: "#C8A870", fontSize: 14, letterSpacing: 2,
    marginTop: 16, marginBottom: 8,
    borderBottom: "1px solid rgba(200,180,140,0.2)",
    paddingBottom: 4,
  },
  sceneItem: {
    display: "flex", gap: 12, alignItems: "center",
    padding: "10px 16px", marginBottom: 4, borderRadius: 4,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    transition: "all 0.2s",
  },
  sceneThumb: {
    width: 80, height: 45, objectFit: "cover", borderRadius: 3,
  },
  sceneTitle: {
    color: "#E8D4B0", fontSize: 14,
  },
};
