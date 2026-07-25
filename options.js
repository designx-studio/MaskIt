const BUILTIN_RULES = [
  { key: "enabled", title: "Protection", desc: "Enable or disable Maskit globally." },
  { key: "scanPaste", title: "Scan paste", desc: "Redact sensitive data when pasting." },
  { key: "scanCopy", title: "Scan copy", desc: "Redact sensitive data when copying." },
  { key: "scanTyping", title: "Scan typing", desc: "Redact sensitive data as you type." },
  { key: "reviewBeforeRedact", title: "Review before redact", desc: "Confirm before replacing sensitive data." },
  { key: "pauseAutoResume", title: "Auto-resume pause", desc: "Automatically resume protection after a pause timeout." },
  { key: "EMAIL", title: "Email addresses", desc: "john@example.com" },
  { key: "PHONE", title: "Phone numbers", desc: "+254712345678" },
  { key: "CARD", title: "Card numbers", desc: "13 to 16 digit payment cards" },
  { key: "MPESA", title: "M-Pesa references", desc: "QKA12X9L4M" },
  { key: "SSN", title: "SSN", desc: "123-45-6789" },
  { key: "API_KEY", title: "API keys & tokens", desc: "OpenAI, Stripe, GitHub, AWS, Google, Slack, Bearer tokens" },
  { key: "IP_ADDRESS", title: "IP addresses", desc: "192.168.1.1" },
  { key: "PASSPORT", title: "Passport numbers", desc: "AB1234567" },
  { key: "BANK_ACCOUNT", title: "Bank accounts (IBAN)", desc: "GB82WEST12345698765432" }
];

let currentSettings = { ...MASKIT_DEFAULTS };

function showStatus(message) {
  const status = document.getElementById("save-status");
  status.textContent = message;
  setTimeout(() => {
    status.textContent = "";
  }, 1500);
}

function createToggleRow(key, title, desc, checked) {
  const row = document.createElement("div");
  row.className = "row";

  const copy = document.createElement("div");
  const titleEl = document.createElement("div");
  titleEl.className = "row-title";
  titleEl.textContent = title;
  const descEl = document.createElement("div");
  descEl.className = "row-desc";
  descEl.textContent = desc;
  copy.appendChild(titleEl);
  copy.appendChild(descEl);

  const label = document.createElement("label");
  label.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.key = key;
  input.checked = checked;
  const slider = document.createElement("span");
  slider.className = "slider";
  label.appendChild(input);
  label.appendChild(slider);

  row.appendChild(copy);
  row.appendChild(label);
  return row;
}

function renderProtectionRows(settings) {
  ["enabled", "scanPaste", "scanCopy", "scanTyping", "reviewBeforeRedact", "pauseAutoResume"].forEach((key) => {
    const rule = BUILTIN_RULES.find((item) => item.key === key);
    const container = document.getElementById("row-" + key);
    if (container) {
      container.replaceChildren(createToggleRow(key, rule.title, rule.desc, settings[key] !== false));
    }
  });

  // Pause seconds input
  const secsInput = document.getElementById("pause-auto-resume-secs");
  if (secsInput) secsInput.value = settings.pauseAutoResumeSecs || 30;

  // Show/hide seconds row based on toggle
  const secsWrap = document.getElementById("pause-secs-wrap");
  if (secsWrap) secsWrap.style.display = settings.pauseAutoResume !== false ? "flex" : "none";
}

function renderBuiltinRules(settings) {
  const container = document.getElementById("builtin-rules");
  container.replaceChildren();

  const excludedKeys = ["enabled", "scanPaste", "scanCopy", "scanTyping", "reviewBeforeRedact", "pauseAutoResume"];
  BUILTIN_RULES.filter((rule) => !excludedKeys.includes(rule.key))
    .forEach((rule) => {
      container.appendChild(createToggleRow(rule.key, rule.title, rule.desc, settings[rule.key] !== false));
    });
}

