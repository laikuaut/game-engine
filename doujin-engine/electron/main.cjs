const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// 開発モード判定
const isDev = !app.isPackaged;

// 画面サイズ設定（src/data/config.js の SCREEN と同期）
const SCREEN = { width: 1920, height: 1080, minWidth: 960, minHeight: 540 };

function createWindow() {
  const win = new BrowserWindow({
    width: SCREEN.width,
    height: SCREEN.height,
    minWidth: SCREEN.minWidth,
    minHeight: SCREEN.minHeight,
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
  // 開発時: プロジェクトルート/data/projects
  // 本番時: exe と同階層の data/projects
  const baseDir = isDev
    ? path.join(__dirname, "..", "data", "projects")
    : path.join(path.dirname(app.getPath("exe")), "data", "projects");
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log("[ProjectStore] Created data dir:", baseDir);
  }
  return baseDir;
}

// 旧 AppData からの自動マイグレーション
function migrateFromAppData() {
  const oldDir = path.join(app.getPath("userData"), "projects");
  const newDir = getProjectsDir();
  if (!fs.existsSync(oldDir)) return;

  const oldFiles = fs.readdirSync(oldDir).filter((f) => f.endsWith(".json"));
  if (oldFiles.length === 0) return;

  let migrated = 0;
  for (const file of oldFiles) {
    const dest = path.join(newDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(oldDir, file), dest);
      migrated++;
    }
  }
  if (migrated > 0) {
    console.log(`[ProjectStore] Migrated ${migrated} files from AppData to ${newDir}`);
  }
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

// --- ジャンル別ファイル分割ヘルパー ---
// プロジェクトのデータファイル定義
const DATA_FILES = ["script", "characters", "items", "gameEvents", "bgStyles", "maps", "customTiles", "battleData", "actionData", "minigames", "saves", "bgmCatalog", "seCatalog", "cgCatalog", "sceneCatalog", "storyScenes", "sceneOrder"];

// プロジェクト名をディレクトリ名に変換（ファイルシステム安全化）
function toSafeDirName(name) {
  // Windows禁止文字を除去、前後の空白・ドットを除去
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\.+$/, "")
    .trim() || "untitled";
}

// IDからディレクトリ名を解決（インデックスの dirName を参照、なければIDフォールバック）
function resolveProjectDirName(id) {
  const index = readProjectsIndex();
  const entry = index.find((p) => p.id === id);
  return entry?.dirName || id;
}

