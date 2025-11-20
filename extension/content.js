// Content script: captures selected text and sends it to the background script
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
