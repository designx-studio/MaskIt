function getEditorProfile(element) {
  if (!element) return "plain";

  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
    return "plain";
  }

  if (!element.isContentEditable) {
    return "plain";
  }

  const host = location.hostname;

  if (host === "chatgpt.com" || host === "chat.openai.com") {
    return "rich";
  }

  if (host === "mail.google.com") {
    return "rich";
  }

  if (
    element.closest(
      '.ProseMirror, [contenteditable="true"][role="textbox"], div[aria-label*="Message body" i], div[aria-label*="To recipients" i], div[g_editable="true"]'
    )
  ) {
    return "rich";
  }

  return "contenteditable";
}

function isRichEditor(element) {
  return getEditorProfile(element) === "rich";
}

function getSelectionTextInElement(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0);
  if (!element.contains(range.commonAncestorContainer)) {
    return selection.toString();
  }

  return selection.toString();
}

function insertTextAtSelection(text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);
  selection.removeAllRanges();
  selection.addRange(range);
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
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + search.length);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      if (insertTextAtSelection(replacement)) {
        return true;
      }

      node.textContent =
        content.slice(0, index) + replacement + content.slice(index + search.length);
      return true;
    }

    node = walker.nextNode();
  }

  return false;
}

function replaceFindingsInContentEditable(element, findings, settings) {
  const sorted = [...findings].sort((a, b) => b.value.length - a.value.length);
  let replaced = false;

  element.focus();

  sorted.forEach((finding) => {
    const replacement = getRedactionText(finding.type, settings);
    if (replaceTextInNodeTree(element, finding.value, replacement)) {
      replaced = true;
    }
  });

  if (replaced) {
    element.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText" })
    );
  }

  return replaced;
}

function insertTextIntoRichEditor(element, text) {
  element.focus();

  if (insertTextAtSelection(text)) {
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text
      })
    );
    return true;
  }

  if (document.execCommand("insertText", false, text)) {
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text
      })
    );
    return true;
  }

  return false;
}

function setRichEditorText(element, text) {
  element.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);

  if (insertTextAtSelection(text)) {
    element.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText", data: text })
    );
    return;
  }

  if (document.execCommand("insertText", false, text)) {
    element.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertText", data: text })
    );
    return;
  }

  element.textContent = text;
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, inputType: "insertText", data: text })
  );
}
