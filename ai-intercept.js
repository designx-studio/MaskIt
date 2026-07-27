/**
 * Maskit — Browser AI Interceptor
 * Intercepts text before it reaches browser AI features:
 * - Chrome Gemini sidebar
 * - Chrome "Help me write" / AI suggestions
 * - Edge Copilot
 * - Arc AI / Opera AI
 * - Context menu "Ask AI" actions
 * - Selection-based AI triggers
 *
 * This runs on ALL sites (not just ChatGPT/Gmail) to protect
 * any page where browser AI features may capture text.
 */

(function () {
    "use strict";

    // Only run if Maskit is available
    if (typeof detectSensitiveData === "undefined" || typeof sanitizeText === "undefined") return;

    let aiSettings = { ...MASKIT_DEFAULTS };
    let isEnabled = true;

    // ── Load settings ──────────────────────────────────────────────────────

    try {
        chrome.storage.local.get(MASKIT_DEFAULTS, (items) => {
            aiSettings = items;
            isEnabled = items.browserAIProtection !== false;
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "local") {
                chrome.storage.local.get(MASKIT_DEFAULTS, (items) => {
                    aiSettings = items;
                    isEnabled = items.browserAIProtection !== false;
                });
            }
        });
    } catch { }

    // ── Scan and redact helper ─────────────────────────────────────────────

    function scanAndRedact(text) {
        if (!text || !text.trim()) return null;
        const findings = detectSensitiveData(text, aiSettings);
        if (!findings.length) return null;
        return {
            original: text,
            redacted: sanitizeText(text, findings, aiSettings),
            findings: findings,
            riskScore: calculateRiskScore(findings, aiSettings)
        };
    }

    // ── Notification toast ─────────────────────────────────────────────────

    function showAIToast(message, count) {
        const old = document.getElementById("maskit-ai-toast");
        if (old) old.remove();

        const toast = document.createElement("div");
        toast.id = "maskit-ai-toast";
        toast.textContent = message;
        Object.assign(toast.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: count > 0 ? "#e55039" : "#00b894",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: "999px",
            zIndex: "2147483647",
            fontSize: "13px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: "600",
            boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
            opacity: "1",
            transition: "opacity 0.4s ease",
            pointerEvents: "none"
        });

        (document.body || document.documentElement).appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(() => toast.remove(), 400);
        }, 2500);
    }

    // ── Context menu interception ───────────────────────────────────────────

    // Intercept right-click "Ask AI" / "Summarize" / "Explain" actions
    // by scanning the selected text before Chrome/Arc/Edge processes it
    let lastSelectedText = "";

    function captureSelection() {
        const sel = window.getSelection();
        if (sel && sel.toString().trim()) {
            lastSelectedText = sel.toString();
        }
    }

    document.addEventListener("selectionchange", () => {
        captureSelection();
    }, true);

    // Intercept context menu by scanning selected text on right-click
    document.addEventListener("contextmenu", (event) => {
        if (!isEnabled) return;
        if (!lastSelectedText.trim()) return;

        const result = scanAndRedact(lastSelectedText);
        if (!result) return;

        // If sensitive data found, replace the selection with redacted text
        // before the browser's AI context menu can capture it
        try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(result.redacted));
                sel.removeAllRanges();
                showAIToast(`Maskit: redacted ${result.findings.length} item(s) before AI capture`, result.findings.length);
            }
        } catch { }
    }, true);

    // ── Chrome AI API interception ──────────────────────────────────────────

    // Intercept Chrome's built-in AI features (Chrome 128+)
    // These use window.ai API or chrome.ai API
    if (typeof window !== "undefined") {
        // Intercept window.ai.assistant (Chrome AI API)
        if (window.ai && window.ai.assistant) {
            const originalCreate = window.ai.assistant.create;
            if (originalCreate) {
                window.ai.assistant.create = function (options) {
                    // Wrap the prompt function to scan before sending
                    return originalCreate.call(this, options).then((assistant) => {
                        const originalPrompt = assistant.prompt;
                        assistant.prompt = async function (input) {
                            if (isEnabled && input && typeof input === "string") {
                                const result = scanAndRedact(input);
                                if (result) {
                                    showAIToast(`Maskit: redacted ${result.findings.length} item(s) before Chrome AI`, result.findings.length);
                                    return originalPrompt.call(this, result.redacted);
                                }
                            }
                            return originalPrompt.call(this, input);
                        };
                        return assistant;
                    });
                };
            }
        }
    }

    // ── AI sidebar detection (MutationObserver) ─────────────────────────────

    // Watch for AI sidebar/panel elements being injected into the page
    const AI_SELECTORS = [
        // Edge Copilot
        "[data-testid='copilot-sidebar']",
        "[class*='ai-sidebar']",
        "[class*='copilot']",
        "[class*='gemini-panel']",
        "[id*='copilot']",
        "[id*='ai-panel']",
        "[class*='ask-ai']",
        "[class*='ai-assistant']",
        // Edge sidebar
        "[class*='edge-sidebar']",
        "[id*='bing-sidebar']",
        "[id*='edge-copilot']",
        // Opera Aria
        "[class*='aria-chat']",
        "[id*='opera-ai']",
        "[class*='opera-ai']",
        // Arc AI
        "[class*='arc-ai']",
        "[id*='arc-ai']",
        // Firefox AI
        "[class*='firefox-ai']",
        "[id*='firefox-ai']",
        // Generic AI panel
        "[role='complementary'][aria-label*='AI']",
        "[role='complementary'][aria-label*='Copilot']",
        "[role='complementary'][aria-label*='Assistant']"
    ];

    function checkForAISidebar(mutations) {
        if (!isEnabled) return;

        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                for (const selector of AI_SELECTORS) {
                    if (node.matches && node.matches(selector)) {
                        // AI sidebar detected — scan any text inputs within it
                        const inputs = node.querySelectorAll("textarea, input[type='text'], [contenteditable='true']");
                        inputs.forEach((input) => {
                            const text = input.value || input.textContent || "";
                            const result = scanAndRedact(text);
                            if (result) {
                                if (input.value !== undefined) input.value = result.redacted;
                                else input.textContent = result.redacted;
                                showAIToast(`Maskit: secured text in AI panel`, result.findings.length);
                            }
                        });
                    }
                }
            }
        }
    }

    const aiObserver = new MutationObserver(checkForAISidebar);
    try {
        aiObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch { }

    // ── Form submission interception ────────────────────────────────────────

    // Scan text before any form is submitted to AI-related endpoints
    document.addEventListener("submit", (event) => {
        if (!isEnabled) return;

        const form = event.target;
        if (!form) return;

        // Check if form action targets an AI endpoint
        const action = (form.action || "").toLowerCase();
        const isAIForm = /ai|copilot|gemini|assistant|chat|completion|suggest/i.test(action);
        if (!isAIForm) return;

        const formData = new FormData(form);
        for (const [key, value] of formData.entries()) {
            if (typeof value === "string") {
                const result = scanAndRedact(value);
                if (result) {
                    // Replace in form data
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) input.value = result.redacted;
                    showAIToast(`Maskit: redacted ${result.findings.length} item(s) before AI submission`, result.findings.length);
                }
            }
        }
    }, true);

    // ── Beforeunload scan ───────────────────────────────────────────────────

    // Scan all visible text fields before page unload (catches AI interceptors)
    window.addEventListener("beforeunload", () => {
        if (!isEnabled) return;

        const fields = document.querySelectorAll("textarea, input[type='text'], [contenteditable='true']");
        fields.forEach((field) => {
            const text = field.value || field.textContent || "";
            const result = scanAndRedact(text);
            if (result) {
                if (field.value !== undefined) field.value = result.redacted;
                else field.textContent = result.redacted;
            }
        });
    }, true);

    // ── Keyboard shortcut interception ──────────────────────────────────────

    // Intercept Ctrl+Shift+AI or other AI shortcuts
    document.addEventListener("keydown", (event) => {
        if (!isEnabled) return;

        // Chrome AI shortcut: Ctrl+Shift+. (Chrome 128+)
        if (event.ctrlKey && event.shiftKey && event.key === ".") {
            const active = document.activeElement;
            if (active) {
                const text = active.value || active.textContent || "";
                const result = scanAndRedact(text);
                if (result) {
                    if (active.value !== undefined) active.value = result.redacted;
                    else active.textContent = result.redacted;
                    showAIToast(`Maskit: secured text before AI shortcut`, result.findings.length);
                }
            }
        }

        // Arc AI shortcut: Cmd+Shift+Space
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === "Space") {
            const sel = window.getSelection();
            if (sel && sel.toString().trim()) {
                const text = sel.toString();
                const result = scanAndRedact(text);
                if (result) {
                    try {
                        const range = sel.getRangeAt(0);
                        range.deleteContents();
                        range.insertNode(document.createTextNode(result.redacted));
                        sel.removeAllRanges();
                        showAIToast(`Maskit: redacted ${result.findings.length} item(s) before AI`, result.findings.length);
                    } catch { }
                }
            }
        }
    }, true);

    console.log("[Maskit] Browser AI interceptor active");
})();