import { useState, useEffect, useRef, useCallback } from "react";

// ビルドステージ定義（ターゲットごとの進捗マッピング）
const STAGE_PATTERNS = [
  { pattern: /npm install/i,                    stage: "依存関係インストール",  weight: 5 },
  { pattern: /Building web|vite build|\[1\/[23]\]/i, stage: "Vite ビルド",      weight: 20 },
  { pattern: /transforming/i,                   stage: "モジュール変換",        weight: 30 },
  { pattern: /rendering chunks/i,              stage: "チャンク生成",          weight: 40 },
  { pattern: /computing gzip/i,                stage: "サイズ計算",            weight: 50 },
  { pattern: /✓ built in|built in \d/i,        stage: "Vite 完了",            weight: 55 },
  { pattern: /Building Electron|electron-builder|\[2\/[23]\]|packaging/i, stage: "Electron パッケージング", weight: 60 },
  { pattern: /building.*target/i,              stage: "ターゲットビルド",      weight: 70 },
  { pattern: /asar/i,                          stage: "asar パッキング",       weight: 80 },
  { pattern: /nsis|portable.*exe/i,            stage: "インストーラ生成",      weight: 85 },
  { pattern: /\[3\/3\]/i,                      stage: "Portable ビルド",       weight: 90 },
  { pattern: /Done!|Build complete/i,          stage: "完了",                  weight: 100 },
];

function estimateProgress(logs) {
  let maxWeight = 0;
  let currentStage = "準備中";
  for (const log of logs) {
    const text = log.text || "";
    for (const sp of STAGE_PATTERNS) {
      if (sp.pattern.test(text) && sp.weight > maxWeight) {
        maxWeight = sp.weight;
        currentStage = sp.stage;
      }
    }
  }
  return { percent: maxWeight, stage: currentStage };
}

