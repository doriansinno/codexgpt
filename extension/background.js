const API_BASE = "https://codexgpt-dh73.onrender.com";

async function getClientId() {
  let { clientId } = await chrome.storage.local.get(["clientId"]);
  if (!clientId) {
    clientId = crypto.randomUUID();
    await chrome.storage.local.set({ clientId });
  }
  return clientId;
}

async function activateKey(key) {
  const clientId = await getClientId();
  const res = await fetch(`${API_BASE}/license/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, clientId })
  });
  return res.json();
}

async function validateKey(key) {
  const clientId = await getClientId();
  const res = await fetch(`${API_BASE}/license/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, clientId })
  });
  return res.json();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "setLicense") {
    chrome.storage.local.set({ licenseKey: msg.key }, async () => {
      const result = await activateKey(msg.key);
      sendResponse(result);
    });
    return true;
  }

  if (msg.type === "getStatus") {
    chrome.storage.local.get(["licenseKey"], async data => {
      const result = await validateKey(data.licenseKey);
      sendResponse(result);
    });
    return true;
  }
});
