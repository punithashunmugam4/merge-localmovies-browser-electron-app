// Ailas renderer process communication setup
const localMovies = document.getElementById("show-local-movies");
const database = document.getElementById("show-database");
const vault = document.getElementById("show-vault");
localMovies.addEventListener("click", () => {
  addTab(
    "D:\\Electron app projects\\merge-localmovies-browser\\localmovies.html",
  );
});
database.addEventListener("click", () => {
  addTab("D:\\Electron app projects\\merge-localmovies-browser\\database.html");
});
vault.addEventListener("click", () => {
  addTab("D:\\Electron app projects\\merge-localmovies-browser\\vault.html");
});

const resetBtn = document.getElementById("reset-app");
resetBtn.addEventListener("click", () => {
  window.electron.send("reset-app");
});

// toggle theme

function setWebviewTheme(theme) {
  const webviews = document.querySelectorAll(".tab-content-frame");
  console.log("Setting webview theme for webviews:", webviews[0]);
  console.log(
    "Setting webview theme for webviews:",
    webviews[0].contentDocument,
  );
  if (!webviews || !webviews[0]) return;
  try {
    webviews.forEach((webview) => {
      console.log("Setting webview theme to:", theme, webview);
      webview.executeJavaScript(
        `document.body.classList.toggle('light-theme', ${theme === "light"})`,
      );
    });
  } catch (ex) {
    console.warn("Could not set webview theme", ex);
  }
}

function applyTheme(theme, skipSave = false) {
  if (!theme) return;
  document.body.classList.toggle("light-theme", theme === "light");
  setWebviewTheme(theme);
  if (!skipSave) {
    localStorage.setItem("theme", theme);
  }
  document.getElementById("knob").innerText = theme === "light" ? "🌞" : "🌙";
  window.electron.toast(`Theme set to ${theme}.`);
}
const switch_ele = document.getElementById("myToggle");
const toggleInput = document.getElementById("toggleInput");

function toggleTheme(isChecked) {
  toggleInput.checked = !!isChecked;
  switch_ele.classList.toggle("on", isChecked);
  switch_ele.classList.toggle("aria-checked", isChecked ? "true" : "false");
  const theme = isChecked ? "light" : "dark";
  applyTheme(theme);
}
switch_ele.addEventListener("click", () => toggleTheme(!toggleInput.checked));
toggleInput.addEventListener("change", toggleTheme);

function initTheme() {
  const theme = localStorage.getItem("theme") || "dark";
  // applyTheme(theme, true);
  toggleTheme(theme === "light");
}

var webview = document.querySelector(".tab-content-frame.active");
const context_listener = (event) => {
  webview = document.querySelector(".tab-content-frame.active");
  event.preventDefault();
  const bounds = webview.getBoundingClientRect();
  const params = {
    x: event.params.x,
    y: event.params.y,
    url: event.params.linkURL,
  };
  console.log("Context menu requested at:", params);
  window.electron.showContextMenu(params);
};
webview.addEventListener("context-menu", context_listener);

window.electron.receive?.("reload-webview", () => {
  let activeWebview = document.querySelector(".tab-content-frame.active");
  console.log("Reloading on ctrl+r: ", activeWebview);
  if (activeWebview && typeof activeWebview.reload === "function") {
    activeWebview.reload();
  }
});

let actions = "";
window.electron
  .getWebviewActions()
  .then((data) => {
    actions = data || "";
    eval(actions);
    console.log("Webview actions loaded in renderer", data);

    api_call();
  })
  .catch((err) => {
    console.error(
      "Error loading webviewActions.cjs via getWebviewActions:",
      err,
    );
  });

var url = document.getElementById("url-bar").value;
var activeWebview = webview;
function inpageloading(url) {
  const urlObj = url.includes("http") ? new URL(url) : url;
  console.log("URL submitted:", url);
  if (document.querySelectorAll(".tab").length > 0) {
    const activeTab = document.querySelector(".tab.active");
    activeTab.setAttribute("data-url", url);
    activeWebview = document.querySelector(".tab-content-frame.active");
    activeWebview.setAttribute("src", url);
    let tabName = url.includes("http")
      ? urlObj.hostname.replace("www.", "")
      : url.split("/").pop().split(".html")[0].split("browser")[0];
    tabName = tabName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    console.log("Setting active tab name to:", tabName);
    activeTab.innerHTML = `${tabName} <button class="close-tab">&times;</button>`;
  } else addTab(url);
}

document.getElementById("url-form").addEventListener("submit", (event) => {
  event.preventDefault();
  url = document.getElementById("url-bar").value;
  inpageloading(url);
});

const tabclicked = (event) => {
  console.log("tab clicked");
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  event.currentTarget.classList.add("active");

  document.querySelectorAll(".tab-content-frame").forEach((tabContent) => {
    tabContent.classList.remove("active");
    tabContent.classList.add("hidden");
  });

  const tabId = event.currentTarget.getAttribute("data-tab-id");
  var url = event.currentTarget.getAttribute("data-url");
  document.getElementById(`frame-${tabId}`).classList.remove("hidden");
  document.getElementById(`frame-${tabId}`).classList.add("active");
  document.getElementById("url-bar").value = url;
};

