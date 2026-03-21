import { useState } from "react";

// ビルド設定とデプロイ手順を表示するパネル
export default function DeployPanel({ projectId, projectName }) {
  const [buildTarget, setBuildTarget] = useState("portable");
  const isElectron = typeof window !== "undefined" && window.electronAPI?.isElectron;

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

        {/* ビルドターゲット */}
        <Section title="ビルドターゲット">
          <div style={styles.targetGrid}>
            {[
              { id: "web", label: "Web", desc: "ブラウザ向けビルド (dist/)", cmd: "./build.sh web" },
              { id: "portable", label: "Portable EXE", desc: "単体実行ファイル (release/)", cmd: "./build.sh portable" },
              { id: "electron", label: "Installer + Portable", desc: "NSIS インストーラ + Portable (release/)", cmd: "./build.sh electron" },
              { id: "all", label: "All", desc: "全ターゲットをビルド", cmd: "./build.sh all" },
            ].map((target) => (
              <div
                key={target.id}
                onClick={() => setBuildTarget(target.id)}
                style={{
                  ...styles.targetCard,
                  borderColor: buildTarget === target.id ? "#E8D4B0" : "rgba(255,255,255,0.08)",
                  background: buildTarget === target.id ? "rgba(200,180,140,0.08)" : "transparent",
                }}
              >
                <div style={styles.targetLabel}>{target.label}</div>
                <div style={styles.targetDesc}>{target.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ビルドコマンド */}
        <Section title="ビルド手順">
          <div style={styles.steps}>
            <Step num={1} title="依存関係インストール" cmd="npm install" />
            <Step num={2} title="Web ビルド" cmd="npm run build" />
            {buildTarget !== "web" && (
              <Step
                num={3}
                title="EXE ビルド"
                cmd={
                  buildTarget === "portable"
                    ? "npx electron-builder --win portable --x64"
                    : buildTarget === "all"
                    ? "npx electron-builder --win --x64"
                    : "npx electron-builder --win --x64"
                }
              />
            )}
            <Step
              num={buildTarget === "web" ? 3 : 4}
              title="出力確認"
              cmd={buildTarget === "web" ? "ls dist/" : "ls release/"}
            />
          </div>
          <div style={styles.quickCmd}>
            <span style={styles.quickLabel}>ワンコマンド:</span>
            <code style={styles.codeBlock}>./build.sh {buildTarget}</code>
          </div>
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
          <Row label="出力先" value="release/" />
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
    </div>
  );
}

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

function Step({ num, title, cmd }) {
  return (
    <div style={styles.step}>
      <span style={styles.stepNum}>{num}</span>
      <div>
        <div style={styles.stepTitle}>{title}</div>
        <code style={styles.stepCmd}>{cmd}</code>
      </div>
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
    border: "1px solid", borderRadius: 4, padding: "12px 14px", cursor: "pointer",
    transition: "all 0.2s",
  },
  targetLabel: { fontSize: 14, color: "#E8D4B0", fontWeight: 600, marginBottom: 4 },
  targetDesc: { fontSize: 11, color: "#888" },
  steps: { display: "flex", flexDirection: "column", gap: 8 },
  step: { display: "flex", alignItems: "flex-start", gap: 10 },
  stepNum: {
    width: 24, height: 24, borderRadius: "50%", background: "rgba(200,180,140,0.15)",
    color: "#E8D4B0", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  stepTitle: { fontSize: 13, color: "#ccc", marginBottom: 2 },
  stepCmd: {
    fontSize: 11, color: "#5BF", fontFamily: "monospace", background: "rgba(0,0,0,0.3)",
    padding: "2px 8px", borderRadius: 3,
  },
  quickCmd: {
    marginTop: 12, padding: "10px 14px", background: "rgba(0,0,0,0.2)",
    borderRadius: 4, display: "flex", alignItems: "center", gap: 10,
  },
  quickLabel: { fontSize: 11, color: "#888" },
  codeBlock: {
    fontSize: 13, color: "#5BF", fontFamily: "monospace", background: "rgba(90,180,255,0.08)",
    padding: "4px 12px", borderRadius: 3, border: "1px solid rgba(90,180,255,0.2)",
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