function renderCustomRules(rules) {
  const container = document.getElementById("custom-rules-list");
  container.replaceChildren();

  if (!rules.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No custom rules yet.";
    container.appendChild(empty);
    return;
  }

  rules.forEach((rule) => {
    const row = document.createElement("div");
    row.className = "custom-rule-item";

    const copy = document.createElement("div");
    const titleEl = document.createElement("div");
    titleEl.className = "row-title";
    titleEl.textContent = rule.name || "Custom rule";
    const patternEl = document.createElement("div");
    patternEl.className = "custom-rule-meta";
    patternEl.textContent = rule.pattern;
    copy.appendChild(titleEl);
    copy.appendChild(patternEl);

    const actions = document.createElement("div");
    actions.className = "custom-rule-actions";

    const label = document.createElement("label");
    label.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.ruleId = rule.id;
    input.checked = rule.enabled !== false;
    const slider = document.createElement("span");
    slider.className = "slider";
    label.appendChild(input);
    label.appendChild(slider);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.deleteRule = rule.id;
    deleteBtn.textContent = "Delete";

    actions.appendChild(label);
    actions.appendChild(deleteBtn);
    row.appendChild(copy);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function collectSettingsFromForm() {
  const settings = { ...currentSettings };

  document.querySelectorAll("input[data-key]").forEach((input) => {
    settings[input.dataset.key] = input.checked;
  });

  settings.redactFormat = document.getElementById("redact-format").value;
  settings.customRedactText = document.getElementById("custom-redact-text").value || "[REDACTED]";
  settings.siteListMode = document.getElementById("site-list-mode").value;
  settings.siteList = document
    .getElementById("site-list")
    .value.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const secsEl = document.getElementById("pause-auto-resume-secs");
  if (secsEl) {
    settings.pauseAutoResumeSecs = Math.min(300, Math.max(5, parseInt(secsEl.value, 10) || 30));
  }

  const rules = [...(settings.customRules || [])];
  document.querySelectorAll("input[data-rule-id]").forEach((input) => {
    const rule = rules.find((item) => item.id === input.dataset.ruleId);
    if (rule) rule.enabled = input.checked;
  });
  settings.customRules = rules;

  return settings;
}

function saveSettings() {
  const settings = collectSettingsFromForm();
  currentSettings = settings;

  chrome.storage.sync.set(settings, () => {
    showStatus("Settings saved.");
  });
}

function loadStats() {
  chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
    const stats = response?.stats || MASKIT_STATS_DEFAULTS;
    document.getElementById("stats-total").textContent = stats.totalRedactions || 0;
    document.getElementById("stats-paste").textContent = stats.bySource?.paste || 0;
    document.getElementById("stats-copy").textContent = stats.bySource?.copy || 0;
    document.getElementById("stats-typing").textContent = stats.bySource?.typing || 0;

    const byType = document.getElementById("stats-by-type");
    const entries = Object.entries(stats.byType || {});
    byType.textContent = entries.length
      ? "By type: " + entries.map(([type, count]) => `${type} (${count})`).join(", ")
      : "No redactions recorded yet.";
  });
}

function loadSettings() {
  chrome.storage.sync.get(MASKIT_DEFAULTS, (items) => {
    currentSettings = items;
    renderProtectionRows(items);
    renderBuiltinRules(items);
    renderCustomRules(items.customRules || []);

    document.getElementById("redact-format").value = items.redactFormat || "tagged";
    document.getElementById("custom-redact-text").value = items.customRedactText || "[REDACTED]";
    document.getElementById("site-list-mode").value = items.siteListMode || "all";
    document.getElementById("site-list").value = (items.siteList || []).join("\n");
    document.getElementById("custom-redact-wrap").style.display =
      items.redactFormat === "custom" ? "block" : "none";
  });

  loadStats();
}

function addCustomRule() {
  const name = document.getElementById("custom-rule-name").value.trim();
  const pattern = document.getElementById("custom-rule-pattern").value.trim();

  if (!name || !pattern) {
    showStatus("Enter a rule name and pattern.");
    return;
  }

  const validation = validateCustomRegexPattern(pattern);
  if (!validation.ok) {
    showStatus(validation.error);
    return;
  }

  const settings = collectSettingsFromForm();
  settings.customRules = settings.customRules || [];

  if (settings.customRules.length >= REGEX_LIMITS.maxCustomRules) {
    showStatus(`Maximum ${REGEX_LIMITS.maxCustomRules} custom rules.`);
    return;
  }

  settings.customRules.push({
    id: "rule-" + Date.now(),
    name,
    pattern,
    enabled: true
  });

  currentSettings = settings;
  chrome.storage.sync.set(settings, () => {
    document.getElementById("custom-rule-name").value = "";
    document.getElementById("custom-rule-pattern").value = "";
    renderCustomRules(settings.customRules);
    showStatus("Custom rule added.");
  });
}

function deleteCustomRule(ruleId) {
  const settings = collectSettingsFromForm();
  settings.customRules = (settings.customRules || []).filter((rule) => rule.id !== ruleId);
  currentSettings = settings;
  chrome.storage.sync.set(settings, () => {
    renderCustomRules(settings.customRules);
    showStatus("Rule deleted.");
  });
}

function exportSettings() {
  const settings = collectSettingsFromForm();
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "maskit-settings.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importSettings(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const settings = { ...MASKIT_DEFAULTS, ...imported };
      settings.customRules = (settings.customRules || [])
        .filter((rule) => rule && validateCustomRegexPattern(rule.pattern).ok)
        .slice(0, REGEX_LIMITS.maxCustomRules);
      currentSettings = settings;
      chrome.storage.sync.set(settings, () => {
        loadSettings();
        showStatus("Settings imported.");
      });
    } catch {
      showStatus("Invalid settings file.");
    }
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  document.body.addEventListener("change", (event) => {
    const target = event.target;

    if (target.matches("input[data-key], input[data-rule-id], #redact-format, #site-list-mode")) {
      if (target.id === "redact-format") {
        document.getElementById("custom-redact-wrap").style.display =
          target.value === "custom" ? "block" : "none";
      }
      if (target.dataset.key === "pauseAutoResume") {
        const wrap = document.getElementById("pause-secs-wrap");
        if (wrap) wrap.style.display = target.checked ? "flex" : "none";
      }
      saveSettings();
    }
  });

  document.getElementById("site-list").addEventListener("blur", saveSettings);
  document.getElementById("custom-redact-text").addEventListener("blur", saveSettings);
  document.getElementById("pause-auto-resume-secs").addEventListener("blur", saveSettings);
  document.getElementById("add-custom-rule").addEventListener("click", addCustomRule);

  document.getElementById("custom-rules-list").addEventListener("click", (event) => {
    const ruleId = event.target.dataset.deleteRule;
    if (ruleId) deleteCustomRule(ruleId);
  });

  document.getElementById("reset-stats").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_STATS" }, () => {
      loadStats();
      showStatus("Stats reset.");
    });
  });

  document.getElementById("export-settings").addEventListener("click", exportSettings);
  document.getElementById("import-settings").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importSettings(file);
    event.target.value = "";
  });

  // ── Shared Config (MCP Server) ────────────────────────────────────────

  document.getElementById("export-shared-config").addEventListener("click", () => {
    const settings = collectSettingsFromForm();
    const sharedConfig = Object.assign({}, settings, {
      version: "1.0",
      severity: {
        API_KEY: "critical",
        CARD: "critical",
        SSN: "critical",
        BANK_ACCOUNT: "critical",
        PASSPORT: "high",
        IP_ADDRESS: "high",
        EMAIL: "medium",
        PHONE: "medium",
        MPESA: "low",
        CUSTOM: "medium"
      },
      appOverrides: {
        "claude-desktop": { enabled: true, reviewBeforeRedact: true },
        "cursor": { enabled: true }
      }
    });
    const blob = new Blob([JSON.stringify(sharedConfig, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "maskit-config.json";
    link.click();
    URL.revokeObjectURL(url);
    showStatus("Shared config exported.");
  });

  document.getElementById("import-shared-config").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        const settings = Object.assign({}, MASKIT_DEFAULTS, imported);
        settings.customRules = (settings.customRules || [])
          .filter((rule) => rule && validateCustomRegexPattern(rule.pattern).ok)
          .slice(0, REGEX_LIMITS.maxCustomRules);
        currentSettings = settings;
        chrome.storage.sync.set(settings, () => {
          loadSettings();
          showStatus("Shared config imported.");
        });
      } catch {
        showStatus("Invalid shared config file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  });
});
