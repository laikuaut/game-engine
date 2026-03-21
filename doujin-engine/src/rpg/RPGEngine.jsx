import { useState, useCallback } from "react";
import MapRenderer from "./MapRenderer";
import BattleEngine from "./BattleEngine";
import HelpModal, { HelpButton } from "../components/HelpModal";
import { RPG_HELP } from "../data/helpContent";

// RPG メインエンジン — マップ移動 + バトル + イベント
export default function RPGEngine({ maps, battleData, onEvent, onBack, onScriptEvent, initialState, customTiles, projectId }) {
  const [currentMapIndex, setCurrentMapIndex] = useState(initialState?.mapIndex ?? 0);
  const [playerPos, setPlayerPos] = useState(initialState?.playerPos ?? { x: 4, y: 7 });
  const [inBattle, setInBattle] = useState(null);
  const [message, setMessage] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const map = maps?.[currentMapIndex];
  if (!map) return <div style={{ color: "#fff", padding: 20 }}>マップデータがありません</div>;

  // イベント処理
  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case "dialog":
        setMessage({ speaker: event.data.speaker, text: event.data.text });
        break;
      case "warp":
        setCurrentMapIndex(event.data.mapIndex);
        setPlayerPos({ x: event.data.x, y: event.data.y });
        break;
      case "battle": {
        const battle = battleData?.battles?.find((b) => b.id === event.data.battleId);
        if (battle) setInBattle(battle);
        break;
      }
      case "item":
        setMessage({ speaker: "SYSTEM", text: `${event.data.item} x${event.data.amount} を手に入れた！` });
        break;
      case "script":
        // ノベルスクリプトを呼び出す → App.jsx 経由でノベルモードへ
        if (onScriptEvent && event.data?.scriptLabel) {
          const rpgState = { mapIndex: currentMapIndex, playerPos };
          onScriptEvent(event.data.scriptLabel, rpgState);
        }
        break;
      default:
        if (onEvent) onEvent(event);
    }
  }, [battleData, onEvent, onScriptEvent, currentMapIndex, playerPos]);

  // バトル終了
  const handleBattleEnd = useCallback((result) => {
    setInBattle(null);
    if (result.victory) {
      setMessage({ speaker: "SYSTEM", text: `勝利！ EXP +${result.exp} GOLD +${result.gold}` });
    } else if (result.escaped) {
      setMessage({ speaker: "SYSTEM", text: "逃走に成功した！" });
    } else {
      setMessage({ speaker: "SYSTEM", text: "全滅した……" });
    }
  }, []);

  // メッセージ閉じる
  const dismissMessage = useCallback(() => setMessage(null), []);

  // バトル中
  if (inBattle) {
    return (
      <BattleEngine
        battle={inBattle}
        enemies={battleData?.enemies || []}
        skills={battleData?.skills || []}
        onEnd={handleBattleEnd}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* 戻るボタン */}
      <div style={{ position: "absolute", top: 12, left: 16, zIndex: 20, display: "flex", gap: 8, alignItems: "center" }}>
        <div onClick={onBack} style={styles.backBtn}>← BACK</div>
        <HelpButton onClick={() => setShowHelp(true)} />
      </div>

      {/* マップ名 */}
      <div style={styles.mapName}>{map.name}</div>

      {/* マップ描画 */}
      <MapRenderer
        map={map}
        playerPos={playerPos}
        onMove={setPlayerPos}
        onEvent={handleEvent}
        customTiles={customTiles}
        projectId={projectId}
      />

      {/* メッセージウィンドウ */}
      {message && (
        <div onClick={dismissMessage} style={styles.messageOverlay}>
          <div style={styles.messageBox} onClick={(e) => e.stopPropagation()}>
            {message.speaker && <div style={styles.messageSpeaker}>【{message.speaker}】</div>}
            <div style={styles.messageText}>{message.text}</div>
            <div style={styles.messageContinue}>▼ Click to continue</div>
          </div>
        </div>
      )}
      {showHelp && <HelpModal {...RPG_HELP} onClose={() => setShowHelp(false)} />}
    </div>
  );
}

const styles = {
  container: {
    width: "100%", height: "100%", position: "relative",
    background: "#111", display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Noto Serif JP', serif",
  },
  backBtn: {
    fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace",
    background: "rgba(0,0,0,0.3)", padding: "3px 10px", borderRadius: 12,
    cursor: "pointer",
  },
  mapName: {
    position: "absolute", top: 12, right: 16, zIndex: 20,
    fontSize: 12, color: "#C8A870", fontFamily: "monospace",
    background: "rgba(0,0,0,0.5)", padding: "4px 12px", borderRadius: 12,
  },
  messageOverlay: {
    position: "absolute", inset: 0, zIndex: 30,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    padding: "0 40px 40px", cursor: "pointer",
  },
  messageBox: {
    background: "rgba(10,10,20,0.92)", border: "1px solid rgba(200,180,140,0.3)",
    borderRadius: 6, padding: "16px 24px", width: "100%", maxWidth: 700,
  },
  messageSpeaker: { color: "#C8A870", fontSize: 14, marginBottom: 6 },
  messageText: { color: "#E8E4DC", fontSize: 15, lineHeight: 1.8, whiteSpace: "pre-wrap" },
  messageContinue: {
    color: "rgba(255,215,0,0.5)", fontSize: 11, textAlign: "right", marginTop: 8,
    animation: "bounce 1.2s infinite",
  },
};
