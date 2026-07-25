// Top-level error boundary — never break the host page
try { _maskitInit(); } catch (err) { console.error("Maskit init error:", err.message); }

function _maskitInit() {

  let currentSettings = { ...MASKIT_DEFAULTS };
  let typingTimer = null;
  let typingMaxTimer = null;
  let isReviewOpen = false;
  let isApplyingRedaction = false;

  // Pause & UI state
  let isPaused = false;
  let pauseAutoResumeTimer = null;
  let reviewDialogTimer = null;
  let trafficLightShadow = null;

  // ── Settings ──────────────────────────────────────────────────────────────

  function loadSettings() {
    try {
      chrome.storage.sync.get(MASKIT_DEFAULTS, (items) => {
        currentSettings = items;
        updateTrafficLight();
      });
    } catch {
      currentSettings = { ...MASKIT_DEFAULTS };
    }
  }

  loadSettings();

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync") loadSettings();
    });
  } catch {
    // storage listener unavailable
  }

  // ── Protection check ──────────────────────────────────────────────────────

  function isProtectionActive() {
    return (
      currentSettings.enabled !== false &&
      isSiteAllowed(currentSettings, location.hostname) &&
      !isPaused
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  function recordStats(findings, source) {
    try {
      const counts = {};
      findings.forEach((item) => {
        counts[item.type] = (counts[item.type] || 0) + 1;
      });
      chrome.runtime.sendMessage({ type: "RECORD_REDACTIONS", source, counts });
    } catch {
      // background unavailable
    }
  }

  // ── Element helpers ───────────────────────────────────────────────────────

  function findEditableElement(node) {
    let current = node;
    while (current) {
      if (current instanceof Element) {
        if (current.tagName === "TEXTAREA" || current.tagName === "INPUT") return current;
        if (current.isContentEditable) return current;
      }
      if (current.parentElement) {
        current = current.parentElement;
      } else if (current.parentNode instanceof ShadowRoot) {
        current = current.parentNode.host;
      } else {
        break;
      }
    }
    return null;
  }

  function getEventTarget(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      const editable = findEditableElement(node);
      if (editable) return editable;
    }
    return (
      findEditableElement(event.target) ||
      findEditableElement(document.activeElement)
    );
  }

  function getElementText(element) {
    if (!element) return "";
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") return element.value;
    return element.innerText || element.textContent || "";
  }

  function getProposedText(element, event) {
    const inputType = event.inputType || "";
    const incoming =
      inputType === "insertLineBreak" || inputType === "insertParagraph"
        ? "\n"
        : event.data ?? "";

    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      if (inputType.startsWith("delete")) return null;
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? element.value.length;
      return element.value.slice(0, start) + incoming + element.value.slice(end);
    }

    if (inputType.startsWith("delete")) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return getElementText(element) + incoming;

    const current = getElementText(element);
    const selected = selection.toString();
    if (!selected) return current + incoming;

    const index = current.indexOf(selected);
    if (index === -1) return current + incoming;
    return current.slice(0, index) + incoming + current.slice(index + selected.length);
  }

  // ── Text insertion ────────────────────────────────────────────────────────

  function insertIntoInput(element, text) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    element.setRangeText(text, start, end, "end");
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertIntoContentEditable(element, text) {
    if (isRichEditor(element)) {
      insertTextIntoRichEditor(element, text);
      return;
    }
    element.focus();
    if (document.execCommand("insertText", false, text)) {
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      element.appendChild(document.createTextNode(text));
    }
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }

  function setElementText(element, text) {
    if (!element) return;
    isApplyingRedaction = true;
    try {
      if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        element.value = text;
        const end = text.length;
        element.setSelectionRange(end, end);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      if (isRichEditor(element)) {
        setRichEditorText(element, text);
        return;
      }
      element.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      if (!document.execCommand("insertText", false, text)) {
        element.textContent = text;
      }
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    } finally {
      setTimeout(() => { isApplyingRedaction = false; }, 0);
    }
  }

  function insertSanitizedText(element, text) {
    if (!element) return;
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      insertIntoInput(element, text);
      return;
    }
    if (element.isContentEditable) insertIntoContentEditable(element, text);
  }

  // ── Toast notification ────────────────────────────────────────────────────

  function showToast(message) {
    const old = document.getElementById("maskit-popup");
    if (old) old.remove();

    const popup = document.createElement("div");
    popup.id = "maskit-popup";
    popup.textContent = message;

    Object.assign(popup.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "#111827",
      color: "#fff",
      padding: "8px 16px",
      borderRadius: "999px",
      zIndex: "2147483645",
      fontSize: "13px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
      opacity: "1",
      transition: "opacity 0.3s ease",
      pointerEvents: "none"
    });

    (document.body || document.documentElement).appendChild(popup);
    setTimeout(() => {
      popup.style.opacity = "0";
      setTimeout(() => popup.remove(), 300);
    }, 1500);
  }

  function showMaskitPopup(findings) {
    showToast(`Maskit: sanitized ${findings.length} sensitive item(s)`);
  }

  // ── Review dialog ─────────────────────────────────────────────────────────

  function showReviewDialog(findings, onConfirm, onCancel) {
    if (isReviewOpen) { onCancel(); return; }
    isReviewOpen = true;

    const overlay = document.createElement("div");
    overlay.id = "maskit-review-overlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      background: "rgba(0,0,0,0.55)",
      zIndex: "2147483646",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Arial, sans-serif"
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "#171a21", color: "#fff",
      borderRadius: "16px", padding: "24px",
      width: "min(420px, 92vw)",
      border: "1px solid #252933",
      boxShadow: "0 12px 40px rgba(0,0,0,0.45)"
    });

    const title = document.createElement("h3");
    title.textContent = "Review before redacting";
    title.style.margin = "0 0 8px";

    const desc = document.createElement("p");
    desc.textContent = `Maskit found ${findings.length} sensitive item(s):`;
    desc.style.cssText = "color:#9aa4b2;margin:0 0 16px;";

    const list = document.createElement("ul");
    list.style.cssText = "margin:0 0 20px;padding:0;list-style:none;";
    findings.forEach((item) => {
      const row = document.createElement("li");
      row.style.cssText = "padding:10px 0;border-bottom:1px solid #252933;";
      const type = document.createElement("strong");
      type.textContent = item.type;
      const preview = document.createElement("span");
      preview.style.cssText = "color:#9aa4b2;display:block;";
      preview.textContent = maskPreview(item.value);
      row.appendChild(type);
      row.appendChild(document.createElement("br"));
      row.appendChild(preview);
      list.appendChild(row);
    });

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Redact";

    [cancelBtn, confirmBtn].forEach((btn) => {
      Object.assign(btn.style, {
        border: "none", borderRadius: "10px",
        padding: "10px 16px", cursor: "pointer", fontSize: "14px"
      });
    });
    cancelBtn.style.cssText += "background:#333;color:#fff;";
    confirmBtn.style.cssText += "background:#00b894;color:#001;";

    function close() { overlay.remove(); isReviewOpen = false; }
    cancelBtn.addEventListener("click", () => { close(); onCancel(); });
    confirmBtn.addEventListener("click", () => { close(); onConfirm(); });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) { close(); onCancel(); } });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(list);
    card.appendChild(actions);
    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
  }

  // ── Redaction ─────────────────────────────────────────────────────────────

  function applyRedaction({ text, findings, target, source, replaceAll }) {
    const sanitized = sanitizeText(text, findings, currentSettings);

    const commit = () => {
      if (replaceAll && target) setElementText(target, sanitized);
      else if (target) insertSanitizedText(target, sanitized);
      recordStats(findings, source);
      showMaskitPopup(findings);
    };

    if (currentSettings.reviewBeforeRedact) {
      showReviewDialog(findings, commit, () => { });
      return;
    }
    commit();
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  function handlePaste(event) {
    if (!isProtectionActive() || currentSettings.scanPaste === false) return;
    const text = event.clipboardData?.getData("text");
    if (!text) return;
    const findings = detectSensitiveData(text, currentSettings);
    if (!findings.length) return;
    const target = getEventTarget(event);
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    applyRedaction({ text, findings, target, source: "paste", replaceAll: false });
  }

  function handleCopy(event) {
    if (!isProtectionActive() || currentSettings.scanCopy === false) return;
    const selection = window.getSelection()?.toString();
    if (!selection) return;
    const findings = detectSensitiveData(selection, currentSettings);
    if (!findings.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const sanitized = sanitizeText(selection, findings, currentSettings);

    const commit = () => {
      event.clipboardData.setData("text/plain", sanitized);
      recordStats(findings, "copy");
      showMaskitPopup(findings);
    };
    if (currentSettings.reviewBeforeRedact) {
      showReviewDialog(findings, commit, () => { });
      return;
    }
    commit();
  }

  function commitTypingRedaction(target, text, findings) {
    const sanitized = sanitizeText(text, findings, currentSettings);

    const commit = () => {
      if (isRichEditor(target)) {
        replaceFindingsInContentEditable(target, findings, currentSettings);
      } else {
        setElementText(target, sanitized);
      }
      recordStats(findings, "typing");
      showMaskitPopup(findings);
    };

    if (currentSettings.reviewBeforeRedact) {
      // Grace delay: wait 1.5s before showing dialog so rapid typing isn't interrupted
      clearTimeout(reviewDialogTimer);
      reviewDialogTimer = setTimeout(() => {
        showReviewDialog(findings, commit, () => { });
      }, 1500);
      return;
    }
    commit();
  }

  function scanTypedContent(target) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    if (!target || isApplyingRedaction) return;

    const text = getElementText(target);
    const findings = detectSensitiveData(text, currentSettings);
    if (!findings.length) return;

    const sanitized = sanitizeText(text, findings, currentSettings);
    if (sanitized === text) return;

    commitTypingRedaction(target, text, findings);
  }

  function scheduleTypingScan(target, delay = 80) {
    if (!target) return;

    // Cancel any pending review dialog since we're about to rescan
    clearTimeout(reviewDialogTimer);
    reviewDialogTimer = null;

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => scanTypedContent(target), delay);

    if (!typingMaxTimer) {
      const maxDelay = isRichEditor(target) ? 800 : 450;
      typingMaxTimer = setTimeout(() => {
        typingMaxTimer = null;
        scanTypedContent(target);
      }, maxDelay);
    }
  }

  function clearTypingScanSchedule() {
    clearTimeout(typingTimer);
    clearTimeout(typingMaxTimer);
    clearTimeout(reviewDialogTimer);
    typingTimer = null;
    typingMaxTimer = null;
    reviewDialogTimer = null;
  }

  function handleBeforeInput(event) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    if (isApplyingRedaction) return;

    const inputType = event.inputType || "";

    // Skip paste events and browser autofill replacements
    if (inputType === "insertFromPaste" || inputType === "insertReplacementText") return;

    const target = getEventTarget(event);
    if (!target) return;

    if (inputType.startsWith("delete")) {
      scheduleTypingScan(target, 0);
      return;
    }

    const insertTypes = new Set([
      "insertText",
      "insertFromDrop",
      "insertLineBreak",
      "insertParagraph"
    ]);
    if (!insertTypes.has(inputType) && !inputType.startsWith("insert")) return;

    const proposed = getProposedText(target, event);
    if (proposed === null) {
      scheduleTypingScan(target, 0);
      return;
    }

    const findings = detectSensitiveData(proposed, currentSettings);
    if (!findings.length) {
      scheduleTypingScan(target, isRichEditor(target) ? 250 : 120);
      return;
    }

    const sanitized = sanitizeText(proposed, findings, currentSettings);
    if (sanitized === proposed) {
      scheduleTypingScan(target, 0);
      return;
    }

    if (isRichEditor(target)) {
      scheduleTypingScan(target, 0);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    clearTypingScanSchedule();
    commitTypingRedaction(target, proposed, findings);
  }

  function handleInput(event) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    if (isApplyingRedaction) return;
    const target = findEditableElement(event.target);
    if (!target) return;
    scheduleTypingScan(target, isRichEditor(target) ? 150 : 80);
  }

  function handleKeyup(event) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    if (isApplyingRedaction) return;
    const target = findEditableElement(event.target);
    if (!target) return;

    if (event.key === " " || event.key === "Enter" || event.key === "Tab") {
      clearTypingScanSchedule();
      setTimeout(() => scanTypedContent(target), isRichEditor(target) ? 50 : 0);
      return;
    }
    scheduleTypingScan(target, isRichEditor(target) ? 120 : 60);
  }

  function handleCompositionEnd(event) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    const target = findEditableElement(event.target);
    if (!target) return;
    clearTypingScanSchedule();
    scanTypedContent(target);
  }

  function handleFocusOut(event) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    if (isApplyingRedaction) return;
    const target = findEditableElement(event.target);
    if (!target) return;
    clearTypingScanSchedule();
    scanTypedContent(target);
  }

  // ── Traffic light widget (Shadow DOM, top-right corner) ───────────────────

  function getTrafficLightState() {
    const globallyEnabled = currentSettings.enabled !== false;
    const siteAllowed = isSiteAllowed(currentSettings, location.hostname);
    if (!globallyEnabled || !siteAllowed) return { colorClass: "red", label: "Stopped", pauseText: null };
    if (isPaused) return { colorClass: "amber", label: "Paused", pauseText: "▶ Resume" };
    return { colorClass: "green", label: "Active", pauseText: "⏸ Pause" };
  }

  function initTrafficLight() {
    const existing = document.getElementById("maskit-tl-host");
    if (existing) existing.remove();
    trafficLightShadow = null;

    const host = document.createElement("div");
    host.id = "maskit-tl-host";
    Object.assign(host.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: "2147483647",
      display: "block"
    });

    const shadow = host.attachShadow({ mode: "open" });
    trafficLightShadow = shadow;

    // ── Styles ────────────────────────────────────────────────────────────
    const style = document.createElement("style");
    style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    #tl-wrap {
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* ── Collapsed dot ────────────────────────────────────────────────── */
    #tl-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      margin-top: 3px;
    }
    #tl-dot:hover { transform: scale(1.25); }

    #tl-dot.green { background:#00b894; box-shadow: 0 0 0 3px rgba(0,184,148,0.22), 0 0 10px rgba(0,184,148,0.55); }
    #tl-dot.amber { background:#f6b93b; box-shadow: 0 0 0 3px rgba(246,185,59,0.22), 0 0 10px rgba(246,185,59,0.55); }
    #tl-dot.red   { background:#e55039; box-shadow: 0 0 0 3px rgba(229,80,57,0.22),  0 0 10px rgba(229,80,57,0.55); }

    /* ── Expanded panel ───────────────────────────────────────────────── */
    #tl-panel {
      position: absolute;
      top: 0;
      right: 20px;
      background: #171a21;
      border: 1px solid #2e3340;
      border-radius: 12px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
      box-shadow: 0 8px 32px rgba(0,0,0,0.55);
      opacity: 0;
      pointer-events: none;
      transform: translateX(8px);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    #tl-panel.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(0);
    }

    #tl-brand {
      font-size: 11px;
      font-weight: 700;
      color: #9aa4b2;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding-right: 8px;
      border-right: 1px solid #2e3340;
    }

    #tl-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #tl-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    #tl-status-dot.green { background: #00b894; }
    #tl-status-dot.amber { background: #f6b93b; }
    #tl-status-dot.red   { background: #e55039; }

    #tl-label {
      font-size: 13px;
      font-weight: 500;
      color: #e0e6ed;
    }

    #tl-sep { width: 1px; height: 18px; background: #2e3340; flex-shrink: 0; }

    #tl-actions { display: flex; gap: 6px; }

    .tl-btn {
      border-radius: 7px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
      line-height: 1;
    }

    #tl-pause-btn {
      background: rgba(246,185,59,0.1);
      color: #f6b93b;
      border: 1px solid rgba(246,185,59,0.3);
    }
    #tl-pause-btn:hover:not(:disabled) { background: rgba(246,185,59,0.2); }
    #tl-pause-btn:disabled { opacity: 0.38; cursor: default; }

    #tl-exclude-btn {
      background: rgba(229,80,57,0.1);
      color: #e55039;
      border: 1px solid rgba(229,80,57,0.3);
    }
    #tl-exclude-btn:hover:not(:disabled) { background: rgba(229,80,57,0.2); }
    #tl-exclude-btn.excluded {
      background: rgba(255,255,255,0.04);
      color: #9aa4b2;
      border-color: #2e3340;
      cursor: default;
    }
  `;

    // ── DOM ───────────────────────────────────────────────────────────────
    const wrap = document.createElement("div");
    wrap.id = "tl-wrap";

    const dot = document.createElement("div");
    dot.id = "tl-dot";

    const panel = document.createElement("div");
    panel.id = "tl-panel";

    const brand = document.createElement("span");
    brand.id = "tl-brand";
    brand.textContent = "Maskit";

    const indicator = document.createElement("div");
    indicator.id = "tl-indicator";
    const statusDot = document.createElement("div");
    statusDot.id = "tl-status-dot";
    const label = document.createElement("span");
    label.id = "tl-label";
    indicator.appendChild(statusDot);
    indicator.appendChild(label);

    const sep = document.createElement("div");
    sep.id = "tl-sep";

    const actions = document.createElement("div");
    actions.id = "tl-actions";

    const pauseBtn = document.createElement("button");
    pauseBtn.id = "tl-pause-btn";
    pauseBtn.className = "tl-btn";

    const excludeBtn = document.createElement("button");
    excludeBtn.id = "tl-exclude-btn";
    excludeBtn.className = "tl-btn";
    excludeBtn.textContent = "✕ Exclude page";

    actions.appendChild(pauseBtn);
    actions.appendChild(excludeBtn);
    panel.appendChild(brand);
    panel.appendChild(indicator);
    panel.appendChild(sep);
    panel.appendChild(actions);

    wrap.appendChild(panel);
    wrap.appendChild(dot);

    shadow.appendChild(style);
    shadow.appendChild(wrap);

    // ── Hover interaction ─────────────────────────────────────────────────
    dot.addEventListener("mouseenter", () => panel.classList.add("visible"));
    wrap.addEventListener("mouseleave", () => panel.classList.remove("visible"));
    panel.addEventListener("mouseenter", () => panel.classList.add("visible"));

    // ── Pause button ──────────────────────────────────────────────────────
    pauseBtn.addEventListener("click", () => {
      try {
        chrome.runtime.sendMessage({ type: "TOGGLE_PAUSE" }, () => {
          void chrome.runtime.lastError;
        });
      } catch { }
      panel.classList.remove("visible");
    });

    // ── Exclude button ────────────────────────────────────────────────────
    excludeBtn.addEventListener("click", () => {
      if (excludeBtn.classList.contains("excluded")) return;
      try {
        chrome.runtime.sendMessage({ type: "ADD_TO_BLOCKLIST", hostname: location.hostname }, () => {
          void chrome.runtime.lastError;
          excludeBtn.textContent = "✓ Excluded";
          excludeBtn.classList.add("excluded");
          excludeBtn.disabled = true;
          setTimeout(() => panel.classList.remove("visible"), 900);
        });
      } catch { }
    });

    (document.body || document.documentElement).appendChild(host);
    updateTrafficLight();
  }

  function updateTrafficLight() {
    if (!trafficLightShadow) return;

    const dot = trafficLightShadow.getElementById("tl-dot");
    const statusDot = trafficLightShadow.getElementById("tl-status-dot");
    const label = trafficLightShadow.getElementById("tl-label");
    const pauseBtn = trafficLightShadow.getElementById("tl-pause-btn");
    const excludeBtn = trafficLightShadow.getElementById("tl-exclude-btn");
    if (!dot || !label || !pauseBtn) return;

    const state = getTrafficLightState();
    dot.className = state.colorClass;
    statusDot.className = state.colorClass;
    label.textContent = state.label;

    if (state.pauseText) {
      pauseBtn.textContent = state.pauseText;
      pauseBtn.disabled = false;
    } else {
      pauseBtn.textContent = "⏸ Pause";
      pauseBtn.disabled = true;
    }

    // Sync exclude button state
    if (excludeBtn && !excludeBtn.classList.contains("excluded")) {
      const siteAllowed = isSiteAllowed(currentSettings, location.hostname);
      const alreadyBlocked = !siteAllowed && currentSettings.siteListMode === "blocklist";
      if (alreadyBlocked) {
        excludeBtn.textContent = "✓ Excluded";
        excludeBtn.classList.add("excluded");
        excludeBtn.disabled = true;
      }
    }
  }

  // ── Pause banner ──────────────────────────────────────────────────────────

  function showPauseBanner() {
    hidePauseBanner();

    const banner = document.createElement("div");
    banner.id = "maskit-pause-banner";
    Object.assign(banner.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "2147483644",
      background: "linear-gradient(90deg, #e67e22, #f6b93b)",
      color: "#1a1200",
      padding: "8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: "13px",
      fontWeight: "500",
      boxShadow: "0 2px 12px rgba(246,185,59,0.4)"
    });

    const textEl = document.createElement("span");
    textEl.textContent = "⏸  Maskit paused — sensitive data is NOT being scanned";

    const rightEl = document.createElement("div");
    rightEl.style.cssText = "display:flex;align-items:center;gap:12px;flex-shrink:0;";

    const countdownEl = document.createElement("span");
    countdownEl.id = "maskit-pause-countdown";
    countdownEl.style.cssText = "font-size:12px;opacity:0.75;";

    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "Resume now";
    Object.assign(resumeBtn.style, {
      background: "rgba(0,0,0,0.15)",
      border: "1px solid rgba(0,0,0,0.2)",
      borderRadius: "6px",
      color: "#1a1200",
      padding: "4px 12px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
      fontFamily: "inherit"
    });
    resumeBtn.addEventListener("click", () => {
      try { chrome.runtime.sendMessage({ type: "TOGGLE_PAUSE" }); } catch { }
    });

    rightEl.appendChild(countdownEl);
    rightEl.appendChild(resumeBtn);
    banner.appendChild(textEl);
    banner.appendChild(rightEl);

    (document.body || document.documentElement).insertBefore(
      banner,
      (document.body || document.documentElement).firstChild
    );

    // Countdown display
    if (currentSettings.pauseAutoResume !== false) {
      let secs = Math.max(1, currentSettings.pauseAutoResumeSecs || 30);
      countdownEl.textContent = `Auto-resumes in ${secs}s`;
      const interval = setInterval(() => {
        secs--;
        if (secs <= 0) {
          clearInterval(interval);
          countdownEl.textContent = "Resuming…";
        } else {
          countdownEl.textContent = `Auto-resumes in ${secs}s`;
        }
      }, 1000);
      banner._countdownInterval = interval;
    }
  }

  function hidePauseBanner() {
    const banner = document.getElementById("maskit-pause-banner");
    if (!banner) return;
    if (banner._countdownInterval) clearInterval(banner._countdownInterval);
    banner.remove();
  }

  // ── Auto-resume ───────────────────────────────────────────────────────────

  function scheduleAutoResume() {
    clearAutoResumeTimer();
    if (currentSettings.pauseAutoResume === false) return;
    const secs = Math.max(1, currentSettings.pauseAutoResumeSecs || 30);
    pauseAutoResumeTimer = setTimeout(() => {
      try { chrome.runtime.sendMessage({ type: "TOGGLE_PAUSE" }); } catch { }
    }, secs * 1000);
  }

  function clearAutoResumeTimer() {
    if (pauseAutoResumeTimer) {
      clearTimeout(pauseAutoResumeTimer);
      pauseAutoResumeTimer = null;
    }
  }

  // ── Message listener ──────────────────────────────────────────────────────

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "SCAN_SELECTION" && message.text) {
        const findings = detectSensitiveData(message.text, currentSettings);
        if (findings.length) {
          const sanitized = sanitizeText(message.text, findings, currentSettings);
          // Replace selected text with redacted version
          try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(sanitized));
              sel.removeAllRanges();
            }
          } catch { }
          recordStats(findings, "contextMenu");
          showMaskitPopup(findings);
        }
        return;
      }

      if (message.type !== "PAUSE_STATE_CHANGED") return;
      isPaused = !!message.paused;
      updateTrafficLight();
      if (isPaused) {
        showPauseBanner();
        scheduleAutoResume();
      } else {
        hidePauseBanner();
        clearAutoResumeTimer();
      }
    });
  } catch {
    // messaging unavailable
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", () => {
    initTrafficLight();

    // Fetch initial pause state
    try {
      chrome.runtime.sendMessage({ type: "GET_PAUSE_STATE" }, (response) => {
        if (chrome.runtime.lastError) return;
        isPaused = !!(response && response.paused);
        updateTrafficLight();
        if (isPaused) {
          showPauseBanner();
          scheduleAutoResume();
        }
      });
    } catch { }
  }, { once: true });

  // ── DOM event listeners ───────────────────────────────────────────────────

  document.addEventListener("paste", handlePaste, true);
  window.addEventListener("paste", handlePaste, true);
  document.addEventListener("copy", handleCopy, true);
  window.addEventListener("copy", handleCopy, true);
  document.addEventListener("beforeinput", handleBeforeInput, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("keyup", handleKeyup, true);
  document.addEventListener("compositionend", handleCompositionEnd, true);
  document.addEventListener("focusout", handleFocusOut, true);

} // end _maskitInit
