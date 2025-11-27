// Background service worker: handles license validation, messaging, and API requests
const API_BASE = "https://codexgpt-dh73.onrender.com";

/* -------------------------------------------------------
   1) Lizenz-Validierung – gibt KOMPLETTE Lizenz zurück
------------------------------------------------------- */
async function getClientId() {
  let { clientId } = await chrome.storage.local.get(["clientId"]);
  if (!clientId) {
    clientId = crypto.randomUUID();
    await chrome.storage.local.set({ clientId });
  }
  return clientId;
}


async function validateLicense(storedKey) {
  if (!storedKey) return { valid: false, message: "Kein Lizenzschlüssel gespeichert." };

  const clientId = await getClientId();

  try {
    const res = await fetch(`${API_BASE}/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storedKey, clientId })
    });

    const data = await res.json();
    return data;

  } catch (error) {
    console.error("Lizenzprüfung fehlgeschlagen", error);
    return { valid: false, message: "Server nicht erreichbar." };
  }
}


/* -------------------------------------------------------
   2) Anfrage an AI schicken
------------------------------------------------------- */
async function sendToApi(text) {
  const { licenseKey } = await chrome.storage.local.get(["licenseKey"]);
  const license = await validateLicense(licenseKey);

  // 🔥 Wenn Lizenz ungültig → Fehlermeldung senden
  if (!license.valid) {
    const msg = license.message || "Lizenz ungültig oder abgelaufen.";

    await chrome.storage.local.set({
      lastResponse: msg,
      lastQuestion: text,
      licenseStatus: license
    });

    // Antwort an die Webseite
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "ai_response",
          text: msg
        });
      }
    });

    return;
  }

  // 🔥 Lizenz gültig → API Anfrage stellen
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
      licenseStatus: license // komplette Lizenz speichern
    });

    // Antwort an aktive Seite senden → Overlay anzeigen
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "ai_response",
          text: message
        });
      }
    });

  } catch (error) {
    console.error("Anfrage fehlgeschlagen", error);

    await chrome.storage.local.set({
      lastResponse: "Fehler beim Abrufen der Antwort.",
      lastQuestion: text,
      licenseStatus: { valid: false, message: "Anfrage fehlgeschlagen." }
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "ai_response",
          text: "Fehler beim Abrufen der Antwort."
        });
      }
    });
  }
}

/* -------------------------------------------------------
   3) Nachrichten vom Popup & Content Script
------------------------------------------------------- */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Text markiert → AI Anfrage
  if (message.type === "selection") {
    sendToApi(message.text);
  }

  // Lizenz speichern & sofort validieren
  if (message.type === "setLicense") {
  chrome.storage.local.set({ licenseKey: message.key }, async () => {
    const clientId = await getClientId();
    const activation = await fetch(`${API_BASE}/license/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: message.key, clientId })
    }).then(r => r.json());

    sendResponse(activation);
  });

  return true;
}


  // Status abrufen → IMMER NEU validieren
  if (message.type === "getStatus") {
    chrome.storage.local.get(
      ["licenseKey", "lastResponse", "lastQuestion"],
      async (data) => {
        const status = await validateLicense(data.licenseKey);

        await chrome.storage.local.set({ licenseStatus: status });

        sendResponse({
          ...data,
          licenseStatus: status
        });
      }
    );

    return true;
  }
});

/* -------------------------------------------------------
   4) Extension installiert → Lizenz einmal prüfen
------------------------------------------------------- */
chrome.runtime.onInstalled.addListener(async () => {
  const { licenseKey } = await chrome.storage.local.get(["licenseKey"]);
  const status = await validateLicense(licenseKey);
  await chrome.storage.local.set({ licenseStatus: status });
});
