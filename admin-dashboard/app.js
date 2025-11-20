const API_BASE = "http://localhost:3000";

const tableBody = document.getElementById("license-table");
const refreshBtn = document.getElementById("refresh");
const createBtn = document.getElementById("create");
const durationInput = document.getElementById("duration");
const resultEl = document.getElementById("create-result");

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function badge(active) {
  const cls = active ? "badge" : "badge inactive";
  const text = active ? "Aktiv" : "Deaktiviert";
  return `<span class="${cls}">${text}</span>`;
}

async function fetchLicenses() {
  const res = await fetch(`${API_BASE}/license/all`);
  const data = await res.json();
  return data.licenses || [];
}

async function renderTable() {
  const licenses = await fetchLicenses();
  tableBody.innerHTML = licenses
    .map(
      (license) => `
        <tr>
          <td>${license.key}</td>
          <td>${formatDate(license.createdAt)}</td>
          <td>${formatDate(license.expiresAt)}</td>
          <td>${badge(license.active)}</td>
          <td class="actions">
            <button class="danger" data-key="${license.key}" data-action="delete">Löschen</button>
            <button data-key="${license.key}" data-action="deactivate">Deaktivieren</button>
          </td>
        </tr>
      `
    )
    .join("");
}

async function createLicense() {
  const durationDays = Number(durationInput.value) || 30;
  const res = await fetch(`${API_BASE}/license/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ durationDays })
  });
  const data = await res.json();
  if (res.ok) {
    resultEl.textContent = `Neuer Schlüssel: ${data.license.key}`;
  } else {
    resultEl.textContent = data.message || "Fehler beim Erzeugen";
  }
  await renderTable();
}

async function handleTableClick(event) {
  const action = event.target.dataset.action;
  const key = event.target.dataset.key;
  if (!action || !key) return;

  if (action === "delete") {
    await fetch(`${API_BASE}/license/${key}`, { method: "DELETE" });
  }

  if (action === "deactivate") {
    await fetch(`${API_BASE}/license/deactivate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
  }

  await renderTable();
}

refreshBtn.addEventListener("click", renderTable);
createBtn.addEventListener("click", createLicense);
tableBody.addEventListener("click", handleTableClick);

document.addEventListener("DOMContentLoaded", renderTable);
