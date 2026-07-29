function getEditorProfile(element) {
  if (!element || element.tagName === "TEXTAREA" || element.tagName === "INPUT" || !element.isContentEditable) return "plain";
  const host = location.hostname;
  const isCopilot = host === "copilot.microsoft.com" || host.endsWith(".copilot.microsoft.com");
  if (["chatgpt.com", "chat.openai.com", "claude.ai", "gemini.google.com"].includes(host) || isCopilot || host.endsWith(".cursor.com")) return "rich";
  if (element.closest('.ProseMirror, [contenteditable="true"][role="textbox"]')) return "rich";
  return "contenteditable";
}

function isRichEditor(element) { return getEditorProfile(element) === "rich"; }

function getSelectionTextInElement(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";
  const range = selection.getRangeAt(0);
  return element && !element.contains(range.commonAncestorContainer) ? selection.toString() : selection.toString();
}

function insertTextAtSelection(text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node); range.setEndAfter(node);
  selection.removeAllRanges(); selection.addRange(range);
  return true;
}

function replaceTextInNodeTree(root, search, replacement) {
  if (!search || search === replacement) return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const content = node.textContent || "";
    const index = content.indexOf(search);
    if (index !== -1) {
      node.textContent = content.slice(0, index) + replacement + content.slice(index + search.length);
      return true;
    }
    node = walker.nextNode();
  }
  return false;
}

function replaceFindingsInContentEditable(element, findings, settings) {
  let replaced = false;
  [...findings].sort((a, b) => b.value.length - a.value.length).forEach((finding) => {
    if (replaceTextInNodeTree(element, finding.value, getRedactionText(finding.type, settings))) replaced = true;
  });
  if (replaced) element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  return replaced;
}

function insertTextIntoRichEditor(element, text) {
  element.focus();
  if (insertTextAtSelection(text) || document.execCommand("insertText", false, text)) {
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    return true;
  }
  return false;
}

function setRichEditorText(element, text) {
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
  if (!insertTextAtSelection(text) && !document.execCommand("insertText", false, text)) element.textContent = text;
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
}
