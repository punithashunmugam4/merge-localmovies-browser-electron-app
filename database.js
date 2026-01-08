let sample_data = [
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
  { key: "1", value: "Value 1" },
  { key: "creds", value: "322fwe2f" },
  { key: "pass", value: "Awekjghifsaehj" },
];
var data = [];
const newKey = document.getElementById("key");
const newValue = document.getElementById("value");
const addKeyBtn = document.getElementById("add");
const searchInput = document.getElementById("search-input");
const TableBody = document.getElementById("data-table-body");

function createTable(data) {
  if (Array.isArray(data) && data.length > 0) {
    data.map((item) => {
      console.log(item);
      const row = document.createElement("tr");
      const keyCell = document.createElement("td");
      keyCell.textContent = item.key;
      row.appendChild(keyCell);

      const valueCell = document.createElement("td");
      const valueElement = document.createElement("input");
      valueElement.value = item.value;
      valueCell.appendChild(valueElement);
      row.appendChild(valueCell);

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
          let response = await window.electron.editDBValue({
            key: item.key,
            value: valueElement.value,
          });
          console.log(response);
        } catch (e) {
          console.log(e);
        }
      });
      deleteBtton.addEventListener("click", async (e) => {
        e.stopPropagation();
        console.log("Delete", item);
        try {
          let res = await window.electron.deleteDBValue({
            key: item.key,
          });
          console.log(res);
          if (res && res.success) {
            console.log(e.target.parentElement.parentElement);
            e.target.parentElement.parentElement.remove();
          }
        } catch (e) {
          console.log(err);
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
    let res = await window.electron.fetchDB();
    if (res && res.success && Array.isArray(res.data)) {
      data = res.data;
    }
    data = res.data;
    console.log("Initial Data:", data);
    createTable(data);
  } catch (err) {
    console.error("Add failed:", err);
  }
});

addKeyBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const key = newKey.value.trim();
  const value = newValue.value.trim();
  if (!key) return alert("Key required");

  try {
    const res = await window.electron.addDBValue({ key, value });
    console.log("Add response:", res);
    if (res && res.success) {
      const fresh = await window.electron.fetchDB();
      if (fresh && fresh.success) {
        TableBody.innerHTML = "";

        data = fresh.data;
        createTable(data);
        newKey.value = "";
        newValue.value = "";
      }
    } else {
      alert("Failed to add: " + (res && res.error));
    }
  } catch (err) {
    console.error("Add failed:", err);
  }
});
