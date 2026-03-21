import { useState, useCallback } from "react";
import ProjectManager from "./project/ProjectManager";
import TitleScreen from "./components/TitleScreen";
import NovelEngine from "./engine/NovelEngine";
import EditorScreen from "./editor/EditorScreen";
import { getProject, setActiveProjectId } from "./project/ProjectStore";

// 画面状態: "projects" | "title" | "game" | "editor"
function App() {
  const [screen, setScreen] = useState("projects");
  const [project, setProject] = useState(null);

  // プロジェクト選択
  const handleSelectProject = useCallback((id) => {
    const p = getProject(id);
    if (!p) return;
    setActiveProjectId(id);
    setProject(p);
    setScreen("title");
  }, []);

  // プロジェクト一覧へ戻る
  const backToProjects = useCallback(() => {
    setProject(null);
    setScreen("projects");
  }, []);

  const containerStyle = {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
  };

  // エディタ画面（フルスクリーン）
  if (screen === "editor" && project) {
    return (
      <EditorScreen
        onBack={() => setScreen("title")}
        initialScript={project.script}
        projectId={project.id}
        projectName={project.name}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {/* プロジェクト管理画面 */}
      {screen === "projects" && (
        <ProjectManager onSelectProject={handleSelectProject} />
      )}

      {/* タイトル画面 */}
      {screen === "title" && project && (
        <TitleScreen
          title={project.name}
          onNewGame={() => setScreen("game")}
          onContinue={() => setScreen("game")}
          onEditor={() => setScreen("editor")}
          onBack={backToProjects}
          hasSaveData={project.saves?.some((s) => s !== null)}
        />
      )}

      {/* ゲーム画面 */}
      {screen === "game" && project && (
        <NovelEngine
          script={project.script}
          characters={project.characters}
          bgStyles={project.bgStyles}
          onBack={() => setScreen("title")}
        />
      )}
    </div>
  );
}

export default App;