const closeTab = (event) => {
  event.stopPropagation();
  const tab = event.currentTarget.parentElement;
  const tabId = parseInt(tab.getAttribute("data-tab-id"));
  const webview = document.getElementById(`frame-${tabId}`);
  const isactive = tab.classList.contains("active");
  console.log(isactive);
  tab.remove();
  webview.remove();

  // Activate the previous tab if there are any remaining tabs
  const remainingTabs = document.querySelectorAll(".tab");
  let newActiveTabId;
  if (remainingTabs.length > 0) {
    if (isactive) {
      remainingTabs.forEach((tab) => tab.classList.remove("active"));
      for (let i = remainingTabs.length - 1; i >= 0; i--) {
        console.log("looping: ", remainingTabs[i].getAttribute("data-tab-id"));
        if (parseInt(remainingTabs[i].getAttribute("data-tab-id")) < tabId) {
          newActiveTabId = parseInt(
            remainingTabs[i].getAttribute("data-tab-id"),
          );
          console.log("New active Tab id: ", newActiveTabId);
          break;
        }
      }

      const newActiveTab = document.querySelector(
        `.tab[data-tab-id="${newActiveTabId}"]`,
      );
      newActiveTab?.classList?.add("active");

      const newActiveWebview = document.getElementById(
        `frame-${newActiveTabId}`,
      );
      newActiveWebview?.classList?.remove("hidden");
      newActiveWebview?.classList?.add("active");
      console.log("New active Tab id: ", newActiveTabId);
      document.getElementById("url-bar").value =
        newActiveTab?.getAttribute("data-url");
    }
  } else {
    document.getElementById("url-bar").value = "";
  }
};

