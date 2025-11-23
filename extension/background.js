// Background service worker: handles license validation, messaging, and API requests
//const API_BASE = "http://localhost:3000";
const API_BASE = "https://codexgpt-dh73.onrender.com";
async function validateLicense(storedKey) {
  if (!storedKey) return { valid: false, reason: "Kein Lizenzschlüssel gespeichert." };
  try {
    const res = await fetch(`${API_BASE}/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storedKey })
    });
    const data = await res.json();
    return data.valid ? { valid: true } : { valid: false, reason: data.message || "Lizenz ungültig" };
  } catch (error) {
    console.error("Lizenzprüfung fehlgeschlagen", error);
    return { valid: false, reason: "Server nicht erreichbar." };
  }
}

async function sendToApi(text) {
  const { licenseKey } = await chrome.storage.local.get(["licenseKey"]);
  const license = await validateLicense(licenseKey);
  if (!license.valid) {
    await chrome.storage.local.set({
      lastResponse: "Lizenz ungültig oder abgelaufen.",
      lastQuestion: text,
      licenseStatus: license
    });
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, licenseKey })
    });
    const data = await response.json();
    const message = data.answer || data.message || "Keine Antwort erhalten.";
    await chrome.storage.local.set({
      lastResponse: message,
      lastQuestion: text,
      licenseStatus: { valid: true }
    });
  } catch (error) {
    console.error("Anfrage fehlgeschlagen", error);
    await chrome.storage.local.set({
      lastResponse: "Fehler beim Abrufen der Antwort.",
      lastQuestion: text,
      licenseStatus: { valid: false, reason: "Anfrage fehlgeschlagen" }
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "selection") {
    sendToApi(message.text);
  }

  if (message.type === "setLicense") {
    chrome.storage.local.set({ licenseKey: message.key }, async () => {
      const status = await validateLicense(message.key);
      await chrome.storage.local.set({ licenseStatus: status });
      sendResponse(status);
    });
    return true; // keep sendResponse alive
  }

  if (message.type === "getStatus") {
    chrome.storage.local.get(["licenseKey", "licenseStatus", "lastResponse", "lastQuestion"], async (data) => {
      const status = data.licenseStatus || (await validateLicense(data.licenseKey));
      await chrome.storage.local.set({ licenseStatus: status });
      sendResponse({ ...data, licenseStatus: status });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const { licenseKey } = await chrome.storage.local.get(["licenseKey"]);
  const status = await validateLicense(licenseKey);
  await chrome.storage.local.set({ licenseStatus: status });
});