// ビルド実行・デプロイパネル
export default function DeployPanel({ projectId, projectName }) {
  const [buildTarget, setBuildTarget] = useState("portable");
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ percent: 0, stage: "" });
  const logEndRef = useRef(null);
  const cleanupRef = useRef(null);
  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

  // ログ末尾に自動スクロール
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // ログ変更時に進捗を再計算
  useEffect(() => {
    if (building) setProgress(estimateProgress(logs));
  }, [logs, building]);

  // Electron のビルドログリスナー
  useEffect(() => {
    if (!isElectron || !window.electronAPI.onBuildLog) return;
    const cleanup = window.electronAPI.onBuildLog((data) => {
      setLogs((prev) => [...prev, data]);
      if (data.type === "success") {
        setBuilding(false);
        setProgress({ percent: 100, stage: "完了" });
        setBuildResult({ success: true, text: data.text });
      } else if (data.type === "error") {
        setBuilding(false);
        setBuildResult({ success: false, text: data.text });
      }
    });
    cleanupRef.current = cleanup;
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, [isElectron]);

  // ビルド実行
  const runBuild = useCallback(async () => {
    if (building) return;
    setBuilding(true);
    setBuildResult(null);
    setLogs([]);
    setProgress({ percent: 0, stage: "ゲームデータ書き出し" });

    // Step 1: プロジェクトデータをエクスポート
    const addLog = (log) => setLogs((prev) => [...prev, log]);
    addLog({ type: "info", text: "ゲームデータをエクスポート中..." });

    try {
      let exportResult;
      if (isElectron && window.electronAPI.exportGame) {
        exportResult = await window.electronAPI.exportGame(projectId);
      } else {
        const res = await fetch("/api/export-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        exportResult = await res.json();
      }
      if (!exportResult?.success) {
        throw new Error(exportResult?.error || "エクスポート失敗");
      }
      addLog({ type: "success", text: "ゲームデータ書き出し完了" });
      setProgress({ percent: 10, stage: "ビルド開始" });
    } catch (err) {
      addLog({ type: "error", text: `エクスポート失敗: ${err.message}` });
      setBuildResult({ success: false, text: "エクスポート失敗" });
      setBuilding(false);
      return;
    }

    // Step 2: ビルド実行
    const cleanup = async () => {
      try {
        if (isElectron && window.electronAPI.exportGameCleanup) {
          await window.electronAPI.exportGameCleanup();
        } else {
          await fetch("/api/export-game-cleanup", { method: "POST" });
        }
      } catch {}
    };

    if (isElectron && window.electronAPI.runBuild) {
      await window.electronAPI.runBuild({ mode: buildTarget, projectName });
      await cleanup();
    } else {
      // ブラウザ: SSE でリアルタイム受信
      try {
        const res = await fetch("/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: buildTarget, projectName }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              addLog(data);
              if (data.type === "success") {
                setProgress({ percent: 100, stage: "完了" });
                setBuildResult({ success: true, text: data.text });
              } else if (data.type === "error") {
                setBuildResult({ success: false, text: data.text });
              }
            } catch {}
          }
        }
      } catch (err) {
        addLog({ type: "error", text: `通信エラー: ${err.message}` });
        setBuildResult({ success: false, text: err.message });
      }
      // Step 3: クリーンアップ（public/ から game-data.json と game-assets/ を削除）
      await cleanup();
      setBuilding(false);
    }
  }, [building, buildTarget, isElectron, projectName, projectId]);

  const safeName = projectName ? projectName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") : "";
  const BUILD_TARGETS = [
    { id: "web", label: "Web", desc: `ブラウザ向けビルド (${safeName ? `dist/${safeName}/` : "dist/"})` },
    { id: "portable", label: "Portable EXE", desc: `単体実行ファイル (${safeName ? `release/${safeName}/` : "release/"})` },
    { id: "electron", label: "Installer + Portable", desc: `NSIS + Portable (${safeName ? `release/${safeName}/` : "release/"})` },
    { id: "all", label: "All", desc: "全ターゲットをビルド" },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Deploy</h2>
        <span style={styles.env}>
          環境: {isElectron ? "Electron" : "ブラウザ"}
        </span>
      </div>

      <div style={styles.content}>
        {/* プロジェクト情報 */}
        <Section title="プロジェクト情報">
          <Row label="プロジェクト名" value={projectName || "(未設定)"} />
          <Row label="プロジェクトID" value={projectId || "(なし)"} />
          <Row label="エンジンバージョン" value="0.1.0" />
        </Section>

        {/* ビルドターゲット選択 */}
        <Section title="ビルドターゲット">
          <div style={styles.targetGrid}>
            {BUILD_TARGETS.map((target) => (
              <div
                key={target.id}
                onClick={() => !building && setBuildTarget(target.id)}
                style={{
                  ...styles.targetCard,
                  borderColor: buildTarget === target.id ? "#E8D4B0" : "rgba(255,255,255,0.08)",
                  background: buildTarget === target.id ? "rgba(200,180,140,0.08)" : "transparent",
                  opacity: building ? 0.5 : 1,
                  cursor: building ? "not-allowed" : "pointer",
                }}
              >
                <div style={styles.targetLabel}>{target.label}</div>
                <div style={styles.targetDesc}>{target.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ビルド実行 */}
        <Section title="ビルド実行">
          <div style={styles.buildActions}>
            <button
              onClick={runBuild}
              disabled={building}
              style={{
                ...styles.buildBtn,
                opacity: building ? 0.6 : 1,
                cursor: building ? "not-allowed" : "pointer",
              }}
            >
              {building ? (
                <span style={styles.buildBtnInner}>
                  <span style={styles.spinner} />
                  ビルド中...
                </span>
              ) : (
                `${BUILD_TARGETS.find((t) => t.id === buildTarget)?.label || buildTarget} をビルド`
              )}
            </button>

            {buildResult && (
              <div style={{
                ...styles.resultBadge,
                background: buildResult.success ? "rgba(139,195,74,0.12)" : "rgba(239,83,80,0.12)",
                borderColor: buildResult.success ? "rgba(139,195,74,0.3)" : "rgba(239,83,80,0.3)",
                color: buildResult.success ? "#8BC34A" : "#EF5350",
              }}>
                {buildResult.success ? "✓" : "✗"} {buildResult.text}
              </div>
            )}
          </div>

          {/* プログレスバー */}
          {(building || progress.percent > 0) && (
            <div style={styles.progressWrap}>
              <div style={styles.progressHeader}>
                <span style={styles.progressStage}>{progress.stage}</span>
                <span style={styles.progressPercent}>{progress.percent}%</span>
              </div>
              <div style={styles.progressTrack}>
                <div style={{
                  ...styles.progressBar,
                  width: `${progress.percent}%`,
                  background: buildResult
                    ? (buildResult.success ? "#8BC34A" : "#EF5350")
                    : "linear-gradient(90deg, #C8A870, #E8D4B0)",
                  transition: "width 0.4s ease-out",
                }} />
              </div>
            </div>
          )}

          {/* ビルドログ */}
          {logs.length > 0 && (
            <div style={styles.logContainer}>
              <div style={styles.logHeader}>
                <span>ビルドログ</span>
                <button
                  onClick={() => { setLogs([]); setBuildResult(null); setProgress({ percent: 0, stage: "" }); }}
                  style={styles.logClearBtn}
                >
                  クリア
                </button>
              </div>
              <div style={styles.logBody}>
                {logs.map((log, i) => (
                  <div key={i} style={{
                    ...styles.logLine,
                    color: LOG_COLORS[log.type] || "#aaa",
                  }}>
                    {log.text}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </Section>

        {/* 開発コマンド */}
        <Section title="開発コマンド">
          <div style={styles.cmdList}>
            <CmdRow label="開発サーバー起動" cmd="./start.sh" desc="localhost:5555" />
            <CmdRow label="開発サーバー停止" cmd="./stop.sh" desc="ポート5555のプロセスを停止" />
            <CmdRow label="Electron 開発" cmd="npm run electron:dev" desc="Vite + Electron 同時起動" />
            <CmdRow label="Vite プレビュー" cmd="npm run preview" desc="ビルド結果をプレビュー" />
          </div>
        </Section>

        {/* Electron 設定 */}
        <Section title="Electron パッケージ設定">
          <Row label="appId" value="com.doujin-engine.app" />
          <Row label="productName" value="Doujin Engine" />
          <Row label="ターゲット" value="NSIS installer + Portable" />
          <Row label="アーキテクチャ" value="x64" />
          <Row label="asar" value="true（素材保護）" />
          <Row label="出力先" value={safeName ? `release/${safeName}/` : "release/"} />
          <Row label="アイコン" value="assets/icon.ico" />
        </Section>

        {/* DLsite チェックリスト */}
        <Section title="DLsite 販売チェックリスト">
          <div style={styles.checklist}>
            {[
              "ゲームアイコン (.ico) を assets/icon.ico に配置",
              "portable exe をビルド（./build.sh portable）",
              "Windows 10/11 64bit で動作テスト",
              "紹介画像（メイン 600×420px + サブ最大4枚）",
              "体験版ビルド（シナリオ途中までの別プロジェクト）",
              "ZIP 圧縮して DLsite にアップロード",
              "DLsite サークル登録・作品登録",
              "予告ページ作成（発売2〜4週間前）",
              "Ci-en 開発日記を3〜5記事投稿",
            ].map((item, i) => (
              <label key={i} style={styles.checkItem}>
                <input type="checkbox" style={{ accentColor: "#C8A870" }} />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </Section>
      </div>

      <style>{`
        @keyframes deploySpinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const LOG_COLORS = {
  info: "#5BF",
  cmd: "#C8A870",
  stdout: "#aaa",
  stderr: "#FFB74D",
  success: "#8BC34A",
  error: "#EF5350",
};

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  );
}

function CmdRow({ label, cmd, desc }) {
  return (
    <div style={styles.cmdRow}>
      <span style={styles.cmdLabel}>{label}</span>
      <code style={styles.cmdCode}>{cmd}</code>
      <span style={styles.cmdDesc}>{desc}</span>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 20px", borderBottom: "1px solid rgba(200,180,140,0.1)", flexShrink: 0,
  },
  title: { fontSize: 18, color: "#E8D4B0", fontWeight: 600, letterSpacing: 2, margin: 0 },
  env: { fontSize: 11, color: "#666", fontFamily: "monospace" },
  content: { flex: 1, overflowY: "auto", padding: "12px 20px" },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, color: "#C8A870", letterSpacing: 1, margin: "0 0 10px",
    paddingBottom: 6, borderBottom: "1px solid rgba(200,180,140,0.1)", fontWeight: 600,
  },
  row: {
    display: "flex", justifyContent: "space-between", padding: "4px 0",
    fontSize: 12, fontFamily: "monospace",
  },
  rowLabel: { color: "#888" },
  rowValue: { color: "#ccc" },
  targetGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  targetCard: {
    border: "1px solid", borderRadius: 4, padding: "12px 14px",
    transition: "all 0.2s",
  },
  targetLabel: { fontSize: 14, color: "#E8D4B0", fontWeight: 600, marginBottom: 4 },
  targetDesc: { fontSize: 11, color: "#888" },
  buildActions: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
  },
  buildBtn: {
    background: "rgba(200,180,140,0.15)",
    border: "1px solid rgba(200,180,140,0.4)",
    color: "#E8D4B0",
    padding: "10px 28px",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    letterSpacing: 1,
    transition: "all 0.2s",
  },
  buildBtnInner: {
    display: "flex", alignItems: "center", gap: 8,
  },
  spinner: {
    display: "inline-block",
    width: 14, height: 14,
    border: "2px solid rgba(200,180,140,0.3)",
    borderTopColor: "#E8D4B0",
    borderRadius: "50%",
    animation: "deploySpinner 0.8s linear infinite",
  },
  resultBadge: {
    padding: "6px 16px", borderRadius: 4, fontSize: 13,
    border: "1px solid", fontWeight: 600,
  },
  progressWrap: {
    marginTop: 12,
  },
  progressHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 6,
  },
  progressStage: {
    fontSize: 12, color: "#C8A870", letterSpacing: 0.5,
  },
  progressPercent: {
    fontSize: 13, color: "#E8D4B0", fontWeight: 700, fontFamily: "monospace",
  },
  progressTrack: {
    width: "100%", height: 8, borderRadius: 4,
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%", borderRadius: 4,
    minWidth: 0,
  },
  logContainer: {
    marginTop: 12, border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4, overflow: "hidden",
  },
  logHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 12px", background: "rgba(0,0,0,0.3)",
    fontSize: 11, color: "#888",
  },
  logClearBtn: {
    background: "none", border: "none", color: "#666", fontSize: 10,
    cursor: "pointer", fontFamily: "inherit",
  },
  logBody: {
    maxHeight: 300, overflowY: "auto", padding: "8px 12px",
    background: "rgba(0,0,0,0.2)", fontFamily: "monospace", fontSize: 11,
    lineHeight: 1.6,
  },
  logLine: {
    whiteSpace: "pre-wrap", wordBreak: "break-all",
  },
  cmdList: { display: "flex", flexDirection: "column", gap: 6 },
  cmdRow: {
    display: "grid", gridTemplateColumns: "140px 200px 1fr", gap: 8,
    alignItems: "center", fontSize: 12, padding: "4px 0",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
  },
  cmdLabel: { color: "#ccc" },
  cmdCode: {
    color: "#5BF", fontFamily: "monospace", fontSize: 11,
    background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 3,
  },
  cmdDesc: { color: "#666", fontSize: 10 },
  checklist: { display: "flex", flexDirection: "column", gap: 6 },
  checkItem: {
    display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#ccc", cursor: "pointer",
  },
};
