const chooseBtn = document.getElementById("chooseBtn");
const moviesList = document.getElementById("movies");
const getAllBtn = document.getElementById("getAllMovies");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const loader = document.getElementById("loader");

const context_listener = (event) => {
  event.preventDefault();
  const bounds = window.getBoundingClientRect();
  const params = {
    x: event.params.x,
    y: event.params.y,
  };
  window.electron.showContextMenu(params);
};
document.addEventListener("context-menu", context_listener);

function showLoader() {
  if (loader) {
    loader.classList.remove("hidden");
    loader.setAttribute("aria-hidden", "false");
  }
}
function hideLoader() {
  if (loader) {
    loader.classList.add("hidden");
    loader.setAttribute("aria-hidden", "true");
  }
}

function displayMovies(movies) {
  moviesList.innerHTML = "";
  if (!movies.length) {
    moviesList.innerHTML = "<li>No movie files found in this folder.</li>";
    return;
  }

  movies.forEach(async (m) => {
    const li = document.createElement("li");
    li.classList.add("movie_li");
    const icon = document.createElement("img");
    icon.src = m.icon;
    const content = document.createElement("div");
    content.className = "movie_content";
    const a = document.createElement("a");

    const fileUrl = "file:///" + m.path.replace(/\\/g, "/");
    a.href = fileUrl;
    a.textContent = m.name;
    a.target = "_blank";
    a.addEventListener("click", async (evt) => {
      evt.preventDefault();
      await window.electron.openPath(m.path);
    });

    const pathSpan = document.createElement("span");
    pathSpan.className = "path";
    pathSpan.textContent = m.path.split("\\").slice(0, -1).join("\\");

    content.appendChild(a);
    content.appendChild(pathSpan);

    // three-dot button for more options
    const moreBtn = document.createElement("button");
    moreBtn.className = "more-btn";
    moreBtn.setAttribute("aria-label", "More options");
    moreBtn.innerText = "⋯";

    moreBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      closeAllMenus();
      openItemMenu(ev.currentTarget, m);
    });
    li.appendChild(icon);
    li.appendChild(content);
    li.appendChild(moreBtn);
    moviesList.appendChild(li);
  });
}

function openItemMenu(anchorEl, movie) {
  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "item-menu";
  menu.innerHTML = `
    <button class="item-menu__action open">Open</button>
    <button class="item-menu__action reveal">Open file location</button>
    <button class="item-menu__action delete">Delete</button>
  `;
  document.body.appendChild(menu);

  // position menu near the button
  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${rect.left + window.scrollX - 120 + rect.width}px`;

  menu.querySelector(".open").addEventListener("click", async (e) => {
    await window.electron.openPath(movie.path);
    closeMenu(menu);
  });
  menu.querySelector(".reveal").addEventListener("click", async (e) => {
    await window.electron.revealInFolder(movie.path);
    closeMenu(menu);
  });
  menu.querySelector(".delete").addEventListener("click", (e) => {
    closeMenu(menu);
    showConfirmModal({
      title: "Delete file?",
      message: `Delete "${movie.name}"? This cannot be undone.`,
      confirmText: "Delete",
      onConfirm: async () => {
        const res = await window.electron.deletePath(movie.path);
        if (res && res.success) {
          // remove item from DOM
          const li = anchorEl.closest(".movie_li");
          if (li) li.remove();
        } else {
          alert("Failed to delete: " + (res && res.error));
        }
      },
    });
  });

  // close on outside click or escape
  const onDocClick = (ev) => {
    if (!menu.contains(ev.target) && ev.target !== anchorEl) closeMenu(menu);
  };
  const onKey = (ev) => {
    if (ev.key === "Escape") closeMenu(menu);
  };
  setTimeout(() => {
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
  }, 0);

  menu._cleanup = () => {
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKey);
  };
}

function closeMenu(menu) {
  if (!menu) return;
  if (menu._cleanup) menu._cleanup();
  menu.remove();
}
function closeAllMenus() {
  document.querySelectorAll(".item-menu").forEach((m) => closeMenu(m));
}

// confirmation modal
function showConfirmModal({ title, message, confirmText = "OK", onConfirm }) {
  closeConfirmModal();

  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-modal" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="confirm-body">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
      <div class="confirm-actions">
        <button class="btn secondary cancel">Cancel</button>
        <button class="btn danger confirm">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector(".cancel").addEventListener("click", closeConfirmModal);
  overlay.querySelector(".confirm").addEventListener("click", async () => {
    try {
      await onConfirm();
    } finally {
      closeConfirmModal();
    }
  });

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeConfirmModal();
  });
}

function closeConfirmModal() {
  const existing = document.querySelector(".confirm-overlay");
  if (existing) existing.remove();
}

// close menus/modals when navigating away
document.addEventListener("scroll", closeAllMenus);
window.addEventListener("blur", closeAllMenus);

chooseBtn.addEventListener("click", async () => {
  searchInput.value = "";
  const folder = await window.electron.chooseFolder();
  if (!folder) return;
  showLoader();
  try {
    const movies = await window.electron.getMovies(folder);
    displayMovies(movies);
  } finally {
    hideLoader();
  }
});

getAllBtn.addEventListener("click", async () => {
  searchInput.value = "";
  showLoader();
  try {
    const movies = await window.electron.getAllMovies();
    displayMovies(movies);
  } finally {
    hideLoader();
  }
});

async function handleSearch(query) {
  showLoader();
  try {
    const movies = await window.electron.getAllMovies();
    console.log("Total movies:", movies.length);
    const filtered = movies.filter((m) =>
      m.name.toLowerCase().includes(query.toLowerCase())
    );
    console.log("Filtered movies with ", query, " : ", filtered);
    displayMovies(filtered);
  } finally {
    hideLoader();
  }
}
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  await handleSearch(query);
});
searchInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    const query = event.target.value.trim();
    if (!query) return;
    await handleSearch(query);
  }
});

window.electron.receive("inspect-element", (event) => {
  window.inspectElement(event.x, event.y);
});
