const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  showContextMenu: (params) => ipcRenderer.send("show-context-menu", params),
  getAllMovies: () => ipcRenderer.invoke("get-all-movies"),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  getMovies: (folder) => ipcRenderer.invoke("get-movies", folder),
  openPath: (filePath) => ipcRenderer.invoke("open-path", filePath),
  revealInFolder: (p) => ipcRenderer.invoke("reveal-in-folder", p),
  deletePath: (p) => ipcRenderer.invoke("delete-path", p),
  addDBValue: (obj) => ipcRenderer.invoke("add-db-value", obj),
  editDBValue: (obj) => ipcRenderer.invoke("edit-db-value", obj),
  deleteDBValue: (obj) => ipcRenderer.invoke("delete-db-value", obj),
  fetchDB: () => ipcRenderer.invoke("fetch-db"),
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  getWebviewActions: async () => ipcRenderer.invoke("get-webview-actions"),
});
