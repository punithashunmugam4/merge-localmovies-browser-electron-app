import contextMenu from "electron-context-menu";
import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
  session,
} from "electron";
import electron from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import { pathToFileURL } from "url";
import pkg from "electron-updater";
import Database from "better-sqlite3";
import { google } from "googleapis";
import util from "util";
import { createRequire } from "module";
const requireC = createRequire(import.meta.url);
const { autoUpdater } = pkg;

var fsPromises = fs.promises;
let mainWindow;
app.commandLine.appendSwitch("log-level", "3");
global.stored_vars = {};

let logger = null;
try {
  logger = requireC(path.join(app.getAppPath(), "logger.cjs"));
} catch (err) {
  console.error("Failed to load logger module:", err);
}

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
import http from "http";

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

function formatLogArgs(args) {
  return args
    .map((arg) =>
      typeof arg === "string" ? arg : util.inspect(arg, { depth: 2 }),
    )
    .join(" ");
}

function writeLog(level, ...args) {
  const message = formatLogArgs(args);
  if (logger) {
    if (typeof logger[level] === "function") {
      logger[level](message);
    } else if (typeof logger.log === "function") {
      logger.log(level, message);
    }
  }
  if (typeof originalConsole[level] === "function") {
    originalConsole[level](...args);
  }
}
console.log = (...args) => writeLog("info", ...args);
console.info = (...args) => writeLog("info", ...args);
console.warn = (...args) => writeLog("warn", ...args);
console.error = (...args) => writeLog("error", ...args);
console.debug = (...args) => writeLog("debug", ...args);

process.on("uncaughtException", (error) => {
  console.error("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection", reason);
});

app.disableHardwareAcceleration();

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit(); // quit if another instance is already running
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const dirname = app.getAppPath();
var preload_path = path.join(dirname, "preload.cjs");
const googleCredentialsPath = path.join(
  dirname,
  "utility-logic-467214-v7-537815353d40.json",
);

let dbDir, db;
dbDir = path.resolve(process.cwd());
try {
  if (app && typeof app.getAppPath === "function") {
    dbDir = path.join(app.getAppPath(), "electron_db");
  }
} catch (err) {
  // ignore and keep cwd as fallback
}

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "dbstore.db");
try {
  db = new Database(dbPath);
} catch (err) {
  console.error("Failed to open DB at", dbPath, err);
  const fallback = path.join(app.getPath("temp"), "dbstore-fallback.db");
  console.warn("Using fallback DB at", fallback);
  db = new Database(fallback);
}
db.pragma("journal_mode = WAL");
db.pragma("cache_size = 32000");
console.log(db.pragma("cache_size", { simple: true }));


async function createGoogleSheetsAuthClient() {
  const credentialsRaw = await fsPromises.readFile(
    googleCredentialsPath,
    "utf8",
  );
  const credentials = JSON.parse(credentialsRaw);

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      "Please replace the current Google client-secret JSON with a service-account key JSON that includes `client_email` and `private_key`.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return await auth.getClient();
}

ipcMain.handle("fetch-google-sheet-preview", async (_, obj) => {
  try {
    if (!fs.existsSync(googleCredentialsPath)) {
      return {
        success: false,
        error: "Google credentials file not found.",
      };
    }

    const authClient = await createGoogleSheetsAuthClient();
    const service = google.sheets({ version: "v4", auth: authClient });
    const spreadsheetId = obj.spreadsheetId;
    const res = await service.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1",
    });

    return {
      success: true,
      data: res.data.values || [],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn("Google Sheets preview skipped:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
});
function getExecutablePath() {
  // Always use the app installation directory for loading app.js
  return path.join(app.getAppPath(), "app.js");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    show: false,
    frame: false,
    minWidthw: 1200,
    icon: path.join(dirname, "icon.png"),
    webPreferences: {
      preload: preload_path,
      // enableRemoteModule: false,
      webviewTag: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
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
      {
        label: "Reload",
        click: () => {
          event.reply("reload-webview");
        },
      },
    ]);
    contextMenu.popup(BrowserWindow.fromWebContents(event.sender));
  });

  const menu = electron.Menu.buildFromTemplate([
    {
      label: "Open main page devtools",
      accelerator: "CommandOrControl+I",
      click: () => mainWindow.webContents.openDevTools({ mode: "detach" }),
    },
    {
      label: "Open guest page devtools",
      accelerator: "CommandOrControl+Shift+I",
      click: () => mainWindow.webContents.send("open-webview-devtools"),
    },
    {
      label: "Reload Webview",
      accelerator: "CommandOrControl+R",
      click: () => mainWindow.webContents.send("reload-webview"),
    },
  ]);
  electron.Menu.setApplicationMenu(menu);
}
ipcMain.on("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow) mainWindow.maximize();
});
ipcMain.on("restore-window", () => {
  if (mainWindow) mainWindow.restore();
});

