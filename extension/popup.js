const statusEl = document.getElementById("license-status");
const responseEl = document.getElementById("response");
const questionEl = document.getElementById("last-question");
const inputEl = document.getElementById("license-input");
const saveBtn = document.getElementById("save-license");

function renderStatus(status) {
  if (!status || !status.valid) {
    statusEl.textContent = status?.reason || "Lizenz ungültig.";
    statusEl.className = "status error";
  } else {
    statusEl.textContent = "Lizenz aktiv";
    statusEl.className = "status ok";
  }
}

function renderContent({ lastResponse, lastQuestion, licenseStatus, licenseKey }) {
  renderStatus(licenseStatus);
  responseEl.textContent = lastResponse || "Keine Antwort vorhanden.";
  questionEl.textContent = lastQuestion || "Noch keine Auswahl.";
  if (licenseKey) inputEl.value = licenseKey;
}

chrome.runtime.sendMessage({ type: "getStatus" }, renderContent);

saveBtn.addEventListener("click", () => {
  const key = inputEl.value.trim();
  if (!key) {
    renderStatus({ valid: false, reason: "Bitte Schlüssel eingeben." });
    return;
  }
  chrome.runtime.sendMessage({ type: "setLicense", key }, renderStatus);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const update = {};
  if (changes.lastResponse) update.lastResponse = changes.lastResponse.newValue;
  if (changes.lastQuestion) update.lastQuestion = changes.lastQuestion.newValue;
  if (changes.licenseStatus) update.licenseStatus = changes.licenseStatus.newValue;
  renderContent({ ...update, licenseKey: inputEl.value });
});
