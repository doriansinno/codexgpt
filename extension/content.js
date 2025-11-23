// ---- OVERLAY ----
function showOverlay(responseText) {
  const old = document.getElementById("ai-helper-overlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "ai-helper-overlay";
  overlay.innerHTML = `
    <div class="ai-helper-box">
        <button id="ai-helper-close">X</button>
        <pre>${responseText}</pre>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("ai-helper-close").addEventListener("click", () => {
    overlay.remove();
  });
}

let selectionTimeout = null;

// Wird ausgelöst, wenn der Nutzer Text markiert & die Maus loslässt
document.addEventListener("mouseup", () => {
  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const text = window.getSelection().toString().trim();
    if (text.length > 0) {
      chrome.runtime.sendMessage({ type: "selection", text });
    }
  }, 150);
});


// ---- RECEIVE AI RESPONSE ----
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ai_response") {
    showOverlay(msg.text);
  }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "x" || e.key === "X") {
        const old = document.getElementById("ai-helper-overlay");
        if (old) old.remove();
    }
});
