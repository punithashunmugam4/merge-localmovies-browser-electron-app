let sample_data = [
  {
    key: "gmail",
    username: "punithashunmugam4",
    password: "mypassword",
    comments: "personal email",
  },
  {
    key: "facebook",
    username: "punithashunmugam",
    password: "fbpassword",
    comments: "social media",
  },
];
var data = [];
let data_length = 0;
const newKey = document.getElementById("key");
const newUsername = document.getElementById("username");
const newpassword = document.getElementById("password");
const newComments = document.getElementById("comments");
const addKeyBtn = document.getElementById("add");
const searchInput = document.getElementById("search-input");
const TableBody = document.getElementById("data-table-body");
const dataLengthSpan = document.getElementById("data-length");
const CSVInput = document.getElementById("upload");
const downloadCSVBtn = document.getElementById("download-csv");

downloadCSVBtn.addEventListener("click", () => {
  if (!data || data.length === 0) return alert("No data to download");
  const header = "Key,Username,Password,Comments\n";
  const rows = data
    .map(
      (item) =>
        `${item.key},${item.username},${item.password},${item.comments}`,
    )
    .join("\n");
  const csvContent = header + rows;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `vault_data_${new Date().toISOString().split("T")[0]}.csv`,
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

CSVInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const text = event.target.result;
    data = parseCSV(text);
    console.log(data);
    data.splice(0, 1);
    data_length = data.length;
    data = data.map((item) => ({
      key: item[0],
      username: item[1],
      password: item[2],
      comments: item[3],
    }));
    data.forEach(async (item) => {
      try {
        let res = await window.electron.addVaultValue({
          ...item,
        });

        console.log("Add response:", res);
      } catch (err) {
        console.error("Add failed:", err);
      }
    });
    let r = await window.electron.fetchVault();
    data = r.data;
    dataLengthSpan.textContent = Array.isArray(data) ? data.length : 0;
    createTable(data);
  };
  reader.readAsText(file);
});

function parseCSV(text) {
  const rows = text.split("\n");
  return rows.map((row) => row.split(",")); // Basic comma-split
}

function createTable(data) {
  TableBody.innerHTML = "";
  if (Array.isArray(data) && data.length > 0) {
    data.map((item) => {
      console.log(item);
      const row = document.createElement("tr");
      const keyCell = document.createElement("td");
      keyCell.textContent = item.key;
      row.appendChild(keyCell);
      const usernameCell = document.createElement("td");
      usernameCell.textContent = item.username;
      row.appendChild(usernameCell);

      const PasswordCell = document.createElement("td");
      const pwWrap = document.createElement("div");
      pwWrap.className = "pw-wrap";
      const PasswordElement = document.createElement("input");
      PasswordElement.type = "password";
      // PasswordElement.readOnly = true;
      PasswordElement.className = "pw-input";
      PasswordElement.value = item.password;
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "pw-toggle";
      toggleBtn.setAttribute("aria-label", "Show value");
      toggleBtn.innerHTML = "👁";

      toggleBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (PasswordElement.type === "password") {
          PasswordElement.type = "text";
          toggleBtn.setAttribute("aria-label", "Hide value");
          toggleBtn.innerHTML = "🙈";
        } else {
          PasswordElement.type = "password";
          toggleBtn.setAttribute("aria-label", "Show value");
          toggleBtn.innerHTML = "👁";
        }
      });

      pwWrap.appendChild(PasswordElement);
      pwWrap.appendChild(toggleBtn);
      PasswordCell.appendChild(pwWrap);
      row.appendChild(PasswordCell);

      const commentsCell = document.createElement("td");
      commentsCell.textContent = item.comments;
      row.appendChild(commentsCell);

      const actionCell = document.createElement("td");
      actionCell.classList.add("actions");
      const editButton = document.createElement("button");
      const deleteBtton = document.createElement("button");
      editButton.classList.add("edit-btn", "action-btn");
      deleteBtton.classList.add("delete-btn", "action-btn");
      editButton.innerHTML = "<i class='fas fa-edit'></i>";
      deleteBtton.innerHTML = "<i class='fas fa-trash-alt'></i>";
      editButton.addEventListener("click", async () => {
        console.log("Edit", item);
        try {
          let response = await window.electron.editVaultValue({
            key: item.key,
            password: PasswordElement.value,
          });
          console.log(response);
          if (response && response.success) {
            window.electron.toast("Password updated");
          }
        } catch (e) {
          console.log(e);
        }
      });
      deleteBtton.addEventListener("click", async (e) => {
        e.stopPropagation();
        console.log("Delete", item);
        try {
          let res = await window.electron.deleteVaultValue({
            key: item.key,
          });
          console.log(res);
          if (res && res.success) {
            window.electron.toast("Entry deleted");
            const tr = e.target.closest("tr");
            console.log("removing tag: ", tr);
            if (tr) tr.remove();
            dataLengthSpan.textContent =
              parseInt(dataLengthSpan.textContent) - 1;
          }
        } catch (e) {
          console.log(e);
        }
      });

      actionCell.appendChild(editButton);
      actionCell.appendChild(deleteBtton);
      row.appendChild(actionCell);

      TableBody.appendChild(row);
    });
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    let res = await window.electron.fetchVault();
    if (res && res.success && Array.isArray(res.data)) {
      data = res.data;
    }
    data = res.data;
    console.log("Initial Data:", data);
    dataLengthSpan.textContent = Array.isArray(data) ? data.length : 0;
    createTable(data);
  } catch (err) {
    console.error("Add failed:", err);
  }
});

addKeyBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const key = newKey.value.trim();
  const username = newUsername.value.trim();
  const password = newpassword.value.trim();
  const comments = newComments.value.trim();
  if (!key) return alert("Key required");

  try {
    const res = await window.electron.addVaultValue({
      key,
      username,
      password,
      comments,
    });
    console.log("Add response:", res);
    if (res && res.success) {
      window.electron.toast("Entry added");
      const fresh = await window.electron.fetchVault();
      if (fresh && fresh.success) {
        TableBody.innerHTML = "";

        data = fresh.data;
        dataLengthSpan.textContent = data.length;
        createTable(data);
        newKey.value = "";
        newUsername.value = "";
        newpassword.value = "";
        newComments.value = "";
      }
    } else {
      alert("Failed to add: " + (res && res.error));
    }
  } catch (err) {
    console.error("Add failed:", err);
  }
});

function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

searchInput.addEventListener(
  "input",
  debounce((e) => {
    const q = (e.target.value || "").trim().toLowerCase();
    if (!q) {
      dataLengthSpan.textContent = data.length || 0;
      createTable(data || []);
      return;
    }
    const filtered = (data || []).filter((item) => {
      const k = String(item.key || "").toLowerCase();
      const v = String(item.value || "").toLowerCase();
      return k.includes(q) || v.includes(q);
    });
    dataLengthSpan.textContent = filtered.length;
    createTable(filtered);
  }, 120),
);
