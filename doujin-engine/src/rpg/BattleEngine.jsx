import { useState, useCallback } from "react";

// ターンベースバトルエンジン
export default function BattleEngine({ battle, enemies: enemyDefs, skills: skillDefs, onEnd }) {
  const [party] = useState([
    { name: "主人公", hp: 100, maxHp: 100, mp: 30, maxMp: 30, atk: 15, def: 8, speed: 10 },
  ]);
  const [enemyInstances, setEnemyInstances] = useState(() =>
    battle.enemies.map((id, i) => {
      const def = enemyDefs.find((e) => e.id === id) || { name: id, hp: 30, atk: 8, def: 3, speed: 5 };
      return { ...def, currentHp: def.hp, instanceId: `${id}_${i}` };
    })
  );
  const [partyHp, setPartyHp] = useState(party.map((p) => p.hp));
  const [log, setLog] = useState([`${battle.name} が始まった！`]);
  const [turn, setTurn] = useState("player"); // "player" | "enemy" | "result"
  const [result, setResult] = useState(null);

  const addLog = (msg) => setLog((prev) => [...prev.slice(-8), msg]);

  // プレイヤー攻撃
  const playerAttack = useCallback((targetIdx) => {
    const hero = party[0];
    const target = enemyInstances[targetIdx];
    if (!target || target.currentHp <= 0) return;

    const dmg = Math.max(1, hero.atk - target.def + Math.floor(Math.random() * 5 - 2));
    const newEnemies = [...enemyInstances];
    newEnemies[targetIdx] = { ...target, currentHp: Math.max(0, target.currentHp - dmg) };
    setEnemyInstances(newEnemies);
    addLog(`主人公 の攻撃！ ${target.name} に ${dmg} ダメージ！`);

    // 敵全滅チェック
    if (newEnemies.every((e) => e.currentHp <= 0)) {
      const totalExp = newEnemies.reduce((s, e) => s + (e.exp || 0), 0);
      const totalGold = newEnemies.reduce((s, e) => s + (e.gold || 0), 0);
      setResult({ victory: true, exp: totalExp, gold: totalGold });
      setTurn("result");
      addLog("敵を全て倒した！");
      return;
    }

    // 敵のターン
    setTurn("enemy");
    setTimeout(() => enemyTurn(newEnemies), 600);
  }, [enemyInstances, party]);

  // 敵ターン
  const enemyTurn = useCallback((currentEnemies) => {
    let hp = partyHp[0];
    const aliveEnemies = currentEnemies.filter((e) => e.currentHp > 0);

    aliveEnemies.forEach((enemy) => {
      const dmg = Math.max(1, enemy.atk - party[0].def + Math.floor(Math.random() * 4 - 1));
      hp = Math.max(0, hp - dmg);
      addLog(`${enemy.name} の攻撃！ 主人公に ${dmg} ダメージ！`);
    });

    setPartyHp([hp]);

    if (hp <= 0) {
      setResult({ victory: false });
      setTurn("result");
      addLog("主人公は倒れた……");
    } else {
      setTurn("player");
    }
  }, [partyHp, party]);

  // 逃走
  const tryEscape = useCallback(() => {
    if (!battle.escapeAllowed) {
      addLog("逃げられない！");
      return;
    }
    if (Math.random() < 0.5) {
      setResult({ escaped: true });
      setTurn("result");
      addLog("うまく逃げ切った！");
    } else {
      addLog("逃げられなかった！");
      setTurn("enemy");
      setTimeout(() => enemyTurn(enemyInstances), 600);
    }
  }, [battle.escapeAllowed, enemyInstances, enemyTurn]);

  return (
    <div style={styles.container}>
      <div style={styles.battleTitle}>{battle.name}</div>

      {/* 敵の表示 */}
      <div style={styles.enemyRow}>
        {enemyInstances.map((enemy, i) => (
          <div
            key={enemy.instanceId}
            onClick={() => turn === "player" && playerAttack(i)}
            style={{
              ...styles.enemyCard,
              opacity: enemy.currentHp <= 0 ? 0.3 : 1,
              cursor: turn === "player" && enemy.currentHp > 0 ? "pointer" : "default",
              border: turn === "player" && enemy.currentHp > 0
                ? "2px solid rgba(255,100,100,0.5)"
                : "2px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={styles.enemyEmoji}>{enemy.currentHp > 0 ? "👾" : "💀"}</div>
            <div style={styles.enemyName}>{enemy.name}</div>
            <div style={styles.hpBar}>
              <div style={{ ...styles.hpFill, width: `${(enemy.currentHp / enemy.hp) * 100}%` }} />
            </div>
            <div style={styles.hpText}>{enemy.currentHp}/{enemy.hp}</div>
          </div>
        ))}
      </div>

      {/* プレイヤーステータス */}
      <div style={styles.partyRow}>
        <div style={styles.partyCard}>
          <div style={styles.partyName}>主人公</div>
          <div style={styles.hpBar}>
            <div style={{
              ...styles.hpFill,
              width: `${(partyHp[0] / party[0].maxHp) * 100}%`,
              background: partyHp[0] / party[0].maxHp < 0.3 ? "#F44" : "#4CAF50",
            }} />
          </div>
          <div style={styles.hpText}>HP {partyHp[0]}/{party[0].maxHp}</div>
        </div>
      </div>

      {/* バトルログ */}
      <div style={styles.log}>
        {log.map((msg, i) => (
          <div key={i} style={{ color: i === log.length - 1 ? "#E8E4DC" : "#888", fontSize: 13 }}>{msg}</div>
        ))}
      </div>

      {/* コマンド */}
      {turn === "player" && (
        <div style={styles.commands}>
          <div style={styles.cmdLabel}>↑ 敵をクリックして攻撃</div>
          <button onClick={tryEscape} style={styles.cmdBtn}>にげる</button>
        </div>
      )}
      {turn === "enemy" && <div style={styles.turnLabel}>敵のターン...</div>}
      {turn === "result" && result && (
        <div style={styles.commands}>
          <button onClick={() => onEnd(result)} style={styles.cmdBtn}>
            {result.victory ? "リザルト確認" : result.escaped ? "マップに戻る" : "ゲームオーバー"}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "100%", height: "100%", position: "relative",
    background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0a0a14 100%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: 24, fontFamily: "'Noto Serif JP', serif",
    boxSizing: "border-box",
  },
  battleTitle: {
    color: "#E8D4B0", fontSize: 16, letterSpacing: 3, marginBottom: 16,
  },
  enemyRow: {
    display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", justifyContent: "center",
  },
  enemyCard: {
    background: "rgba(255,255,255,0.05)", borderRadius: 8,
    padding: "12px 16px", textAlign: "center", width: 100,
    transition: "all 0.2s",
  },
  enemyEmoji: { fontSize: 32, marginBottom: 4 },
  enemyName: { color: "#ccc", fontSize: 11, marginBottom: 6 },
  partyRow: {
    display: "flex", gap: 12, marginBottom: 16,
  },
  partyCard: {
    background: "rgba(100,180,255,0.08)", border: "1px solid rgba(100,180,255,0.2)",
    borderRadius: 6, padding: "10px 20px", textAlign: "center", minWidth: 140,
  },
  partyName: { color: "#5BF", fontSize: 13, marginBottom: 6 },
  hpBar: {
    width: "100%", height: 6, background: "rgba(255,255,255,0.1)",
    borderRadius: 3, overflow: "hidden", marginBottom: 4,
  },
  hpFill: { height: "100%", background: "#4CAF50", borderRadius: 3, transition: "width 0.3s" },
  hpText: { color: "#888", fontSize: 10, fontFamily: "monospace" },
  log: {
    flex: 1, width: "100%", maxWidth: 500,
    background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 12,
    overflowY: "auto", marginBottom: 12,
  },
  commands: {
    display: "flex", gap: 8, alignItems: "center",
  },
  cmdLabel: { color: "#888", fontSize: 12 },
  cmdBtn: {
    background: "rgba(200,180,140,0.12)", border: "1px solid rgba(200,180,140,0.3)",
    color: "#E8D4B0", padding: "8px 20px", borderRadius: 4, cursor: "pointer",
    fontSize: 13, fontFamily: "inherit", letterSpacing: 2,
  },
  turnLabel: {
    color: "#FA0", fontSize: 13, animation: "pulse 1s infinite",
  },
};
