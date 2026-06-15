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
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  maximizeWindow: () => ipcRenderer.send("maximize-window"),
  restoreWindow: () => ipcRenderer.send("restore-window"),
  closeWindow: () => ipcRenderer.send("close-window"),
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
   importWorkflowJSON: (fileName) =>
    ipcRenderer.invoke("import-workflow", fileName),
   addBookmark:(obj)=>ipcRenderer.invoke("add-bookmark",obj),
   getBookmark:()=>ipcRenderer.invoke("import-bookmark"),
   delete_bookmark:(obj)=>ipcRenderer.invoke("delete-bookmark",obj),
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



const globalVars = {
  get: (key) => ipcRenderer.invoke("get-global-var", key),
  set: (key, value) => ipcRenderer.send("set-global-var", key, value),
  reset: () => ipcRenderer.send("reset-global-var"),
};
contextBridge.exposeInMainWorld("globalVars", globalVars);

const actions = {
  getElementByXpath: (path) => {
    return document.evaluate(
      path,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
  },
  sleep: (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  getXpathFromElement: function getXpathFromElement(element) {
    if (element && element.id) {
      // If the element has a unique ID, we can instantly form a reliable relative XPath
      return `//*[@id="${element.id}"]`;
    }

    if (element === document.body) {
      return "/html/body";
    }

    let siblingCount = 0;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];

    // Loop through siblings to find the element's exact index position
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        // Recurse up to the parent element and append current element's tag name and index
        return (
          getXpathFromElement(element.parentNode) +
          "/" +
          element.tagName.toLowerCase() +
          "[" +
          (siblingCount + 1) +
          "]"
        );
      }
      // Only count siblings of the exact same HTML tag type
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        siblingCount++;
      }
    }
  },
  openNewTab: (url, script) => {
    console.log("Sending message to open new tab with URL:", url, script);
    // Use the context-bridge exposed API in the page context

    ipcRenderer.send("open-new-tab", { url: url, script: script });
  },
};
contextBridge.exposeInMainWorld("actions", actions);
console.log(actions);
