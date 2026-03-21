const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// 開発モード判定
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 540,
    minWidth: 800,
    minHeight: 450,
    resizable: true,
    fullscreenable: true,
    title: "Doujin Engine",
    icon: path.join(__dirname, "../assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
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
