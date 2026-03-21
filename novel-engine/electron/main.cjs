const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// 開発モード判定
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 960,
    minHeight: 540,
    resizable: true,
    fullscreenable: true,
    title: "Doujin Engine",
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // メニューバー非表示（ゲーム向け）
  win.setMenuBarVisibility(false);

  if (isDev) {
    // 開発時: Vite dev server に接続
    win.loadURL("http://localhost:5555");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // 本番: ビルド済み dist/index.html をロード
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // F11 でフルスクリーン切替
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
    }
    // F12 で DevTools（開発時のみ）
    if (input.key === "F12" && isDev) {
      win.webContents.toggleDevTools();
    }
  });
}

// === IPC ハンドラ ===

// セーブデータ保存
ipcMain.handle("save-file", async (event, { filename, data }) => {
  const userDataPath = app.getPath("userData");
  const savePath = path.join(userDataPath, "saves");
  if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
  const filePath = path.join(savePath, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  return { success: true, path: filePath };
});

// セーブデータ読み込み
ipcMain.handle("load-file", async (event, { filename }) => {
  const userDataPath = app.getPath("userData");
  const filePath = path.join(userDataPath, "saves", filename);
  if (!fs.existsSync(filePath)) return { success: false, data: null };
  const raw = fs.readFileSync(filePath, "utf-8");
  return { success: true, data: JSON.parse(raw) };
});

// セーブデータ一覧
ipcMain.handle("list-saves", async () => {
  const userDataPath = app.getPath("userData");
  const savePath = path.join(userDataPath, "saves");
  if (!fs.existsSync(savePath)) return [];
  return fs.readdirSync(savePath).filter((f) => f.endsWith(".json"));
});

// ファイル選択ダイアログ
ipcMain.handle("select-file", async (event, { filters, title }) => {
  const result = await dialog.showOpenDialog({
    title: title || "ファイルを選択",
    filters: filters || [{ name: "All Files", extensions: ["*"] }],
    properties: ["openFile"],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// フォルダ選択ダイアログ
ipcMain.handle("select-folder", async (event, { title }) => {
  const result = await dialog.showOpenDialog({
    title: title || "フォルダを選択",
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// === プロジェクト管理 ===

function getProjectsDir() {
  const dir = path.join(app.getPath("userData"), "projects");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getProjectsIndexPath() {
  return path.join(getProjectsDir(), "_index.json");
}

// プロジェクト一覧の読み書き
function readProjectsIndex() {
  const p = getProjectsIndexPath();
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}

function writeProjectsIndex(projects) {
  fs.writeFileSync(getProjectsIndexPath(), JSON.stringify(projects, null, 2), "utf-8");
}

// プロジェクト一覧取得
ipcMain.handle("project-list", async () => {
  return readProjectsIndex();
});

// プロジェクト取得（ID 指定）
ipcMain.handle("project-get", async (event, id) => {
  const filePath = path.join(getProjectsDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
});

// プロジェクト保存（作成 or 更新）
ipcMain.handle("project-save", async (event, project) => {
  const filePath = path.join(getProjectsDir(), `${project.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), "utf-8");

  // インデックス更新
  const index = readProjectsIndex();
  const meta = {
    id: project.id,
    name: project.name,
    description: project.description || "",
    gameType: project.gameType || "novel",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    scriptLength: project.script?.length || 0,
    mapCount: project.maps?.length || 0,
    minigameCount: project.minigames?.length || 0,
  };
  const existing = index.findIndex((p) => p.id === project.id);
  if (existing >= 0) {
    index[existing] = meta;
  } else {
    index.push(meta);
  }
  writeProjectsIndex(index);
  return { success: true };
});

// プロジェクト削除
ipcMain.handle("project-delete", async (event, id) => {
  const filePath = path.join(getProjectsDir(), `${id}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const index = readProjectsIndex().filter((p) => p.id !== id);
  writeProjectsIndex(index);
  return { success: true };
});

// アプリ情報
ipcMain.handle("get-app-info", async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    userData: app.getPath("userData"),
    isPackaged: app.isPackaged,
  };
});

// === アプリライフサイクル ===

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