function getProjectDir(id) {
  const dirName = resolveProjectDirName(id);
  const dir = path.join(getProjectsDir(), dirName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return undefined;
  try { return JSON.parse(fs.readFileSync(filePath, "utf-8")); } catch { return undefined; }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// 旧形式（単一ファイル）→ 新形式（ディレクトリ）へのマイグレーション
function migrateProjectToSplit(id) {
  const oldFile = path.join(getProjectsDir(), `${id}.json`);
  if (!fs.existsSync(oldFile)) return;
  const projDir = getProjectDir(id);
  const metaFile = path.join(projDir, "meta.json");
  if (fs.existsSync(metaFile)) return; // 既に移行済み

  try {
    const project = JSON.parse(fs.readFileSync(oldFile, "utf-8"));
    // meta.json に基本情報を書き出し
    const meta = {};
    for (const [k, v] of Object.entries(project)) {
      if (!DATA_FILES.includes(k)) meta[k] = v;
    }
    writeJsonFile(metaFile, meta);
    // 各データファイルを書き出し
    for (const key of DATA_FILES) {
      if (project[key] !== undefined) {
        writeJsonFile(path.join(projDir, `${key}.json`), project[key]);
      }
    }
    // 旧ファイルを削除
    fs.unlinkSync(oldFile);
    console.log(`[ProjectStore] Migrated project ${id} to split files`);
  } catch (e) {
    console.error(`[ProjectStore] Migration failed for ${id}:`, e);
  }
}

// 分割ファイルからプロジェクト全体を読み込み
function readProjectSplit(id) {
  const dirName = resolveProjectDirName(id);
  const projDir = path.join(getProjectsDir(), dirName);
  const metaFile = path.join(projDir, "meta.json");
  if (!fs.existsSync(metaFile)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
    const project = { ...meta };
    for (const key of DATA_FILES) {
      const data = readJsonFile(path.join(projDir, `${key}.json`));
      if (data !== undefined) project[key] = data;
    }
    return project;
  } catch {
    return null;
  }
}

// 分割ファイルにプロジェクトを保存
function writeProjectSplit(project) {
  const projDir = getProjectDir(project.id);
  // meta.json
  const meta = {};
  for (const [k, v] of Object.entries(project)) {
    if (!DATA_FILES.includes(k)) meta[k] = v;
  }
  writeJsonFile(path.join(projDir, "meta.json"), meta);
  // 各データファイル
  for (const key of DATA_FILES) {
    if (project[key] !== undefined) {
      writeJsonFile(path.join(projDir, `${key}.json`), project[key]);
    }
  }
}

// プロジェクトディレクトリを削除
function deleteProjectSplit(id) {
  const dirName = resolveProjectDirName(id);
  const projDir = path.join(getProjectsDir(), dirName);
  if (fs.existsSync(projDir)) {
    fs.rmSync(projDir, { recursive: true, force: true });
  }
  // 旧形式のファイルも念のため削除（IDベースのフォルダ・ファイル）
  const oldDir = path.join(getProjectsDir(), id);
  if (oldDir !== projDir && fs.existsSync(oldDir)) {
    fs.rmSync(oldDir, { recursive: true, force: true });
  }
  const oldFile = path.join(getProjectsDir(), `${id}.json`);
  if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
}

// プロジェクト一覧取得
ipcMain.handle("project-list", async () => {
  return readProjectsIndex();
});

// プロジェクト取得（ID 指定）— 旧形式は自動マイグレーション
ipcMain.handle("project-get", async (event, id) => {
  migrateProjectToSplit(id);
  return readProjectSplit(id);
});

// プロジェクト保存（作成 or 更新）
ipcMain.handle("project-save", async (event, project) => {
  const index = readProjectsIndex();
  const existing = index.findIndex((p) => p.id === project.id);
  const oldEntry = existing >= 0 ? index[existing] : null;

  // ディレクトリ名を作品名から生成
  let newDirName = toSafeDirName(project.name);
  // 他のプロジェクトと重複する場合はIDサフィックスを付ける
  const otherDirs = index.filter((p) => p.id !== project.id).map((p) => p.dirName);
  if (otherDirs.includes(newDirName)) {
    newDirName = `${newDirName}_${project.id.slice(-6)}`;
  }

  const oldDirName = oldEntry?.dirName || project.id;

  // 名前変更でディレクトリ名が変わった場合はリネーム
  if (oldDirName !== newDirName) {
    const oldDir = path.join(getProjectsDir(), oldDirName);
    const newDir = path.join(getProjectsDir(), newDirName);
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      fs.renameSync(oldDir, newDir);
      console.log(`[ProjectStore] Renamed dir: ${oldDirName} → ${newDirName}`);
    }
  }

  // インデックス更新（dirName を含む）
  const meta = {
    id: project.id,
    name: project.name,
    dirName: newDirName,
    description: project.description || "",
    gameType: project.gameType || "novel",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    scriptLength: project.script?.length || 0,
    mapCount: project.maps?.length || 0,
    minigameCount: project.minigames?.length || 0,
  };
  if (existing >= 0) {
    index[existing] = meta;
  } else {
    index.push(meta);
  }
  writeProjectsIndex(index);

  writeProjectSplit(project);
  return { success: true };
});

// プロジェクト削除
ipcMain.handle("project-delete", async (event, id) => {
  deleteProjectSplit(id);
  const index = readProjectsIndex().filter((p) => p.id !== id);
  writeProjectsIndex(index);
  return { success: true };
});

// === アセット管理 ===

function getAssetDir(projectId, type) {
  const dirName = resolveProjectDirName(projectId);
  const dir = path.join(getProjectsDir(), dirName, "assets", type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// デフォルト素材をプロジェクトにコピー
ipcMain.handle("copy-default-assets", async (event, projectId) => {
  const defaultAssetsDir = isDev
    ? path.join(__dirname, "..", "public", "assets")
    : path.join(__dirname, "..", "dist", "assets");
  if (!fs.existsSync(defaultAssetsDir)) return { success: false, error: "default assets not found" };

  const types = ["bg", "chara", "bgm", "se"];
  let copied = 0;
  for (const type of types) {
    const srcDir = path.join(defaultAssetsDir, type);
    if (!fs.existsSync(srcDir)) continue;
    const destDir = getAssetDir(projectId, type);
    copyDirSync(srcDir, destDir);
    copied++;
  }
  console.log(`[ProjectStore] Copied default assets (${copied} types) to project ${projectId}`);
  return { success: true, copied };
});

ipcMain.handle("asset-upload", async (event, { projectId, type, filename, data }) => {
  const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
  const filePath = path.join(getAssetDir(projectId, type), safeName);
  const buf = Buffer.from(data.replace(/^data:[^;]+;base64,/, ""), "base64");
  fs.writeFileSync(filePath, buf);
  return { success: true, filename: safeName };
});

ipcMain.handle("asset-list", async (event, { projectId, type }) => {
  const dir = getAssetDir(projectId, type);
  return fs.readdirSync(dir).filter((f) => /\.(png|jpg|jpeg|webp|gif|ogg|mp3|wav)$/i.test(f));
});

ipcMain.handle("asset-delete", async (event, { projectId, type, filename }) => {
  const filePath = path.join(getAssetDir(projectId, type), filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return { success: true };
});

ipcMain.handle("asset-get-url", async (event, { projectId, type, filename }) => {
  const filePath = path.join(getAssetDir(projectId, type), filename);
  return `file://${filePath.replace(/\\/g, "/")}`;
});

// === ゲームエクスポート ===

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

ipcMain.handle("export-game", async (event, projectId) => {
  try {
    const project = readProjectSplit(projectId);
    if (!project) throw new Error("Project not found");

    const projectRoot = isDev
      ? path.join(__dirname, "..")
      : path.join(path.dirname(app.getPath("exe")));
    const publicDir = path.join(projectRoot, "public");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // game-data.json
    const gameData = {
      name: project.name,
      gameType: project.gameType || "novel",
      script: project.script || [],
      characters: project.characters || {},
      bgStyles: project.bgStyles || {},
      storyScenes: project.storyScenes || [],
      sceneOrder: project.sceneOrder || [],
      maps: project.maps || [],
      customTiles: project.customTiles || [],
      battleData: project.battleData || {},
      actionData: project.actionData || {},
      minigames: project.minigames || [],
      cgCatalog: project.cgCatalog || [],
      sceneCatalog: project.sceneCatalog || [],
      bgmCatalog: project.bgmCatalog || [],
      seCatalog: project.seCatalog || [],
      saves: Array(100).fill(null),
    };
    writeJsonFile(path.join(publicDir, "game-data.json"), gameData);

    // プロジェクトアセットコピー
    const srcAssets = path.join(getProjectsDir(), resolveProjectDirName(projectId), "assets");
    const destAssets = path.join(publicDir, "game-assets");
    if (fs.existsSync(srcAssets)) copyDirSync(srcAssets, destAssets);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle("export-game-cleanup", async () => {
  const projectRoot = isDev
    ? path.join(__dirname, "..")
    : path.join(path.dirname(app.getPath("exe")));
  const publicDir = path.join(projectRoot, "public");
  const f = path.join(publicDir, "game-data.json");
  const d = path.join(publicDir, "game-assets");
  if (fs.existsSync(f)) fs.unlinkSync(f);
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  return { success: true };
});

// === ビルド実行 ===
const { execFile } = require("child_process");

ipcMain.handle("run-build", async (event, { mode, projectName }) => {
  const projectRoot = isDev
    ? path.join(__dirname, "..")
    : path.join(path.dirname(app.getPath("exe")));
  const buildScript = path.join(projectRoot, "build.sh");
  const sender = event.sender;

  // build.sh が存在しない場合は npm スクリプトで直接実行
  const useShell = fs.existsSync(buildScript);
  // プロジェクト名をフォルダ名に使える形に変換
  const safeName = projectName ? projectName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_") : "";
  const outDir = safeName ? `release/${safeName}` : "release";

  let cmd, args;
  if (useShell) {
    cmd = "bash";
    args = [buildScript, mode, ...(safeName ? [safeName] : [])];
  } else {
    // npm scripts fallback
    if (mode === "web") {
      cmd = "npx";
      args = ["vite", "build", ...(safeName ? ["--outDir", `dist/${safeName}`] : [])];
    } else if (mode === "portable") {
      cmd = "npx";
      args = ["electron-builder", "--win", "portable", "--x64", `-c.directories.output=${outDir}`];
    } else {
      cmd = "npx";
      args = ["electron-builder", "--win", "--x64", `-c.directories.output=${outDir}`];
    }
  }

  // 古いビルド成果物をクリーン
  const winUnpacked = path.join(projectRoot, "release", "win-unpacked");
  if (fs.existsSync(winUnpacked)) {
    try { fs.rmSync(winUnpacked, { recursive: true, force: true }); } catch {}
  }
  const outDirAbs = path.join(projectRoot, outDir);
  if (fs.existsSync(outDirAbs)) {
    try { fs.rmSync(outDirAbs, { recursive: true, force: true }); } catch {}
  }

  return new Promise((resolve) => {
    sender.send("build-log", { type: "info", text: `ビルド開始: ${mode}` });
    sender.send("build-log", { type: "cmd", text: `> ${cmd} ${args.join(" ")}` });

    const proc = execFile(cmd, args, {
      cwd: projectRoot,
      shell: true,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    proc.stdout.on("data", (data) => {
      sender.send("build-log", { type: "stdout", text: data.toString() });
    });

    proc.stderr.on("data", (data) => {
      sender.send("build-log", { type: "stderr", text: data.toString() });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        sender.send("build-log", { type: "success", text: "ビルド完了!" });
        resolve({ success: true });
      } else {
        sender.send("build-log", { type: "error", text: `ビルド失敗 (exit code: ${code})` });
        resolve({ success: false, code });
      }
    });

    proc.on("error", (err) => {
      sender.send("build-log", { type: "error", text: `実行エラー: ${err.message}` });
      resolve({ success: false, error: err.message });
    });
  });
});

// アプリ終了
ipcMain.handle("quit-app", async () => {
  app.quit();
});

// ウィンドウリサイズ
ipcMain.handle("resize-window", async (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height);
    win.center();
  }
  return { success: true };
});

// アプリ情報
ipcMain.handle("get-app-info", async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    userData: app.getPath("userData"),
    isPackaged: app.isPackaged,
    projectsDir: getProjectsDir(),
  };
});

// プロジェクトアセットのファイルパスを返す（file:// URL 生成用）
ipcMain.handle("resolve-asset-path", async (event, { projectId, type, filename }) => {
  const dirName = resolveProjectDirName(projectId);
  const filePath = path.join(getProjectsDir(), dirName, "assets", type, filename);
  return `file://${filePath.replace(/\\/g, "/")}`;
});

// === アプリライフサイクル ===

app.whenReady().then(() => {
  migrateFromAppData();
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
