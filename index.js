// Ailas renderer process communication setup

import { interactWithWebview } from "./scripts.js";

var url = document.querySelector(".address-bar").value;
var activeWebview = document.querySelector(".tab-content-frame.active");
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
        `document.body.setAttribute("data-theme", "${theme}")`,
      );
    });
  } catch (ex) {
    console.warn("Could not set webview theme", ex);
  }
}

function initTheme() {
  const theme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("theme-toggle").innerHTML =
    theme === "light"
      ? '<span class="material-symbols-outlined">dark_mode</span>'
      : '<span class="material-symbols-outlined">light_mode</span>';
  setWebviewTheme(theme);
  window.electron.toast(`Theme set to ${theme}.`);
}

const toggleBtn = document.getElementById("theme-toggle");

toggleBtn.addEventListener("click", () => {
  // Check current theme state on the <html> tag
  const currentTheme = document.documentElement.getAttribute("data-theme");
  let theme;
  if (currentTheme === "light") {
    theme = "dark";
    document.documentElement.setAttribute("data-theme", theme);
    toggleBtn.innerHTML =
      '<span class="material-symbols-outlined">light_mode</span>';
    setWebviewTheme("dark");

    localStorage.setItem("theme", theme);
  } else {
    theme = "light";
    document.documentElement.setAttribute("data-theme", theme);
    toggleBtn.innerHTML =
      '<span class="material-symbols-outlined">dark_mode</span>';
    setWebviewTheme(theme);
    localStorage.setItem("theme", theme);
  }
  window.electron.toast(`Theme set to ${theme}.`);
});

//Window controls
document.getElementById("min-btn").addEventListener("click", () => {
  window.electron.minimizeWindow();
});
document.getElementById("max-btn").addEventListener("click", () => {
  if (
    document.getElementById("max-btn").getAttribute("data-state") ===
    "maximized"
  ) {
    window.electron.restoreWindow();
    document.getElementById("max-btn").setAttribute("data-state", "restored");
  } else {
    window.electron.maximizeWindow();
    document.getElementById("max-btn").setAttribute("data-state", "maximized");
  }
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.electron.closeWindow();
});

document.getElementById("refresh-btn").addEventListener("click", () => {
  let activeWebview = document.querySelector(".tab-content-frame.active");
  console.log("Reloading on refresh button click: ", activeWebview);
  if (activeWebview && typeof activeWebview.reload === "function") {
    activeWebview.reload();
  }
});

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

function getFaviconUrl(inputUrl) {
  try {
    // Clean up basic inputs missing http protocols so the URL parser doesn't crash
    let formattedUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    // Extract the hostname (domain)
    const urlObj = new URL(formattedUrl);
    const domain = urlObj.hostname;

    // Return the API string requesting a high-res (64px) version
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch (error) {
    // Fallback image or a local icon asset if the URL is completely broken
    return 'https://www.google.com/s2/favicons?sz=64&domain=electronjs.org'; 
  }
}

function create_bookmark_list(all_bookmarks){
  document.querySelector(".bookmark-list").innerHTML="";
  console.log("All bookmarks: ",all_bookmarks)
 if(Array.isArray(all_bookmarks) && all_bookmarks.length>0) all_bookmarks.forEach((info)=>{
const newbookmark=document.createElement("div");
newbookmark.classList.add("bookmark-item")
newbookmark.setAttribute("bookmark-url",info.url)
newbookmark.addEventListener("click",()=>{
   addTab(info.url)
})
let bm_icon=getFaviconUrl(info.url)
let domain;
 try {
    let formattedUrl = info.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    // Extract the hostname (domain)
    const urlObj = new URL(formattedUrl);
     domain = urlObj.hostname;
  } catch (error) {
   domain=info?.url?.split("https://")[1]?.split(".")[0];
  }
const newlist_innerhtml=`<img class="bookmark-graphic" src=${bm_icon} alt="">
          <div class="bookmark-info">
            <span class="bookmark-title">${domain}</span>
            <span class="bookmark-url">${info.url}</span>
          </div>
          <button class="bm-del-btn"  ref-id=${info.id}>
              <span class="material-symbols-outlined">close</span>
            </button>`
newbookmark.innerHTML=newlist_innerhtml;
if(info.url===document.querySelector(".address-bar").value){
  newbookmark.classList.add("active");
}
document.querySelector(".bookmark-list").appendChild(newbookmark)
 })
  document.querySelectorAll(".bm-del-btn").forEach((e)=>{
 e.addEventListener("click",(d)=>{
    console.log("Deleting the selected bookmark: ",d.currentTarget.getAttribute("ref-id"))
    electron.delete_bookmark({id:d.currentTarget.getAttribute("ref-id")})
    d.currentTarget.parentElement.remove();
  })
})
}

document.getElementById("bookmark").addEventListener("click",async()=>{
  const bookmark_ele=document.querySelector(".bookmark-frame");
  if(bookmark_ele.classList.contains("hide")){
  bookmark_ele.classList.add("active");
   bookmark_ele.classList.remove("hide");
   let bookmarks_info=await electron.getBookmark()
  create_bookmark_list(bookmarks_info["data"])
  }
  else{
     bookmark_ele.classList.add("hide");
   bookmark_ele.classList.remove("active");
  }
  
})

document.querySelector(".bm-add-btn").addEventListener("click",async()=>{
  url = document.querySelector(".address-bar").value;
let res=await electron.addBookmark({name:url?.split("https://")[1]?.split(".")[0],
  url:url
});
let bookmarks_info=await electron.getBookmark()
  create_bookmark_list(bookmarks_info["data"])
})

function setActiveBookmark(url){
document.querySelectorAll(".bookmark-item").forEach((e)=>{
if(e.getAttribute("bookmark-url")==url){
  e.classList.add("active");
}
else{
  e.classList.remove("active")
}
})
}

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
    activeTab.childNodes[0].textContent = `${tabName} `;
    // activeTab.innerHTML = `${tabName} <button class="close-tab-btn">&times;</button>`;
  } else addTab(url);

  setActiveBookmark(url);
}

