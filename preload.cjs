const { contextBridge, ipcRenderer } = require("electron");

const toast = {
  show(msg) {
    const toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.innerText = msg;
    toastElement.style.position = "fixed";
    toastElement.style.bottom = "20px";
    toastElement.style.left = "10%";
    toastElement.style.transform = "translateX(-50%)";
    toastElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    toastElement.style.color = "#fff";
    toastElement.style.padding = "10px 20px";
    toastElement.style.borderRadius = "5px";
    toastElement.style.fontSize = "14px";
    toastElement.style.zIndex = "1000";

    document.body.appendChild(toastElement);

    setTimeout(() => {
      toastElement.classList.add("show");
    }, 100);

    setTimeout(() => {
      toastElement.classList.remove("show");
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 300);
    }, 3000);
  },
};

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
  addVaultValue: (obj) => ipcRenderer.invoke("add-vault-value", obj),
  editVaultValue: (obj) => ipcRenderer.invoke("edit-vault-value", obj),
  deleteVaultValue: (obj) => ipcRenderer.invoke("delete-vault-value", obj),
  fetchVault: () => ipcRenderer.invoke("fetch-vault"),
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  getWebviewActions: async () => ipcRenderer.invoke("get-webview-actions"),
  fetchGoogleSheetPreview: async (obj) =>
    ipcRenderer.invoke("fetch-google-sheet-preview", obj),
  toast: (msg) => toast.show(msg),
});
