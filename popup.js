let currentPopupSettings = { ...MASKIT_DEFAULTS };
let currentPaused = false;
let currentHostname = "";

function getTLState(enabled, siteAllowed, paused) {
  if (!enabled || !siteAllowed) return { color: "red", label: "Stopped" };
  if (paused) return { color: "amber", label: "Paused" };
  return { color: "green", label: "Active" };
}

function updateTrafficLightUI() {
  const enabled = currentPopupSettings.enabled !== false;
  const siteAllowed = isSiteAllowed(currentPopupSettings, currentHostname);
  const state = getTLState(enabled, siteAllowed, currentPaused);
  const dot = document.getElementById("tl-dot");
  const label = document.getElementById("tl-label");
  const pauseBtn = document.getElementById("pause-btn");
  if (dot) dot.className = "tl-dot " + state.color;
  if (label) label.textContent = state.label;
  if (pauseBtn) {
    pauseBtn.disabled = !(enabled && siteAllowed);
    pauseBtn.textContent = currentPaused ? "▶ Resume" : "⏸ Pause";
  }
}

function updateBadge(enabled, siteAllowed) {
  const badge = document.getElementById("status-badge");
  if (!badge) return;
  const active = enabled && siteAllowed;
  badge.textContent = active ? "Active" : "Off";
  badge.classList.toggle("off", !active);
}

function updateSiteStatus(hostname, settings) {
  const el = document.getElementById("site-status");
  if (!el) return;
  const allowed = isSiteAllowed(settings, hostname);
  if (!hostname) { el.textContent = "This page cannot be protected."; return; }
  if (settings.enabled === false) { el.textContent = "Protection is disabled globally."; return; }
  if (!allowed) { el.textContent = `${hostname} is excluded.`; return; }
  el.textContent = `Protecting ${hostname}`;
}

function updateExcludeBtn() {
  const btn = document.getElementById("exclude-btn");
  if (!btn) return;
  const siteAllowed = isSiteAllowed(currentPopupSettings, currentHostname);
  const alreadyExcluded = !siteAllowed && (currentPopupSettings.siteListMode || "all") === "blocklist";
  btn.disabled = alreadyExcluded || !currentHostname;
  btn.textContent = alreadyExcluded ? "✓ Page already excluded" : "✕ Exclude page";
}

function renderAll() {
  const enabled = currentPopupSettings.enabled !== false;
  const siteAllowed = isSiteAllowed(currentPopupSettings, currentHostname);
  const track = document.getElementById("toggle-track");
  const label = document.getElementById("toggle-label");
  const sub = document.getElementById("toggle-sub");
  if (track) track.classList.toggle("off", !enabled);
  if (label) { label.classList.toggle("off", !enabled); label.textContent = enabled ? "ON" : "OFF"; }
  if (sub) sub.textContent = enabled && siteAllowed ? `Protecting ${currentHostname || "supported pages"}` : "Protection disabled or excluded";
  updateBadge(enabled, siteAllowed);
  updateSiteStatus(currentHostname, currentPopupSettings);
  updateTrafficLightUI();
  updateExcludeBtn();
}

function bindToggle() {
  const toggle = document.getElementById("toggle-wrap");
  if (!toggle || toggle.dataset.bound) return;
  const flip = () => { currentPopupSettings.enabled = !currentPopupSettings.enabled; chrome.storage.local.set({ enabled: currentPopupSettings.enabled }, renderAll); };
  toggle.addEventListener("click", flip);
  toggle.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flip(); } });
  toggle.dataset.bound = "true";
  document.getElementById("pause-btn")?.addEventListener("click", () => chrome.runtime.sendMessage({ type: "TOGGLE_PAUSE" }, (res) => { currentPaused = !!(res && res.paused); updateTrafficLightUI(); }));
  document.getElementById("exclude-btn")?.addEventListener("click", () => { if (!currentHostname) return; chrome.runtime.sendMessage({ type: "ADD_TO_BLOCKLIST", hostname: currentHostname }, () => { currentPopupSettings.siteList = [...(currentPopupSettings.siteList || []), currentHostname]; currentPopupSettings.siteListMode = "blocklist"; renderAll(); }); });
}

function loadPopup() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    currentHostname = tab?.url ? (() => { try { return new URL(tab.url).hostname; } catch { return ""; } })() : "";
    chrome.storage.local.get(MASKIT_DEFAULTS, (items) => {
      currentPopupSettings = items;
      chrome.runtime.sendMessage({ type: "GET_PAUSE_STATE" }, (response) => { currentPaused = !!(response && response.paused); renderAll(); bindToggle(); });
    });
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
      const stats = response?.stats || MASKIT_STATS_DEFAULTS;
      for (const [id, value] of [["stat-total", stats.totalRedactions], ["stat-paste", stats.bySource?.paste], ["stat-copy", stats.bySource?.copy], ["stat-typing", stats.bySource?.typing]]) { const node = document.getElementById(id); if (node) node.textContent = value || 0; }
    });
  });
}

document.addEventListener("DOMContentLoaded", loadPopup);
