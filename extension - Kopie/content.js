// Content script: captures selected text and sends it to the background script

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

(function () {
  function getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : "";
  }

  function handleSelection() {
    const text = getSelectedText();
    if (!text) return;

    chrome.runtime.sendMessage({ type: "selection", text });
  }

  document.addEventListener("mouseup", () => setTimeout(handleSelection, 10));
  document.addEventListener("keyup", () => setTimeout(handleSelection, 10));
})();

// ⭐ WICHTIG – diese Zeilen waren vorher NICHT da → jetzt funktioniert das Popup
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "ai_response") {
        showOverlay(msg.text);
    }
});
