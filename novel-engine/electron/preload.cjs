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

  // アプリ情報
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),

  // Electron 環境かどうか
  isElectron: true,
});
