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
      chrome.storage.local.get({ ...MASKIT_DEFAULTS, policies: null }, (items) => {
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
      if (area === "local") loadSettings();
    });
  } catch {
    // storage listener unavailable
  }

  // ── Killswitch check ──────────────────────────────────────────────────────

  function checkKillswitch() {
    const ks = currentSettings.killswitch || { enabled: false };
    if (!ks.enabled) return { blocked: false };

    // Check schedule
    if (ks.schedule) {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const day = now.getDay();
      const currentMinutes = hour * 60 + minute;

      const disableParts = (ks.schedule.disable || "").split(":");
      const enableParts = (ks.schedule.enable || "").split(":");
      const disableTime = disableParts.length === 2 ? parseInt(disableParts[0], 10) * 60 + parseInt(disableParts[1], 10) : null;
      const enableTime = enableParts.length === 2 ? parseInt(enableParts[0], 10) * 60 + parseInt(enableParts[1], 10) : null;
      const daysOfWeek = ks.schedule.daysOfWeek || [1, 2, 3, 4, 5];

      if (daysOfWeek.includes(day) && disableTime !== null && enableTime !== null) {
        let restricted = false;
        if (disableTime > enableTime) {
          restricted = currentMinutes >= disableTime || currentMinutes < enableTime;
        } else {
          restricted = currentMinutes >= disableTime && currentMinutes < enableTime;
        }
        if (restricted) {
          return { blocked: true, reason: "AI tools disabled by schedule" };
        }
      }
      return { blocked: false };
    }

    // Check time-limited
    if (ks.duration) {
      if (Date.now() < new Date(ks.duration).getTime()) {
        return { blocked: true, reason: ks.message || "AI tools restricted" };
      }
      return { blocked: false };
    }

    // Indefinite killswitch
    return { blocked: true, reason: ks.message || "AI tools restricted by administrator" };
  }

  function showKillswitchModal(message) {
    // Remove existing modal
    const existing = document.getElementById("maskit-killswitch-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "maskit-killswitch-modal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";

    const content = document.createElement("div");
    content.style.cssText = "background:#171a21;padding:30px;border-radius:16px;max-width:420px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.55);border:1px solid #252933;color:#fff;";

    // Use createElement + textContent to prevent HTML injection
    const title = document.createElement("h2");
    title.style.cssText = "margin:0 0 12px;font-size:20px;";
    title.textContent = "⛔ " + (message || "AI tools restricted");
    content.appendChild(title);

    const para1 = document.createElement("p");
    para1.style.cssText = "color:#9aa4b2;margin:0 0 20px;font-size:14px;";
    para1.textContent = "This restriction was set by your organization.";
    content.appendChild(para1);

    const para2 = document.createElement("p");
    para2.style.cssText = "font-size:12px;color:#666;margin:0 0 16px;";
    para2.textContent = "Contact your administrator if you believe this is in error.";
    content.appendChild(para2);

    const closeBtn = document.createElement("button");
    closeBtn.id = "maskit-killswitch-close";
    closeBtn.style.cssText = "background:#252933;color:#fff;border:1px solid #333;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;";
    closeBtn.textContent = "OK";
    content.appendChild(closeBtn);

    modal.appendChild(content);
    (document.body || document.documentElement).appendChild(modal);

    document.getElementById("maskit-killswitch-close").addEventListener("click", function () {
      modal.remove();
    });
  }

  // ── Protection check ──────────────────────────────────────────────────────

  function isProtectionActive() {
    return (
      currentSettings.enabled !== false &&
      isSiteAllowed(currentSettings, location.hostname) &&
      !isPaused
    );
  }

  // ── Stats & Audit Log ───────────────────────────────────────────────────

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

  function recordAuditEvents(events, source) {
    if (!events || !events.length) return;
    try {
      const enriched = events.map(function (e) {
        return Object.assign({}, e, { source: source || e.source || "unknown" });
      });
      chrome.runtime.sendMessage({ type: "RECORD_AUDIT_EVENTS", events: enriched });
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

  function setReactInputValue(element, value) {
    const prototype = element.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertIntoInput(element, text) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const newVal = element.value.slice(0, start) + text + element.value.slice(end);
    setReactInputValue(element, newVal);
    try { element.setSelectionRange(start + text.length, start + text.length); } catch {}
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
        setReactInputValue(element, text);
        const end = text.length;
        try { element.setSelectionRange(end, end); } catch {}
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
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      opacity: "0",
      transition: "opacity 0.1s ease-out"
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "#171a21", color: "#fff",
      borderRadius: "12px", padding: "20px",
      width: "min(380px, 92vw)",
      border: "1px solid #252933",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      transform: "scale(0.95)",
      transition: "transform 0.1s ease-out"
    });

    // Compact findings list
    const findingsText = findings.length + " sensitive item" + (findings.length > 1 ? "s" : "") + ": " +
      findings.slice(0, 3).map(function (f) { return f.type; }).join(", ") +
      (findings.length > 3 ? " +" + (findings.length - 3) + " more" : "");

    // Use createElement + textContent to prevent HTML injection from custom rule names
    const headerDiv = document.createElement("div");
    headerDiv.style.cssText = "margin:0 0 4px;font-size:15px;font-weight:600;";
    headerDiv.textContent = "Review before redacting";
    card.appendChild(headerDiv);

    const findingsDiv = document.createElement("div");
    findingsDiv.style.cssText = "color:#9aa4b2;margin:0 0 16px;font-size:13px;";
    findingsDiv.textContent = findingsText;
    card.appendChild(findingsDiv);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "maskit-review-cancel";
    cancelBtn.style.cssText = "background:#333;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-family:inherit;";
    cancelBtn.textContent = "Cancel ";
    const cancelHint = document.createElement("span");
    cancelHint.style.cssText = "color:#666;font-size:11px;";
    cancelHint.textContent = "Esc";
    cancelBtn.appendChild(cancelHint);
    btnRow.appendChild(cancelBtn);

    const confirmBtn = document.createElement("button");
    confirmBtn.id = "maskit-review-confirm";
    confirmBtn.style.cssText = "background:#00b894;color:#001;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;";
    confirmBtn.textContent = "Redact ";
    const confirmHint = document.createElement("span");
    confirmHint.style.cssText = "opacity:0.6;font-size:11px;";
    confirmHint.textContent = "↵";
    confirmBtn.appendChild(confirmHint);
    btnRow.appendChild(confirmBtn);

    card.appendChild(btnRow);

    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);

    // Instant appear
    requestAnimationFrame(function () {
      overlay.style.opacity = "1";
      card.style.transform = "scale(1)";
    });

    confirmBtn.focus();

    function close() {
      overlay.style.opacity = "0";
      card.style.transform = "scale(0.95)";
      setTimeout(function () { overlay.remove(); }, 100);
      isReviewOpen = false;
      document.removeEventListener("keydown", handleKey);
    }

    function handleKey(e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); close(); onConfirm(); }
      if (e.key === "Escape") { e.preventDefault(); close(); onCancel(); }
    }

    document.addEventListener("keydown", handleKey);
    cancelBtn.addEventListener("click", function () { close(); onCancel(); });
    confirmBtn.addEventListener("click", function () { close(); onConfirm(); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { close(); onCancel(); } });
  }

  // ── Audit event generation (canonical schema only) ──────────────────────

  function generateAuditEvents(decisions, source) {
    const app = location.hostname || "unknown";
    return decisions.map(function (d) {
      return createEventFromFinding({
        finding: d.finding,
        decision: d,
        context: {
          source: source || "browser",
          app: app,
          domain: app,
          policyName: currentSettings.activePolicy || "default"
        },
        settings: currentSettings
      });
    });
  }

  // ── Redaction ─────────────────────────────────────────────────────────────

  function applyRedaction({ text, findings, target, source, replaceAll }) {
    const app = location.hostname || "unknown";
    const policy = selectPolicy({ app }, currentSettings);

    const decisions = findings.map(f => {
      const typeBase = f.type.replace(/^CUSTOM:/, '');
      const action = getPolicyAction(policy, typeBase);
      return { finding: f, action };
    });

    const blocked = decisions.filter(d => d.action === "block").map(d => d.finding);
    const redacted = decisions.filter(d => d.action === "redact").map(d => d.finding);

    const auditEvents = generateAuditEvents(decisions, source);
    recordAuditEvents(auditEvents, source);

    if (blocked.length > 0) {
      recordStats(blocked, source);
      showToast(`Blocked by policy: ${blocked.map(f => f.type).join(", ")}`);
      return;
    }

    if (redacted.length === 0) {
      if (source === "paste" || source === "beforeinput") {
        insertSanitizedText(target, text);
      }
      return;
    }

    const sanitized = sanitizeText(text, redacted, currentSettings);

    const commit = () => {
      if (replaceAll && target) setElementText(target, sanitized);
      else if (target) insertSanitizedText(target, sanitized);
      recordStats(redacted, source);
      showMaskitPopup(redacted);
    };

    if (currentSettings.reviewBeforeRedact) {
      showReviewDialog(redacted, commit, () => { });
      return;
    }
    commit();
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  // Skip text that's already been redacted
  function isAlreadyRedacted(text) {
    if (!text) return false;
    return /\*{3,}|\[.*_REDACTED\]|\[BLOCKED\]/.test(text);
  }

  function handlePaste(event) {
    // Killswitch enforcement
    const ksCheck = checkKillswitch();
    if (ksCheck.blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showKillswitchModal(ksCheck.reason);
      return;
    }

    if (!isProtectionActive() || currentSettings.scanPaste === false) return;
    const text = event.clipboardData?.getData("text");
    if (!text || isAlreadyRedacted(text)) return;
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
    if (!selection || isAlreadyRedacted(selection)) return;
    const findings = detectSensitiveData(selection, currentSettings);
    if (!findings.length) return;

    const app = location.hostname || "unknown";
    const policy = selectPolicy({ app }, currentSettings);
    const decisions = findings.map(f => {
      const typeBase = f.type.replace(/^CUSTOM:/, '');
      const action = getPolicyAction(policy, typeBase);
      return { finding: f, action };
    });

    const blocked = decisions.filter(d => d.action === "block").map(d => d.finding);
    const redacted = decisions.filter(d => d.action === "redact").map(d => d.finding);

    const auditEvents = generateAuditEvents(decisions, "copy");
    recordAuditEvents(auditEvents, "copy");

    if (blocked.length > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      recordStats(blocked, "copy");
      showToast(`Blocked by policy: ${blocked.map(f => f.type).join(", ")}`);
      return;
    }

    if (redacted.length === 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const sanitized = sanitizeText(selection, redacted, currentSettings);

    const commit = () => {
      event.clipboardData.setData("text/plain", sanitized);
      recordStats(redacted, "copy");
      showMaskitPopup(redacted);
    };
    if (currentSettings.reviewBeforeRedact) {
      showReviewDialog(redacted, commit, () => { });
      return;
    }
    commit();
  }

  function commitTypingRedaction(target, text, findings) {
    const app = location.hostname || "unknown";
    const policy = selectPolicy({ app }, currentSettings);

    const decisions = findings.map(f => {
      const typeBase = f.type.replace(/^CUSTOM:/, '');
      const action = getPolicyAction(policy, typeBase);
      return { finding: f, action };
    });

    const blocked = decisions.filter(d => d.action === "block").map(d => d.finding);
    const redacted = decisions.filter(d => d.action === "redact").map(d => d.finding);

    const auditEvents = generateAuditEvents(decisions, "typing");
    recordAuditEvents(auditEvents, "typing");

    if (blocked.length > 0) {
      recordStats(blocked, "typing");
      setElementText(target, "");
      showToast(`Blocked by policy: ${blocked.map(f => f.type).join(", ")}`);
      return;
    }

    if (redacted.length === 0) {
      return;
    }

    const sanitized = sanitizeText(text, redacted, currentSettings);

    const commit = () => {
      if (isRichEditor(target)) {
        replaceFindingsInContentEditable(target, redacted, currentSettings);
      } else {
        setElementText(target, sanitized);
      }
      recordStats(redacted, "typing");
      showMaskitPopup(redacted);
    };

    if (currentSettings.reviewBeforeRedact) {
      clearTimeout(reviewDialogTimer);
      reviewDialogTimer = setTimeout(() => {
        showReviewDialog(redacted, commit, () => { });
      }, 400);
      return;
    }
    commit();
  }

  function scanTypedContent(target) {
    if (!isProtectionActive() || currentSettings.scanTyping === false) return;
    if (!target || isApplyingRedaction) return;

    const text = getElementText(target);
    if (isAlreadyRedacted(text)) return;
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
    // Killswitch enforcement
    const ksCheck = checkKillswitch();
    if (ksCheck.blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showKillswitchModal(ksCheck.reason);
      return;
    }

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

    const app = location.hostname || "unknown";
    const policy = selectPolicy({ app }, currentSettings);
    const decisions = findings.map(f => {
      const typeBase = f.type.replace(/^CUSTOM:/, '');
      const action = getPolicyAction(policy, typeBase);
      return { finding: f, action };
    });

    const blocked = decisions.filter(d => d.action === "block").map(d => d.finding);
    const redacted = decisions.filter(d => d.action === "redact").map(d => d.finding);

    if (blocked.length > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearTypingScanSchedule();
      recordStats(blocked, "typing");
      const auditEvents = generateAuditEvents(decisions, "typing");
      recordAuditEvents(auditEvents, "typing");
      showToast(`Blocked by policy: ${blocked.map(f => f.type).join(", ")}`);
      return;
    }

    if (redacted.length === 0) {
      scheduleTypingScan(target, isRichEditor(target) ? 250 : 120);
      return;
    }

    if (isRichEditor(target)) {
      scheduleTypingScan(target, 0);
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    clearTypingScanSchedule();
    applyRedaction({ text: proposed, findings, target, source: "typing", replaceAll: true });
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

    const settingsBtn = document.createElement("button");
    settingsBtn.id = "tl-settings-btn";
    settingsBtn.className = "tl-btn";
    settingsBtn.textContent = "\u2699";
    settingsBtn.title = "Open settings";

    actions.appendChild(pauseBtn);
    actions.appendChild(excludeBtn);
    actions.appendChild(settingsBtn);
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

    // ── Settings button ───────────────────────────────────────────────────
    settingsBtn.addEventListener("click", () => {
      try {
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }, () => {
          void chrome.runtime.lastError;
        });
      } catch { }
      panel.classList.remove("visible");
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

  // ── File upload protection ──────────────────────────────────────────────────

  let isFileDialogOpen = false;

  function handleFiles(files, event, target, originalEventName) {
    if (event.__maskitBypass) return;

    const filesArray = Array.from(files);
    if (filesArray.length === 0) return;

    // Unconditionally stop propagation to perform local scanning
    event.preventDefault();
    event.stopImmediatePropagation();

    const allowedExtensions = new Set([
      "txt", "json", "yaml", "yml", "xml", "csv",
      "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "hpp", "cs", "go", "rs",
      "html", "css", "md", "sh", "bat", "ps1", "sql", "rb", "pl", "php"
    ]);

    function readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });
    }

    const app = location.hostname || "unknown";
    const scanPromises = filesArray.map(async (file) => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isSupportedText = allowedExtensions.has(ext) || file.type.startsWith("text/") || file.type === "application/json";

      if (!isSupportedText) {
        return { file, findings: [], redactedContent: null };
      }

      try {
        const content = await readFileAsText(file);
        const findings = detectSensitiveData(content, currentSettings);
        if (findings.length > 0) {
          const redactedContent = sanitizeText(content, findings, currentSettings);
          return { file, findings, redactedContent, content };
        }
        return { file, findings: [], redactedContent: null };
      } catch (err) {
        console.error("Maskit file read error:", err);
        return { file, findings: [], redactedContent: null };
      }
    });

    Promise.all(scanPromises).then((results) => {
      const allFindings = [];
      results.forEach(r => {
        if (r.findings.length > 0) {
          allFindings.push(...r.findings);
        }
      });

      if (allFindings.length === 0) {
        proceedWithUpload(target, originalEventName, filesArray);
        return;
      }

      const policy = selectPolicy({ app }, currentSettings);
      const decisions = allFindings.map(f => {
        const typeBase = f.type.replace(/^CUSTOM:/, '');
        const action = getPolicyAction(policy, typeBase);
        return { finding: f, action };
      });

      const processedResults = results.map(r => {
        if (r.findings.length === 0) return { ...r, status: "clean" };
        const fileDecisions = r.findings.map(f => {
          const typeBase = f.type.replace(/^CUSTOM:/, '');
          const action = getPolicyAction(policy, typeBase);
          return { finding: f, action };
        });
        const hasBlock = fileDecisions.some(d => d.action === "block");
        const hasRedact = fileDecisions.some(d => d.action === "redact");
        if (hasBlock) return { ...r, status: "block" };
        if (hasRedact) return { ...r, status: "redact" };
        return { ...r, status: "allow" };
      });

      const isFullyBlocked = processedResults.some(r => r.status === "block");

      showFileWarningDialog({
        results: processedResults,
        isFullyBlocked,
        onCancel: () => {
          const events = [];
          processedResults.forEach(r => {
            if (r.findings.length > 0) {
              events.push(...r.findings.map(f => {
                const typeBase = f.type.replace(/^CUSTOM:/, '');
                const action = getPolicyAction(policy, typeBase);
                return createEventFromFinding({
                  finding: f,
                  decision: { action },
                  context: {
                    source: "browser_file",
                    app,
                    domain: app,
                    policyName: currentSettings.activePolicy || "default",
                    contentType: r.file.type || "text/plain",
                    metadata: { filename: r.file.name, size: r.file.size }
                  },
                  settings: currentSettings
                });
              }));
            }
          });
          recordAuditEvents(events, "browser_file");
        },
        onAllow: () => {
          const events = [];
          processedResults.forEach(r => {
            if (r.findings.length > 0) {
              events.push(...r.findings.map(f => {
                return createEventFromFinding({
                  finding: f,
                  decision: { action: "allow" },
                  context: {
                    source: "browser_file",
                    app,
                    domain: app,
                    policyName: currentSettings.activePolicy || "default",
                    contentType: r.file.type || "text/plain",
                    metadata: { filename: r.file.name, size: r.file.size }
                  },
                  settings: currentSettings
                });
              }));
              recordStats(r.findings, "browser_file");
            }
          });
          recordAuditEvents(events, "browser_file");
          proceedWithUpload(target, originalEventName, filesArray);
        },
        onRedact: () => {
          const events = [];
          const finalFiles = processedResults.map(r => {
            if (r.status === "redact" && r.redactedContent !== null) {
              events.push(...r.findings.map(f => {
                return createEventFromFinding({
                  finding: f,
                  decision: { action: "redact" },
                  context: {
                    source: "browser_file",
                    app,
                    domain: app,
                    policyName: currentSettings.activePolicy || "default",
                    contentType: r.file.type || "text/plain",
                    metadata: { filename: r.file.name, size: r.file.size }
                  },
                  settings: currentSettings
                });
              }));
              recordStats(r.findings, "browser_file");
              return new File([r.redactedContent], r.file.name, { type: r.file.type });
            } else {
              if (r.findings.length > 0) {
                events.push(...r.findings.map(f => {
                  return createEventFromFinding({
                    finding: f,
                    decision: { action: "allow" },
                    context: {
                      source: "browser_file",
                      app,
                      domain: app,
                      policyName: currentSettings.activePolicy || "default",
                      contentType: r.file.type || "text/plain",
                      metadata: { filename: r.file.name, size: r.file.size }
                    },
                    settings: currentSettings
                  });
                }));
                recordStats(r.findings, "browser_file");
              }
              return r.file;
            }
          });
          recordAuditEvents(events, "browser_file");
          proceedWithUpload(target, originalEventName, finalFiles);
        }
      });
    });
  }

  function proceedWithUpload(target, eventName, files) {
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));

    if (eventName === "drop") {
      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt
      });
      dropEvent.__maskitBypass = true;
      target.dispatchEvent(dropEvent);
    } else {
      try {
        target.files = dt.files;
      } catch (e) {
        // Fallback for readonly target.files
      }
      const changeEvent = new Event("change", {
        bubbles: true,
        cancelable: true
      });
      changeEvent.__maskitBypass = true;
      target.dispatchEvent(changeEvent);
    }
  }

  function handleChange(event) {
    if (!isProtectionActive()) return;
    const target = event.target;
    if (target && target.tagName === "INPUT" && target.type === "file") {
      const files = target.files;
      if (files && files.length > 0) {
        handleFiles(files, event, target, "change");
      }
    }
  }

  function handleDrop(event) {
    if (!isProtectionActive()) return;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(files, event, event.target, "drop");
    }
  }

  function showFileWarningDialog({ results, isFullyBlocked, onCancel, onAllow, onRedact }) {
    if (isFileDialogOpen) return;
    isFileDialogOpen = true;

    const overlay = document.createElement("div");
    overlay.id = "maskit-file-overlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      background: "rgba(10, 12, 16, 0.8)",
      backdropFilter: "blur(8px)",
      webkitBackdropFilter: "blur(8px)",
      zIndex: "2147483647",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      opacity: "0",
      transition: "opacity 0.15s ease-out"
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "linear-gradient(135deg, #1b202e 0%, #11141d 100%)",
      color: "#e2e8f0",
      borderRadius: "16px",
      padding: "24px",
      width: "min(460px, 92vw)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)",
      transform: "scale(0.92)",
      transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
      display: "flex",
      flexDirection: "column",
      gap: "18px"
    });

    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-size: 17px; font-weight: 700; color: #f87171; display: flex; align-items: center; gap: 8px;";
    titleEl.textContent = "⚠️ Sensitive Information Detected";

    const descEl = document.createElement("div");
    descEl.style.cssText = "font-size: 13.5px; color: #94a3b8; line-height: 1.5;";
    descEl.textContent = isFullyBlocked
      ? "MaskIt local scanning intercepted the file upload. Some files match organization block policies and cannot be uploaded."
      : "MaskIt local scanning detected sensitive context in your files. Please select how you want to proceed before the files reach the AI system:";

    const fileListContainer = document.createElement("div");
    fileListContainer.style.cssText = "max-height: 160px; overflow-y: auto; background: rgba(0, 0, 0, 0.25); border-radius: 10px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; gap: 8px;";

    results.forEach(r => {
      if (r.findings.length === 0) return;
      const fileRow = document.createElement("div");
      fileRow.style.cssText = "display: flex; flex-direction: column; gap: 4px; padding: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.03);";
      
      const fileHeader = document.createElement("div");
      fileHeader.style.cssText = "display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;";
      
      const fileNameSpan = document.createElement("span");
      fileNameSpan.textContent = r.file.name;
      fileNameSpan.style.color = "#cbd5e1";
      
      const fileStatusSpan = document.createElement("span");
      if (r.status === "block") {
        fileStatusSpan.textContent = "Blocked";
        fileStatusSpan.style.color = "#f87171";
      } else {
        fileStatusSpan.textContent = "Sensitive";
        fileStatusSpan.style.color = "#fbbf24";
      }
      
      fileHeader.appendChild(fileNameSpan);
      fileHeader.appendChild(fileStatusSpan);
      
      const findingsSpan = document.createElement("div");
      findingsSpan.style.cssText = "font-size: 11px; color: #64748b; display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;";
      
      const types = Array.from(new Set(r.findings.map(f => f.type)));
      types.forEach(t => {
        const badge = document.createElement("span");
        badge.style.cssText = "background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 1px 5px; font-family: monospace;";
        badge.textContent = t;
        findingsSpan.appendChild(badge);
      });
      
      fileRow.appendChild(fileHeader);
      fileRow.appendChild(findingsSpan);
      fileListContainer.appendChild(fileRow);
    });

    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(fileListContainer);

    const actions = document.createElement("div");
    actions.style.cssText = "display: flex; gap: 10px; justify-content: flex-end; align-items: center; margin-top: 8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel Upload";
    cancelBtn.style.cssText = "background: rgba(255, 255, 255, 0.08); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 10px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: background 0.15s;";
    cancelBtn.addEventListener("mouseover", () => cancelBtn.style.background = "rgba(255, 255, 255, 0.12)");
    cancelBtn.addEventListener("mouseout", () => cancelBtn.style.background = "rgba(255, 255, 255, 0.08)");

    const redactBtn = document.createElement("button");
    redactBtn.textContent = "Redact & Upload";
    redactBtn.style.cssText = "background: #00b894; color: #001; border: none; border-radius: 8px; padding: 10px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: opacity 0.15s;";
    redactBtn.addEventListener("mouseover", () => redactBtn.style.opacity = "0.9");
    redactBtn.addEventListener("mouseout", () => redactBtn.style.opacity = "1");

    const allowBtn = document.createElement("button");
    allowBtn.textContent = "Allow Raw Upload";
    allowBtn.style.cssText = "background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 10px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: background 0.15s;";
    allowBtn.addEventListener("mouseover", () => allowBtn.style.background = "rgba(239, 68, 68, 0.08)");
    allowBtn.addEventListener("mouseout", () => allowBtn.style.background = "transparent");

    function closeDialog() {
      overlay.style.opacity = "0";
      card.style.transform = "scale(0.92)";
      setTimeout(() => {
        overlay.remove();
        isFileDialogOpen = false;
      }, 150);
    }

    cancelBtn.addEventListener("click", () => {
      closeDialog();
      onCancel();
    });

    redactBtn.addEventListener("click", () => {
      closeDialog();
      onRedact();
    });

    allowBtn.addEventListener("click", () => {
      closeDialog();
      onAllow();
    });

    actions.appendChild(cancelBtn);
    if (!isFullyBlocked) {
      actions.appendChild(redactBtn);
      actions.appendChild(allowBtn);
    } else {
      const blockMsg = document.createElement("span");
      blockMsg.style.cssText = "color: #f87171; font-size: 12.5px; font-weight: 500; margin-right: auto;";
      blockMsg.textContent = "Upload blocked by policy.";
      actions.insertBefore(blockMsg, cancelBtn);
    }

    card.appendChild(actions);
    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      card.style.transform = "scale(1)";
    });
  }

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
  document.addEventListener("change", handleChange, true);
  document.addEventListener("drop", handleDrop, true);

} // end _maskitInit
