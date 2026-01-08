import contextMenu from "electron-context-menu";
import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  globalShortcut,
  shell,
  Menu,
  session,
} from "electron";
import path from "path";
import fs from "fs";
import pkg from "electron-updater";
const { autoUpdater } = pkg;

var fsPromises = fs.promises;
let mainWindow;
app.commandLine.appendSwitch("log-level", "3");
const dirname = app.getAppPath();
var preload_path = path.join(dirname, "preload.js");

ipcMain.handle("get-webview-actions", async () => {
  try {
    // const pathModule = path.default;
    const actionsPath = path.join(app.getAppPath(), "webviewActions.cjs");
    const content = await fsPromises.readFile(actionsPath, "utf8");
    return content;
  } catch (err) {
    console.error("Failed to read webviewActions.cjs in main:", err);
    return "";
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: preload_path,
      enableRemoteModule: false,
      webviewTag: true,
      nodeIntegration: true,
      backgroundThrottling: false,
      nativeWindowOpen: true,
      contextIsolation: true,
      // sandbox: false,
      webSecurity: false,
    },
  });

  contextMenu({
    window: mainWindow,
    showInspectElement: true,
  });

  mainWindow.loadFile(path.join(dirname, "index.html"));
  mainWindow.maximize();
  ipcMain.on("show-context-menu", (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Inspect Element",
        click: () => {
          event.reply("inspect-element", params);
        },
      },
      {
        label: "Create New Tab",
        click: () => {
          event.reply("create-new-tab", params);
        },
      },
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });
}

app.whenReady().then(() => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  createWindow();

  globalShortcut.register("CommandOrControl+I", () => {
    mainWindow.openDevTools();
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    // mainWindow.webContents.send("open-webview-devtools");
    mainWindow.openDevTools();
  });
  session.defaultSession.on("will-download", (event, item, webContents) => {
    // Set the save path for the download
    item.setSavePath(app.getPath("downloads") + "/" + item.getFilename());

    // Monitor the download progress
    item.on("updated", (event, state) => {
      if (state === "interrupted") {
        console.log("Download is interrupted but can be resumed");
      } else if (state === "progressing") {
        if (item.isPaused()) {
          console.log("Download is paused");
        } else {
          console.log(`Received bytes: ${item.getReceivedBytes()}`);
          console.log(`Total bytes: ${item.getTotalBytes()}`);
          const progress =
            (item.getReceivedBytes() / item.getTotalBytes()) * 100;
          console.log(`Download progress: ${progress.toFixed(2)}%`);
          console.log(item.getURL());
          // Send download progress to renderer process
          mainWindow.webContents.send("download-progress", {
            url: item.getURL(),
            progress: progress.toFixed(2),
          });
        }
      }
    });

    item.once("done", (event, state) => {
      if (state === "completed") {
        console.log("Download successfully completed");
      } else {
        console.log(`Download failed: ${state}`);
      }
    });
  });

  // Handle open-new-tab event
  ipcMain.on("open-new-tab", (event, url) => {
    console.log("Received open-new-tab message with URL:", url);
    mainWindow.webContents.send("create-new-tab", url);
  });

  ipcMain.on("reset-app", (event) => {
    console.log("Received reset-app message");
    app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
    app.exit(0);
  });
});
app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

ipcMain.handle("choose-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

async function getMoviesRecursively(folders) {
  const movieExt = /\.(mp4|mkv|avi|mov|wmv|flv)$/i;
  const results = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error("Failed to read directory:", dir, err);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const icon = await app.getFileIcon(fullPath, { size: "normal" });

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && movieExt.test(entry.name)) {
        results.push({
          name: entry.name,
          path: fullPath,
          icon: icon.toDataURL(),
        });
      }
    }
  }
  for (const folder of folders) {
    await walk(folder);
  }
  return results;
}

// Return list of movie files (name + full path) in given folder
ipcMain.handle("get-movies", async (_, folder) => {
  console.log("Folder: ", folder);
  if (!folder) return [];
  try {
    const movies = await getMoviesRecursively([folder]);
    return movies;
  } catch (err) {
    console.error("Failed to read folder", err);
    return [];
  }
});

ipcMain.handle("get-all-movies", async () => {
  const folders = ["G:Entertainment", "F:Entertainment"];
  try {
    const movies = await getMoviesRecursively(folders);
    return movies;
  } catch (err) {
    console.error("Failed to read folder", err);
    return [];
  }
});

ipcMain.handle("get-all-folders", async () => {
  if (!folder) return [];
  try {
    const entries = await fsPromises.readdir(folder);
    const movieExt = /\.(mp4|mkv|avi|mov|wmv|flv)$/i;
    const movies = entries
      .filter((name) => movieExt.test(name))
      .map((name) => ({ name, path: path.join(folder, name) }));
    return movies;
  } catch (err) {
    console.error("Failed to read folder", err);
    return [];
  }
});

ipcMain.handle("open-path", async (_, filePath) => {
  try {
    const result = await shell.openPath(filePath);
    if (typeof result === "string" && result.length) {
      console.error("shell.openPath error:", result);
      return { success: false, error: result };
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to open path:", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("reveal-in-folder", async (_, filePath) => {
  let abs = path.normalize(filePath);
  if (!path.isAbsolute(abs)) {
    abs = path.resolve(abs);
  }
  try {
    shell.showItemInFolder(abs);
    return { success: true };
  } catch (err) {
    console.error("reveal-in-folder error", err);
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("delete-path", async (_, filePath) => {
  try {
    await fsPromises.unlink(filePath);
    return { success: true };
  } catch (err) {
    console.error("delete-path error", err);
    return { success: false, error: String(err) };
  }
});
