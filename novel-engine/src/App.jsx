import { useState } from "react";
import TitleScreen from "./components/TitleScreen";
import NovelEngine from "./engine/NovelEngine";
import EditorScreen from "./editor/EditorScreen";
import SCRIPT from "./data/script";

// 画面状態: "title" | "game" | "editor"
function App() {
  const [screen, setScreen] = useState("title");
  const [hasSaveData] = useState(false); // TODO: 永続化後に実装

  const containerStyle = {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#111",
  };

  if (screen === "editor") {
    return (
      <EditorScreen
        onBack={() => setScreen("title")}
        initialScript={SCRIPT}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {screen === "title" && (
        <TitleScreen
          onNewGame={() => setScreen("game")}
          onContinue={() => setScreen("game")}
          onEditor={() => setScreen("editor")}
          hasSaveData={hasSaveData}
        />
      )}
      {screen === "game" && <NovelEngine />}
    </div>
  );
}

export default App;
