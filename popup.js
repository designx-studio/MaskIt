let currentPopupSettings = { ...MASKIT_DEFAULTS };
let currentPaused = false;
let currentHostname = "";

// ── Traffic light helpers ─────────────────────────────────────────────────

function getTLState(enabled, siteAllowed, paused) {
  if (!enabled || !siteAllowed) return { color: "red",   label: "Stopped" };
  if (paused)                   return { color: "amber", label: "Paused"  };
  return                               { color: "green", label: "Active"  };
}

function updateTrafficLightUI() {
  const enabled     = currentPopupSettings.enabled !== false;
  const siteAllowed = isSiteAllowed(currentPopupSettings, currentHostname);
  const state = getTLState(enabled, siteAllowed, currentPaused);

  const dot      = document.getElementById("tl-dot");
  const label    = document.getElementById("tl-label");
  const pauseBtn = document.getElementById("pause-btn");

  dot.className   = "tl-dot " + state.color;
  label.textContent = state.label;

  const canPause = enabled && siteAllowed;
  pauseBtn.disabled    = !canPause;
  pauseBtn.textContent = currentPaused ? "▶ Resume" : "⏸ Pause";
}

// ── Badge ─────────────────────────────────────────────────────────────────

function updateBadge(enabled, siteAllowed) {
  const badge  = document.getElementById("status-badge");
  const active = enabled && siteAllowed;
  badge.textContent = active ? "Active" : "Off";
  badge.classList.toggle("off", !active);
}

function updateSiteStatus(hostname, settings) {
  const el      = document.getElementById("site-status");
  const allowed = isSiteAllowed(settings, hostname);

  if (!settings.enabled) {
    el.textContent = "Protection is disabled globally.";
    return;
  }
  if (!allowed) {
    el.textContent = `${hostname} is excluded.`;
    return;
  }
  el.textContent = `Protecting ${hostname}`;
}

// ── Exclude button state ──────────────────────────────────────────────────

function updateExcludeBtn() {
  const btn         = document.getElementById("exclude-btn");
  const siteAllowed = isSiteAllowed(currentPopupSettings, currentHostname);
  const mode        = currentPopupSettings.siteListMode || "all";

  // Already blocked via blocklist
  const alreadyExcluded = !siteAllowed && mode === "blocklist";
  // No hostname (e.g. settings page)
  const noHost = !currentHostname;

  btn.disabled     = alreadyExcluded || noHost;
  btn.textContent  = alreadyExcluded ? "✓ Page already excluded" : "✕ Exclude this page";
}

// ── Full render ───────────────────────────────────────────────────────────

function renderAll() {
  const enabled     = currentPopupSettings.enabled !== false;
  const siteAllowed = isSiteAllowed(currentPopupSettings, currentHostname);

  document.getElementById("enabled-toggle").checked = enabled;
  updateBadge(enabled, siteAllowed);
  updateSiteStatus(currentHostname, currentPopupSettings);
  updateTrafficLightUI();
  updateExcludeBtn();
}

// ── Popup load ────────────────────────────────────────────────────────────

function loadPopup() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    currentHostname = tab?.url ? (() => {
      try { return new URL(tab.url).hostname; } catch { return ""; }
    })() : "";

    // Load settings + pause state in parallel
    chrome.storage.sync.get(MASKIT_DEFAULTS, (items) => {
      currentPopupSettings = items;

      chrome.runtime.sendMessage({ type: "GET_PAUSE_STATE" }, (response) => {
        currentPaused = !!(response && response.paused);
        renderAll();

        // ── Protection toggle ──────────────────────────────────────────
        document.getElementById("enabled-toggle").addEventListener("change", (e) => {
          currentPopupSettings.enabled = e.target.checked;
          chrome.storage.sync.set({ enabled: currentPopupSettings.enabled }, renderAll);
        });

        // ── Pause button ───────────────────────────────────────────────
        document.getElementById("pause-btn").addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "TOGGLE_PAUSE" }, (res) => {
            currentPaused = !!(res && res.paused);
            updateTrafficLightUI();
          });
        });

        // ── Exclude button ─────────────────────────────────────────────
        document.getElementById("exclude-btn").addEventListener("click", () => {
          if (!currentHostname) return;
          chrome.runtime.sendMessage({ type: "ADD_TO_BLOCKLIST", hostname: currentHostname }, () => {
            // Update local settings mirror to reflect new blocklist
            if (!currentPopupSettings.siteList) currentPopupSettings.siteList = [];
            if (!currentPopupSettings.siteList.includes(currentHostname)) {
              currentPopupSettings.siteList.push(currentHostname);
            }
            currentPopupSettings.siteListMode = "blocklist";
            renderAll();
          });
        });
      });
    });

    // Stats (independent of pause state)
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
      const stats = response?.stats || MASKIT_STATS_DEFAULTS;
      document.getElementById("stat-total").textContent  = stats.totalRedactions     || 0;
      document.getElementById("stat-paste").textContent  = stats.bySource?.paste     || 0;
      document.getElementById("stat-copy").textContent   = stats.bySource?.copy      || 0;
      document.getElementById("stat-typing").textContent = stats.bySource?.typing    || 0;
    });
  });
}

document.addEventListener("DOMContentLoaded", loadPopup);