document.querySelector(".address-bar").addEventListener("change", (event) => {
  event.preventDefault();
  url = document.querySelector(".address-bar").value;
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
  document.querySelector(".address-bar").value = url;
  setActiveBookmark(url);
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
      document.querySelector(".address-bar").value =
        newActiveTab?.getAttribute("data-url");
        setActiveBookmark(newActiveTab?.getAttribute("data-url"))
    }
  } else {
    document.querySelector(".address-bar").value = "";
    setActiveBookmark("");
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
  newElement.innerHTML = `<span class="tab-title">${tabName} </span><button class="close-tab-btn">
            <span class="material-symbols-outlined">close</span>
          </button>`;

  newElement.addEventListener("click", tabclicked);
  newElement
    .querySelector(".close-tab-btn")
    .addEventListener("click", closeTab);
  document
    .querySelector(".tab-bar")
    .insertBefore(newElement, document.querySelector(".add-tab-btn"));

  let newWebview = document.createElement("webview");
  newWebview.classList.add("tab-content-frame");
  newWebview.classList.add("active");
  newWebview.setAttribute("id", `frame-${newTabId}`);
  newWebview.setAttribute("tabindex", newTabId);
  console.log("Setting new webview src to:", url);
  newWebview.setAttribute("src", url);
setActiveBookmark(url);
  newWebview.preload = "preload.cjs";
  let webview_wrapper = document.querySelector(".web-view-wrapper");
  webview_wrapper.appendChild(newWebview);

  // Inject common functions into the new webview
  // if (!url.includes("http")) {
  newWebview.addEventListener("dom-ready", () => {
  
    const theme = localStorage.getItem("theme") || "dark";
    newWebview.executeJavaScript(`
      document.body.setAttribute("data-theme", "${theme}")
    `);
  });
  // }

  // Add event listeners for the new webview
  newWebview.addEventListener("did-start-loading", () => {
    console.log("Webview started loading");
    document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
  });

  newWebview.addEventListener("did-stop-loading", () => {
    console.log("Webview stopped loading");
    document.querySelector(".address-bar").style.backgroundSize = "100% 100%";
    setTimeout(() => {
      document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
    }, 500);
    url = document.querySelector(".address-bar").value;
  
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
    document.querySelector(".address-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-navigate-in-page", (event) => {
    console.log("Webview navigated in page to:", event.url);
    document.querySelector(".address-bar").value = event.url;
    newElement.setAttribute("data-url", event.url);
  });

  newWebview.addEventListener("did-frame-finish-load", (event) => {
    if (!event.isMainFrame) return;
    newWebview.executeJavaScript("window.location.href").then((url) => {
      console.log("Webview frame finished loading:", url);
      if (url.includes("blank.html")){
         url = "";
         document.querySelector(".address-bar").focus();
      }
      document.querySelector(".address-bar").value = url;
      newElement.setAttribute("data-url", url);
    });
  });

  newWebview.addEventListener("did-fail-load", (event) => {
    console.log("Failed to load:", event.errorDescription);
    document.querySelector(".address-bar").value =
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
document.querySelector(".add-tab-btn").addEventListener("click", () => {
  // const url = document.querySelector(".address-bar").value;
  addTab("");
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", tabclicked);
  tab.querySelector(".close-tab-btn").addEventListener("click", closeTab);
});

// Add event listeners for the initial webview
const initialWebview = webview;
initialWebview.addEventListener("dom-ready", () => {
  const theme = localStorage.getItem("theme") || "dark";
  initialWebview.executeJavaScript(`
      document.body.setAttribute("data-theme", "${theme}")
    `);
});

initialWebview.addEventListener("did-start-loading", () => {
  console.log("Initial webview started loading");
  document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
});

initialWebview.addEventListener("did-stop-loading", () => {
  console.log("Initial webview stopped loading");
  document.querySelector(".address-bar").style.backgroundSize = "100% 100%";
  setTimeout(() => {
    document.querySelector(".address-bar").style.backgroundSize = "0% 100%";
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
  document.querySelector(".address-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-navigate-in-page", (event) => {
  console.log("Initial webview navigated in page to:", event.url);
  document.querySelector(".address-bar").value = event.url;
  document.querySelector(".tab.active").setAttribute("data-url", event.url);
});

initialWebview.addEventListener("did-frame-finish-load", (event) => {
  if (!event.isMainFrame) return;
  initialWebview.executeJavaScript("window.location.href").then((url) => {
    console.log("Initial webview frame finished loading:", url);
    document.querySelector(".address-bar").value = url;
    document.querySelector(".tab.active").setAttribute("data-url", url);
  });
});

initialWebview.addEventListener("did-fail-load", (event) => {
  console.log("Failed to load:", event.errorDescription);
  document.querySelector(".address-bar").value =
    `Error: ${event.errorDescription}`;
});

// activeWebview.addEventListener("beforeunload", (event) => {
//   console.log("do not close");
//   event.preventDefault();
//   event.returnValue = "";
// });

// Interact with webview content


  initTheme();
  
  document.getElementById("interact-webview").addEventListener("click", async () => {
    console.log("Interact with webview clicked");
    const script = await electron.importWorkflowJSON("moviesmod_script_test.json");
   await interactWithWebview(script);
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
