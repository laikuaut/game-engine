const { contextBridge, ipcRenderer } = require("electron");

// レンダラプロセスに安全な API を公開
contextBridge.exposeInMainWorld("electronAPI", {
  // セーブ/ロード
  saveFile: (filename, data) => ipcRenderer.invoke("save-file", { filename, data }),
  loadFile: (filename) => ipcRenderer.invoke("load-file", { filename }),
  listSaves: () => ipcRenderer.invoke("list-saves"),

  // ファイルダイアログ
  selectFile: (options) => ipcRenderer.invoke("select-file", options || {}),
  selectFolder: (options) => ipcRenderer.invoke("select-folder", options || {}),

  // プロジェクト管理
  projectList: () => ipcRenderer.invoke("project-list"),
  projectGet: (id) => ipcRenderer.invoke("project-get", id),
  projectSave: (project) => ipcRenderer.invoke("project-save", project),
  projectDelete: (id) => ipcRenderer.invoke("project-delete", id),

  // アセット管理
  assetUpload: (projectId, type, filename, base64Data) =>
    ipcRenderer.invoke("asset-upload", { projectId, type, filename, data: base64Data }),
  assetList: (projectId, type) => ipcRenderer.invoke("asset-list", { projectId, type }),
  assetDelete: (projectId, type, filename) =>
    ipcRenderer.invoke("asset-delete", { projectId, type, filename }),
  assetGetUrl: (projectId, type, filename) =>
    ipcRenderer.invoke("asset-get-url", { projectId, type, filename }),

  // ゲームエクスポート・ビルド
  exportGame: (projectId) => ipcRenderer.invoke("export-game", projectId),
  exportGameCleanup: () => ipcRenderer.invoke("export-game-cleanup"),
  runBuild: (opts) => ipcRenderer.invoke("run-build", opts),
  onBuildLog: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("build-log", handler);
    return () => ipcRenderer.removeListener("build-log", handler);
  },

  // アプリ情報
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  // アプリ終了
  quitApp: () => ipcRenderer.invoke("quit-app"),

  // Electron 環境かどうか
  isElectron: true,
});