ipcMain.on("close-window", () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(async () => {
  const startScript = getExecutablePath();

  // Dynamic require of your app entry point (use createRequire in ESM)
  try {
    // Avoid requiring the renderer `index.js` from the main process
    if (path.basename(startScript) !== "index.js") {
      await import(pathToFileURL(startScript).href);
    } else {
      console.log("Skipping require of renderer index.js from main process");
    }
  } catch (err) {
    console.error("Failed to require start script:", err);
  }

  if (app.isPackaged) {
    try {
      const updaterPath = path.join(app.getAppPath(), "updater.cjs");
      if (fs.existsSync(updaterPath)) {
        const updater = requireC(updaterPath);
        if (updater && typeof updater.checkForFileUpdates === "function") {
          updater
            .checkForFileUpdates()
            .catch((err) => console.error("Updater error:", err));
        } else {
          console.log("No checkForFileUpdates export; skipping updater");
        }
      } else {
        console.log("No updater.cjs found; skipping updates");
      }
    } catch (err) {
      console.error("Failed to run updater:", err);
    }
  } else {
    console.log("Development mode detected; skipping update check.");
  }

  ipcMain.handle("get-app-version", () => app.getVersion());

  ipcMain.on("renderer-log", (event, payload) => {
    if (!payload || !payload.level || !payload.message) return;
    if (logger) {
      const message = payload.message;
      const metadata = payload.metadata || "";
      if (typeof logger[payload.level] === "function") {
        logger[payload.level](message, metadata);
      } else if (typeof logger.log === "function") {
        logger.log(payload.level, message, metadata);
      }
    }
  });

  ipcMain.on("renderer-error", (event, payload) => {
    if (!payload) return;
    const message = payload.message || "Renderer error";
    const metadata = payload;
    if (logger) {
      logger.error(message, metadata);
    }
    originalConsole.error("Renderer error:", payload);
  });

  createWindow();

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

  ipcMain.on("load-url", (event, url) => {
    mainWindow.webContents.send("load-url-in-webview", url);
  });
  // Handle open-new-tab event
  ipcMain.on("open-new-tab", (event, url) => {
    console.log("Received open-new-tab message with URL:", url);
    mainWindow.webContents.send("create-new-tab", url);
  });

  ipcMain.on("reset-app", (event) => {
    console.log("Received reset-app message");
    db.close();
    app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
    app.exit(0);
  });
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
        let stats = null;
        try {
          stats = await fsPromises.stat(fullPath);
        } catch (err) {
          console.warn("Failed to stat file:", fullPath, err);
        }
        results.push({
          name: entry.name,
          path: fullPath,
          icon: icon.toDataURL(),
          size: stats?.size ?? 0,
          createdAt: stats?.birthtimeMs ?? stats?.ctimeMs ?? 0,
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

ipcMain.handle("fetch-db", async () => {
  try {
    const rows = db
      .prepare(`SELECT * FROM "electron-database" ORDER BY key`)
      .all();
    console.log("Fetched rows: ", rows);
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
ipcMain.handle("add-db-value", async (_, obj) => {
  try {
    db.exec(`
  CREATE TABLE IF NOT EXISTS "electron-database" (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);
    const stmt = db.prepare(
      `INSERT INTO "electron-database" (key, value) VALUES (?, ?)`,
    );
    const info = stmt.run(obj.key, obj.value);
    console.log("info changes: ", info.changes);
    return { success: true, data: info.changes };
  } catch (err) {
    // unique constraint -> key already exists
    if (
      err &&
      (err.code === "SQLITE_CONSTRAINT" ||
        /UNIQUE|CONSTRAINT/i.test(err.message))
    ) {
      return { success: false, error: "KEY_EXISTS" };
    }
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("edit-db-value", async (_, obj) => {
  try {
    const stmt = db.prepare(
      `UPDATE "electron-database" SET value = ? WHERE key = ?`,
    );
    const info = stmt.run(obj.value, obj.key);
    return { success: info.changes > 0, changes: info.changes };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("delete-db-value", async (_, obj) => {
  try {
    const stmt = db.prepare(`DELETE FROM "electron-database" WHERE key = ?`);
    const info = stmt.run(obj.key);
    return { success: info.changes > 0, changes: info.changes };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

// Vault handling

ipcMain.handle("add-vault-value", async (_, obj) => {
  try {
    db.exec(`
  CREATE TABLE IF NOT EXISTS "vault-database" (
    key TEXT PRIMARY KEY,
    username TEXT,
    password TEXT,
    comments TEXT
  );
`);
    const stmt = db.prepare(
      `INSERT INTO "vault-database" (key, username, password, comments) VALUES (?, ?, ?, ?)`,
    );
    const info = stmt.run(obj.key, obj.username, obj.password, obj.comments);
    console.log("info changes: ", info.changes);
    return { success: true, data: info.changes };
  } catch (err) {
    // unique constraint -> key already exists
    if (
      err &&
      (err.code === "SQLITE_CONSTRAINT" ||
        /UNIQUE|CONSTRAINT/i.test(err.message))
    ) {
      return { success: false, error: "KEY_EXISTS" };
    }
    return { success: false, error: String(err) };
  }
});
ipcMain.handle("edit-vault-value", async (_, obj) => {
  try {
    const stmt = db.prepare(
      `UPDATE "vault-database" SET username = ?, password = ?, comments = ? WHERE key = ?`,
    );
    const info = stmt.run(obj.username, obj.password, obj.comments, obj.key);
    return { success: info.changes > 0, changes: info.changes };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("delete-vault-value", async (_, obj) => {
  try {
    const stmt = db.prepare(`DELETE FROM "vault-database" WHERE key = ?`);
    const info = stmt.run(obj.key);
    return { success: info.changes > 0, changes: info.changes };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
ipcMain.handle("fetch-vault", async () => {
  try {
    const rows = db

      .prepare(`SELECT * FROM "vault-database" ORDER BY key`)
      .all();
    console.log("Fetched vault rows: ", rows);
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle("import-workflow", async (event, fileName) => {
  const json_filepath = path.join(
    app.getAppPath(),
    "bot-script-tree",
    fileName,
  );

  try {
    if (!fs.existsSync(json_filepath)) {
      return { error: `File not found at specified path: ${json_filepath}` };
    }
    const rawData = fs.readFileSync(json_filepath, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Failed to parse JSON file:", error);
    return { error: "Invalid JSON structure" };
  }
});


ipcMain.handle("import-bookmark",async()=>{
    try {
    const rows = db

      .prepare(`SELECT * FROM "bookmark" ORDER BY id`)
      .all();
    console.log("Fetched vault rows: ", rows);
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: String(err) };
  }
})
ipcMain.handle("add-bookmark", async (_, obj) => {
  try {
    db.exec(`
  CREATE TABLE IF NOT EXISTS "bookmark" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    url TEXT  NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
    const stmt = db.prepare(
      `INSERT INTO "bookmark" (name, url) VALUES (?, ?)`,
    );
    const info = stmt.run(obj.name, obj.url );
    console.log("info changes: ", info.changes);
    return { success: true, data: info };
  } catch (err) {
    // unique constraint -> key already exists
    if (
      err &&
      (err.code === "SQLITE_CONSTRAINT" ||
        /UNIQUE|CONSTRAINT/i.test(err.message))
    ) {
      return { success: false, error: "Bookmark URL exist" };
    }
    return { success: false, error: String(err) };
  }
});

function del_all_bookmark(){
   const info = db.prepare(
      `SELECT * FROM "bookmark"`
    ).all();
    console.log("info changes: ", info);
    info.forEach((e)=>{
  try {
    const s = db.prepare(`DELETE FROM "bookmark" WHERE id = ?`);
    const i = s.run(e.id);
    return { success: i.changes > 0, changes: i.changes };
  } catch (err) {
    return { success: false, error: String(err) };
  }
    })
    console.log("successfully deleted all book mark")
}
// del_all_bookmark();
ipcMain.handle("delete-bookmark", async (_, obj) => {
  console.log("delte message received: ",obj)
  try {
    const stmt = db.prepare(`DELETE FROM "bookmark" WHERE id = ?`);
    const info = stmt.run(obj.id);
    return { success: info.changes > 0, changes: info.changes };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.on("clean-temp",async ()=>{
  session.defaultSession.clearCache();
  session.defaultSession.clearStorageData();
  // let temp_paths=["C:\\Windows\\Temp","C:\\Users\\PUNITH~1\\AppData\\Local\\Temp","C:\\Windows\\prefetch"]
  const userHome = os.homedir(); 
    const temp_paths = [
      "C:\\Windows\\Temp",
      "C:\\Windows\\prefetch",
      "C:\\Windows\\SoftwareDistribution\\Download",
      "C:\\Windows\\Logs",
      "C:\\ProgramData\\Microsoft\\Network\\Downloader",
      path.join(userHome, "AppData\\Local\\Temp"),
      path.join(userHome, "AppData\\Local\\Microsoft\\Windows\\WER"),
      path.join(userHome, "AppData\\Local\\CrashDumps")
    ];
for (const targetFolder of temp_paths) {
      try {
        await fsPromises.access(targetFolder);
        const items = await fsPromises.readdir(targetFolder);
        const deletionPromises = items.map(async (item) => {
          const itemPath = path.join(targetFolder, item);
          try {
            await fsPromises.rm(itemPath, { recursive: true, force: true });
          } catch (err) {
            console.warn(`Skipped locked item: ${itemPath}`);
          }
        });

        // Execute all deletions for this folder in parallel
        await Promise.all(deletionPromises);
        console.log(`Successfully emptied contents of: ${targetFolder}`);

      } catch (folderError) {
        console.error(`Could not read or process folder ${targetFolder}:`, folderError.message);
      }
    }
  
})

ipcMain.handle("get-global-var", (event, key) => {
  return global.stored_vars[key];
});

ipcMain.on("set-global-var", (event, key, value) => {
  global.stored_vars = { ...global.stored_vars, [key]: value };
});

ipcMain.on("reset-global-var", () => {
  global.stored_vars = {};
});

app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  if (db) db.close();
});