const addTab = (
  url = "D:\\Electron app projects\\merge-localmovies-browser\\blank.html",
  script = "",
) => {
  url =
    url === ""
      ? "D:\\Electron app projects\\merge-localmovies-browser\\blank.html"
      : url;

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-content-frame").forEach((tabContent) => {
    tabContent.classList.remove("active");
    tabContent.classList.add("hidden");
  });

  // const newTabId = document.querySelectorAll(".tab").length + 1;
  const allTabs = document.querySelectorAll(".tab");
  const newTabId =
    (parseInt(allTabs[allTabs.length - 1]?.getAttribute("data-tab-id")) || 0) +
    1;

  let newElement = document.createElement("div");
  newElement.classList.add("tab");
  newElement.classList.add("active");
  newElement.setAttribute("data-tab-id", newTabId);
  newElement.setAttribute("data-url", url);
  console.log("Adding new tab with URL:", url);
  // Extract hostname from URL to use as tab name
  let tabName = "";
  let urlObj;
  if (url.includes("blank.html")) {
    tabName = "New Tab";
  } else {
    urlObj = url.includes("http") ? new URL(url) : url;
    console.log("URL Object:", urlObj);
    tabName = url.includes("http")
      ? urlObj.hostname.replace("www.", "")
      : url?.split("/").pop().split(".html")[0].split("browser")[1];
    tabName = tabName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }

  console.log("Setting new tab name to:", tabName);
  newElement.innerHTML = `${tabName} <button class="close-tab">&times;</button>`;

  newElement.addEventListener("click", tabclicked);
  newElement.querySelector(".close-tab").addEventListener("click", closeTab);
  document
    .querySelector(".tabs")
    .insertBefore(newElement, document.getElementById("add-tab"));

  let newWebview = document.createElement("webview");
  newWebview.classList.add("tab-content-frame");
  newWebview.classList.add("active");
  newWebview.setAttribute("id", `frame-${newTabId}`);
  newWebview.setAttribute("tabindex", newTabId);

  newWebview.setAttribute("src", url);

  newWebview.preload = "preload.cjs";
  document.getElementById("browser").appendChild(newWebview);

  // Inject common functions into the new webview
  // if (!url.includes("http")) {
  newWebview.addEventListener("dom-ready", () => {
    if (actions) newWebview.executeJavaScript(actions);
    const theme = localStorage.getItem("theme") || "dark";
    newWebview.executeJavaScript(`
      document.body.classList.toggle('light-theme', ${theme === "light"})
    `);
  });
  // }

  // Add event listeners for the new webview
  newWebview.addEventListener("did-start-loading", () => {
    console.log("Webview started loading");
    document.getElementById("url-bar").style.backgroundSize = "0% 100%";
  });

  newWebview.addEventListener("did-stop-loading", () => {
    console.log("Webview stopped loading");
    document.getElementById("url-bar").style.backgroundSize = "100% 100%";
    setTimeout(() => {
      document.getElementById("url-bar").style.backgroundSize = "0% 100%";
    }, 500);
    url = document.getElementById("url-bar").value;
    newWebview.executeJavaScript(script);
    newWebview.addEventListener("did-navigate-in-page", (event) => {
      newWebview.executeJavaScript(electron.continue_verification_script);
    });
    newWebview.addEventListener("beforeunload", (event) => {
      event.preventDefault();
      event.returnValue = "";
    });
    // Prevent page refresh, navigate and window.location.href functions
    // newWebview.executeJavaScript(`
    //   window.addEventListener('beforeunload', (event) => {
    //     event.preventDefault();
    //     event.returnValue = '';
    //   });
    // `);
  });

  newWebview.addEventListener("did-navigate", (event) => {
    console.log("Webview navigated to:", event.url);
    document.getElementById("url-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-navigate-in-page", (event) => {
    console.log("Webview navigated in page to:", event.url);
    document.getElementById("url-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-frame-finish-load", (event) => {
    if (!event.isMainFrame) return;
    newWebview.executeJavaScript("window.location.href").then((url) => {
      console.log("Webview frame finished loading:", url);
      if (url.includes("blank.html")) url = "";
      document.getElementById("url-bar").value = url;
      newElement.setAttribute("data-url", url);
    });
  });

  newWebview.addEventListener("did-fail-load", (event) => {
    console.log("Failed to load:", event.errorDescription);
    document.getElementById("url-bar").value =
      `Error: ${event.errorDescription}`;
  });
  newWebview.addEventListener("context-menu", context_listener);
  return newWebview;
};

const waitForWebviewLoad = (
  webview = document.querySelector(".tab-content-frame.active"),
  callback,
) => {
  webview.addEventListener("did-finish-load", () => {
    callback();
  });
};
document.getElementById("add-tab").addEventListener("click", () => {
  // const url = document.getElementById("url-bar").value;
  addTab("");
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", tabclicked);
  tab.querySelector(".close-tab").addEventListener("click", closeTab);
});

// Add event listeners for the initial webview
const initialWebview = webview;
initialWebview.addEventListener("dom-ready", () => {
  initialWebview.executeJavaScript(actions);
  const theme = localStorage.getItem("theme") || "dark";
  initialWebview.executeJavaScript(`
      document.body.classList.toggle('light-theme', ${theme === "light"})
    `);
});

initialWebview.addEventListener("did-start-loading", () => {
  console.log("Initial webview started loading");
  document.getElementById("url-bar").style.backgroundSize = "0% 100%";
});

initialWebview.addEventListener("did-stop-loading", () => {
  console.log("Initial webview stopped loading");
  document.getElementById("url-bar").style.backgroundSize = "100% 100%";
  setTimeout(() => {
    document.getElementById("url-bar").style.backgroundSize = "0% 100%";
  }, 500);

  // Prevent page refresh, navigate and window.location.href functions
  // initialWebview.executeJavaScript(`
  //   window.addEventListener('beforeunload', (event) => {
  //     event.preventDefault();
  //     event.returnValue = '';
  //   });
  // `);
});

initialWebview.addEventListener("did-navigate", (event) => {
  console.log("Initial webview navigated to:", event.url);
  document.getElementById("url-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-navigate-in-page", (event) => {
  console.log("Initial webview navigated in page to:", event.url);
  document.getElementById("url-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-frame-finish-load", (event) => {
  if (!event.isMainFrame) return;
  initialWebview.executeJavaScript("window.location.href").then((url) => {
    console.log("Initial webview frame finished loading:", url);
    document.getElementById("url-bar").value = url;
    document.querySelector(".tab.active").setAttribute("data-url", url);
  });
});

initialWebview.addEventListener("did-fail-load", (event) => {
  console.log("Failed to load:", event.errorDescription);
  document.getElementById("url-bar").value = `Error: ${event.errorDescription}`;
});

activeWebview.addEventListener("beforeunload", (event) => {
  console.log("do not close");
  event.preventDefault();
  event.returnValue = "";
});

// Interact with webview content
const interactwithwebview = (webview, script) => {
  console.log("interact with webview");
  webview.executeJavaScript(script);
};

window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  console.log("DOM content loaded");
  document.getElementById("interact-webview").addEventListener("click", () => {
    url = document.getElementById("url-bar").value;
    console.log("Interact with webview clicked", url);
    if (url.includes("https://moviesmod.how/download")) {
      let webview = document.querySelector(".tab-content-frame.active");
      interactwithwebview(webview, electron.moviesmod_script);
    }
  });
});

// Listen for the 'open-webview-devtools' event from the main process
window.electron.receive("open-webview-devtools", () => {
  let activeWebview = document.querySelector(".tab-content-frame.active");
  activeWebview?.openDevTools();
});

window.electron.receive("create-new-tab", (data) => {
  addTab(data.url, data.script);
});

window.electron.receive("inspect-element", (event) => {
  webview = document.querySelector(".tab-content-frame.active");
  webview?.inspectElement(event.x, event.y);
});
