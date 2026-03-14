const { contextBridge, ipcRenderer } = require("electron");
const toast = {
  show: function (msg) {
    let toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.left = "10%";
    toast.style.transform = "translateX(-50%)";
    toast.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    toast.style.color = "#fff";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "5px";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "1000";

    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add("show");
    }, 100);
    setTimeout(
      function () {
        toast.classList.remove("show");
        setTimeout(function () {
          document.body.removeChild(toast);
        }, 300);
      },

      3000,
    );
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
  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  getWebviewActions: async () => ipcRenderer.invoke("get-webview-actions"),
  toast: (msg) => toast.show(msg),
});
