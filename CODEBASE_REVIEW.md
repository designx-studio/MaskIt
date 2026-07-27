# Maskit Codebase Review

**Version reviewed:** v2.4.0 (commit `809dd9d`)
**Date:** 2026-07-26
**Reviewer:** Senior Software Architect & Security Engineer
**Scope:** Full codebase — browser extension, MCP server, Windows agent, shared engine, maskit-core, build/CI, tests, documentation

---

## 1. Executive Summary

### What the project does

Maskit is a **local-first AI privacy layer** that detects and redacts sensitive data (PII, credentials, financial data) before it reaches AI chat applications. It operates across three surfaces:

1. **Browser Extension** (Manifest V3) — intercepts paste/copy/typing events on ChatGPT, Gmail, Gemini, Copilot, Claude, Perplexity, HuggingFace, and Bing. Replaces sensitive text with redaction tokens (`[EMAIL_REDACTED]`, `***`, or custom). Includes a Shadow DOM traffic-light widget, pause/resume, site allowlist/blocklist, review-before-redact dialog, and structured audit logging.

2. **MCP Server** (stdio JSON-RPC) — exposes 6 tools (`scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`) to Claude Desktop, Cursor, and MCP-capable IDEs. Includes an HTTP server (`http-server.js`) for REST API access and website hosting.

3. **Windows Agent** (C#/.NET) — system-wide clipboard monitoring via Win32 P/Invoke, foreground app detection, tray icon with green/amber/red status, and JSONL audit logging. Targets ChatGPT Desktop, Claude Desktop, Copilot, Ollama, LM Studio, VS Code, Cursor, Windsurf, and Office apps.

A shared `maskit-core/` directory contains language-independent JSON rule files (`pii.json`, `secrets.json`, `financial.json`), policy files (`defaults.json`, `contexts.json`), and an audit event schema (`event.json`). The `engine/` directory contains a Node.js implementation of the detection engine consumed by both the browser extension (via `test.js` integration tests) and the MCP server.

### Maturity level

**Late alpha / early beta.** The core detection logic is functional and tested. The architecture shows thoughtful design (shared engine, JSON rules, policy contexts, audit schema). However, the codebase has significant duplication (three parallel implementations of the same detection logic), no authentication on the HTTP API, incomplete SaaS infrastructure, and the Windows agent is an MVP with polling-based clipboard monitoring. The documentation is extensive but aspirational — many features described in `BUILD-ROADMAP.md` and `PRD.md` are planned, not implemented.

### Strongest architectural decisions

1. **Local-first, zero-network privacy stance** — All processing happens client-side. The extension makes no network requests. This is the correct architecture for a privacy product and a strong differentiator.

2. **Shared `maskit-core/` rules as JSON** — Detection rules are language-independent JSON files consumed by the JS engine and the C# agent. This enables cross-platform consistency and non-developer rule authoring.

3. **Policy engine with context-aware overrides** — `maskit-core/policy/contexts.json` defines per-app policies (e.g., `chatgpt.com` blocks SSN, `local-ai` allows emails). The `selectPolicy()` function in `engine/settings.js` cascades: app-specific → domain-specific → default. This is a solid foundation for enterprise policy management.

4. **Structured audit event schema** — `maskit-core/audit-schema/event.json` and `createAuditEvent()` in `engine/settings.js` define a consistent event structure (id, timestamp, type, severity, source, app, action, riskScore, matchedRule, policyApplied, unmaskToken). This enables compliance reporting and forensic analysis.

5. **Regex DoS protection** — `isRegexSafe()` in `settings.js` rejects catastrophic backtracking patterns (`(a+)+`, `a{1,}`, `(.*)+`). `limitScanText()` caps scan input at 50,000 characters. `validateCustomRegexPattern()` enforces a 120-character limit and 15-rule maximum. This is security-conscious engineering.

6. **Shadow DOM for UI isolation** — The traffic-light widget in `content.js` uses `attachShadow({ mode: "open" })` with scoped CSS, preventing style leakage from host pages.

7. **Narrow host permissions** — `manifest.json` requests permissions only for specific AI sites, not `<all_urls>` for content scripts on supported sites (though a second content script matches `<all_urls>` for `ai-intercept.js` with `exclude_matches`).

### Biggest risks

1. **Triple implementation drift** — Detection logic exists in `detector.js` (browser, 172 lines), `engine/detector.js` (Node, 491 lines), and `maskit-agent/.../RuleEngine.cs` (C#, 213 lines). The browser `detector.js` has 12 API key patterns; the engine has 30+. The browser version lacks severity metadata on findings. These will diverge further.

2. **No authentication on HTTP API** — `mcp-server/http-server.js` listens on `127.0.0.1:8765` with zero auth, CORS, or rate limiting. Any local process can scan/redact text and read config paths. In a multi-user or enterprise context, this is a critical exposure.

3. **Sensitive data in audit logs** — `createAuditEvent()` stores `unmaskToken: hashSensitive(value)` using a non-cryptographic FNV-1a hash with a hardcoded salt `"maskit"`. The `unmaskStore` in `background.js` holds raw values in memory for 30 seconds. The audit log in `chrome.storage.local` retains events for 30 days. This creates a persistent store of sensitive data references.

4. **No dependency pinning or lockfile for MCP server** — `mcp-server/package.json` declares `"@modelcontextprotocol/sdk": "^1.0.0"` with no `package-lock.json` committed. The root `package-lock.json` is empty (no dependencies). `npm ci` in CI will fail or produce non-reproducible builds.

5. **`<all_urls>` content script** — The second content script in `manifest.json` matches `<all_urls>` for `ai-intercept.js`. While `exclude_matches` filters out supported sites, this is a broad permission that may trigger CWS review friction and user privacy concerns.

---

## 2. Architecture Review

### Overall architecture and component relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     maskit-core/ (JSON rules)                    │
│  rules/pii.json  rules/secrets.json  rules/financial.json        │
│  policy/defaults.json  policy/contexts.json                      │
│  audit-schema/event.json                                         │
└──────────────┬──────────────────────┬──────────────────┬────────┘
               │                      │                  │
    ┌──────────▼─────────┐  ┌────────▼────────┐  ┌──────▼──────────┐
    │  engine/ (Node.js)  │  │ Browser Ext     │  │ maskit-agent (C#)│
    │  detector.js        │  │ detector.js     │  │ RuleEngine.cs   │
    │  settings.js        │  │ settings.js     │  │ PolicyEngine.cs │
    │  index.js (barrel)  │  │ sanitizer.js    │  │ ClipboardMonitor │
    └──────────┬──────────┘  │ content.js      │  │ ForegroundDet.  │
               │             │ background.js   │  │ AuditLogger.cs  │
    ┌──────────▼─────────┐  │ ai-intercept.js │  │ TrayApp.cs      │
    │  mcp-server/        │  │ popup.js/html   │  └─────────────────┘
    │  server.js (stdio)  │  │ options.js/html │
    │  http-server.js     │  │ editors.js      │
    │  config.js          │  └─────────────────┘
    │  integrations/      │
    └─────────────────────┘
```

The architecture has a clear **shared-core, multi-surface** design. `maskit-core/` provides the source of truth for rules and policies. `engine/` provides a Node.js reference implementation. The browser extension and Windows agent are surface-specific adapters.

**Problem:** The browser extension does NOT consume `engine/` at runtime. It has its own `detector.js`, `settings.js`, and `sanitizer.js` loaded as content scripts. The `engine/` module is only used by the MCP server and in integration tests (`test.js` lines 238-258). This means the "shared engine" is shared in name only for the browser surface.

### Separation of concerns

**Good:**
- `background.js` handles state management, audit log persistence, and badge updates — separate from content script DOM interception.
- `content.js` focuses on event interception and UI; `detector.js` focuses on pattern matching; `sanitizer.js` focuses on text replacement.
- `mcp-server/config.js` cleanly separates config file I/O from server logic.
- C# agent follows a clean service pattern: `RuleEngine` (detection), `PolicyEngine` (decisions), `ClipboardMonitor` (interception), `ForegroundDetector` (context), `AuditLogger` (logging), `TrayApplication` (UI).

**Poor:**
- `content.js` is 1,192 lines and handles: event interception, UI rendering (toast, review dialog, killswitch modal, traffic light, unmask banner), audit event generation, and redaction logic. This is a God Object.
- `background.js` mixes legacy stats, audit log, unmask store, badge management, pause state, config import/export, and context menu handling in 403 lines.
- `mcp-server/server.js` defines tool schemas, handlers, killswitch logic, and server bootstrap in one 433-line file.

### Modularity and extensibility

**Strengths:**
- Adding a new detection type requires only a new entry in `maskit-core/rules/*.json` and a validator function. The C# `RuleEngine.LoadRules()` and JS `detectSensitiveData()` both iterate rule files dynamically.
- Adding a new platform context requires only a new entry in `maskit-core/policy/contexts.json`.
- The `mcp-server/integrations/` directory shows extensibility: `github-action.js`, `express-middleware.js`, `discord-bot.js`, `slack-bot.js` demonstrate how to embed Maskit into other platforms.

**Weaknesses:**
- The browser extension's detection patterns are hardcoded in `detector.js` (lines 1-26) and do NOT load from `maskit-core/rules/*.json`. Adding a new rule to the browser requires editing JS source code, while adding one to the MCP server requires editing JSON. This is inconsistent.
- Custom rules are limited to 15 (`REGEX_LIMITS.maxCustomRules`) with 120-char patterns. Enterprise users will need more.
- No plugin/hook system for custom validators beyond the hardcoded switch in `validateFinding()`.

### Scalability for future growth

The current architecture can support moderate scaling (hundreds of users) but has structural limitations:

- **No central backend** — All state is local (`chrome.storage.local`, `chrome.storage.sync`, `%APPDATA%/Maskit/config.json`). There is no way to sync policies, rules, or audit logs across devices or users.
- **No multi-tenancy** — The config model is single-user (`getSettingsForApp()` returns one config). There is no concept of organizations, teams, or roles beyond the stub `getUserIdentity()` returning `null`.
- **The MCP server is stateless per-invocation** — `config.readConfig()` reads from disk on every tool call. This is fine for low volume but will become I/O-bound under load.

### Support for new platforms/integrations

The architecture is **moderately extensible** for new platforms:

- **New browser AI sites:** Add to `manifest.json` `host_permissions` and `content_scripts.matches`. The `ai-intercept.js` script already runs on `<all_urls>`.
- **New MCP clients:** The stdio server works with any MCP client. The `claude-desktop.json` config is a template.
- **New IDE integrations:** The HTTP API (`/scan`, `/redact`, `/policy`) can be called from any language. The `express-middleware.js` integration shows the pattern.
- **New desktop apps:** The C# agent's `ForegroundDetector.AiProcesses` dictionary can be extended. However, it's Windows-only — there is no macOS or Linux agent.

**The blocker:** Each new platform requires a new implementation of the detection engine because the logic is not truly shared. A Rust/Go/WASM core that all surfaces consume would solve this.

---

## 3. Code Quality Review

### Code organization

The repository uses a flat structure for browser extension files (`detector.js`, `sanitizer.js`, `content.js`, etc. at root) and subdirectories for other components (`engine/`, `mcp-server/`, `maskit-agent/`, `maskit-core/`). This is acceptable for a small project but creates confusion:

- `detector.js` (root, browser) vs `engine/detector.js` (Node) — same name, different content, no clear naming convention to distinguish them.
- `settings.js` (root, browser) vs `engine/settings.js` (Node) — same issue.
- `test.js` (root) tests browser scripts; `engine/test.js` tests the engine; `mcp-server/test.js` tests the MCP server. The root `package.json` runs all three.

### Naming conventions

**Good:**
- Constants are `UPPER_SNAKE_CASE` (`MASKIT_DEFAULTS`, `REGEX_LIMITS`, `API_KEY_PATTERNS`).
- Functions are `camelCase` (`detectSensitiveData`, `sanitizeText`, `getRedactionText`).
- C# follows standard PascalCase conventions (`RuleEngine`, `ClipboardMonitor`).

**Inconsistent:**
- `content.js` uses `_maskitInit()` with a leading underscore (private convention) but defines many non-prefixed globals (`loadSettings`, `handlePaste`).
- The `MASKIT_SUPPORTED_SITES` constant in `settings.js` lists only 3 sites, but `manifest.json` lists 16. The constant is stale.
- `maskit-core/rules/pii.json` uses `"validator": "none"` for EMAIL and PHONE, but `detector.js` has no `none` case in `validateFinding()` — it falls through to `default: return true`. This works but is unclear.

### Maintainability

**Concerns:**
- The browser extension's `content.js` at 1,192 lines is the single hardest file to maintain. It mixes DOM manipulation, event handling, UI rendering, and business logic.
- The `background.js` message handler is a single `if/else` chain of 15+ message types (lines 219-368). A switch statement or handler map would be more maintainable.
- Inline styles in `content.js` (e.g., the traffic light widget CSS at lines 762-880) are 120+ lines of template string. Extracting to a CSS file would improve readability.
- The C# `ClipboardMonitor.cs` has dead code: P/Invoke declarations at lines 27-61 that are never used (the class uses `NativeMethods` instead, defined at lines 306-334). The `_wndProcDelegate` and `_wndProcHandle` fields are allocated but never used for window messages.

### Duplication

This is the **most significant code quality issue**:

| Logic | Browser (`detector.js`) | Engine (`engine/detector.js`) | C# (`RuleEngine.cs`) |
|-------|--------------------------|-------------------------------|----------------------|
| Patterns | 9 types, 12 API key patterns | 9 types, 30+ API key patterns | Loaded from JSON |
| `luhnCheck()` | 23 lines | 23 lines (identical) | 18 lines (identical logic) |
| `validateFinding()` | 45 lines | 45 lines (identical) | 12 lines (switch, same logic) |
| `compileCustomRule()` | 9 lines | 9 lines (identical) | N/A |
| `dedupeFindings()` | 9 lines | 9 lines (identical) | 5 lines (HashSet) |
| `detectSensitiveData()` | 50 lines | 68 lines (adds severity) | 30 lines (similar) |

The browser `detector.js` and `engine/detector.js` are ~90% identical but the engine has more API key patterns and severity metadata. The C# `RuleEngine` reimplements the same validators. **Three copies of security-critical logic will diverge, causing inconsistent detection across surfaces.**

### Complexity

- `content.js` `handleBeforeInput()` (lines 630-691) has 7 early returns and branches on `inputType`, `isRichEditor`, and `proposed === null`. This is cyclomatic complexity ~10 — manageable but at the edge.
- `mcp-server/server.js` `checkKillswitch()` (lines 128-171) parses time strings, handles overnight schedules, and has 4 return paths. The logic is duplicated in `content.js` `checkKillswitch()` (lines 43-85) and `engine/settings.js` `isAIToolsAllowed()` (lines 209-257). Three copies.
- The C# `PolicyEngine.ClassifyApp()` (lines 128-142) hardcodes process names. Adding a new app requires recompiling.

### Error handling

**Good:**
- `content.js` wraps initialization in `try { _maskitInit(); } catch (err)` (line 2) — the extension never breaks the host page.
- `background.js` wraps all `chrome.storage` calls in try/catch with fallbacks.
- `mcp-server/server.js` wraps the tool dispatch in try/catch and returns `isError: true` on failure.
- C# `AuditLogger` catches exceptions and writes to stderr rather than crashing.

**Poor:**
- `mcp-server/http-server.js` `parseBody()` (lines 42-55) accumulates the entire request body in a string with no size limit. A malicious client could send a multi-GB body and exhaust memory.
- `mcp-server/config.js` `readConfig()` catches errors and silently returns defaults — a corrupt config file is invisible to the user.
- C# `Config.Load()` catches exceptions and writes to stderr, but the application continues with default paths that may not exist.

### Logging

- Browser extension: No structured logging. `console.error` in catch blocks. Audit events are the closest thing to a log.
- MCP server: `console.error("Maskit MCP server running on stdio")` — one startup message. No request logging.
- C# agent: `Console.Error.WriteLine` for errors. `AuditLogger` writes JSONL to `%APPDATA%/Maskit/audit.jsonl` with 10MB rotation.
- No log levels, no structured logging framework, no correlation IDs.

### Configuration management

- **Browser:** `chrome.storage.sync` for settings (synced across devices), `chrome.storage.session` for pause state (cleared on restart), `chrome.storage.local` for audit log and stats.
- **MCP server:** JSON file at OS-specific path (`%APPDATA%/Maskit/config.json` on Windows, `~/Library/Application Support/Maskit/config.json` on macOS, `~/.config/maskit/config.json` on Linux). `config.js` handles read/write with defaults.
- **C# agent:** Same JSON path pattern. `Config.Load()` creates defaults if missing.

**Issue:** The browser extension settings schema (`MASKIT_DEFAULTS` in root `settings.js`) differs from the engine schema (`MASKIT_DEFAULTS` in `engine/settings.js`): browser has `scanCopy: true`, `reviewBeforeRedact: false`, `redactFormat: "tagged"`; engine has `scanCopy: false`, `reviewBeforeRedact: true`, `redactFormat: "stars"`. These defaults diverge silently.

### Documentation quality

**Extensive but aspirational:**
- `README.md` (comprehensive), `PRD.md`, `PLAN.md`, `FEATURES.md`, `SECURITY.md`, `BUILD-ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CWS-LISTING.md`, `CWS-SUBMISSION-CHECKLIST.md`, `RELEASE.md`.
- `build-docs/` has 9 detailed guides (build pipeline, code quality, testing, security, distribution, legal, monitoring, CWS prep, release).
- `maskit-core/README.md`, `mcp-server/README.md`, `maskit-agent/README.md` document each component.

**Issue:** The documentation describes features that don't exist yet. `BUILD-ROADMAP.md` and `PRD.md` describe SaaS features, billing, and enterprise controls that are not implemented. The `README.md` claims "9 data types" but the browser `detector.js` only has 9 patterns while the engine has 30+ API key patterns. The version in `package.json` (2.3.0) doesn't match `manifest.json` (2.4.0).

### Good practices already present

1. **Top-level error boundary** in `content.js` — `try { _maskitInit(); } catch`.
2. **Regex DoS protection** — `isRegexSafe()`, `limitScanText()`, `validateCustomRegexPattern()`.
3. **Luhn checksum validation** for credit cards — prevents false positives.
4. **Shadow DOM isolation** for the traffic-light widget.
5. **CSP in manifest** — `script-src 'self'; object-src 'self'`.
6. **ESLint rules** — `no-eval`, `no-implied-eval`, `no-new-func`, `eqeqeq: always`.
7. **Audit log retention** — 30-day default with pruning on every write.
8. **Single-instance mutex** in C# agent — prevents multiple instances.
9. **Cross-browser support** — `browser_specific_settings.gecko` in manifest.
10. **`escapeHtml()`** utility for safe DOM insertion.

### Technical debt

1. **Triple implementation of detection logic** — browser, engine, C#.
2. **`content.js` God Object** — 1,192 lines mixing concerns.
3. **`background.js` message handler** — if/else chain instead of handler map.
4. **Dead code in C#** — unused P/Invoke declarations and window-message infrastructure in `ClipboardMonitor.cs`.
5. **Stale constants** — `MASKIT_SUPPORTED_SITES` lists 3 sites, manifest lists 16.
6. **Version mismatch** — `package.json` says 2.3.0, `manifest.json` says 2.4.0.
7. **No lockfile for MCP server** — `mcp-server/package-lock.json` is not committed.
8. **Inline CSS** — 120+ lines of template-string CSS in `content.js`.
9. **`vm.runInThisContext` in tests** — `test.js` uses `vm.runInThisContext` to load browser scripts, which pollutes the global scope and doesn't simulate the browser environment correctly.
10. **`document.execCommand("insertText")`** — deprecated API used in `content.js` for contenteditable insertion. May break in future browser versions.

### Areas needing refactoring

1. **Unify detection logic** — Extract a single source of truth (WASM or shared JSON-loaded rules) consumed by all surfaces.
2. **Split `content.js`** — Separate modules: `interceptor.js`, `ui/widget.js`, `ui/review-dialog.js`, `ui/toast.js`, `audit.js`.
3. **Replace if/else message handler** — Use a handler map in `background.js`.
4. **Extract inline CSS** — Move to `content.css` loaded via `manifest.json`.
5. **Remove dead C# code** — Clean up `ClipboardMonitor.cs` P/Invoke declarations.
6. **Add request body size limit** — `http-server.js` `parseBody()` needs a max body size check.

---

## 4. Security Review

### 4.1 Sensitive data stored in audit logs

**Severity: High**
**Location:** `engine/settings.js` `createAuditEvent()` (lines 98-114), `background.js` `recordAuditEvent()` (lines 89-99), `background.js` `unmaskStore` (lines 115-137)

**Explanation:**
`createAuditEvent()` stores `unmaskToken: hashSensitive(value)` — a non-cryptographic FNV-1a hash with hardcoded salt `"maskit"`. The `unmaskStore` object in `background.js` holds raw sensitive values in memory keyed by token for 30 seconds. The audit log in `chrome.storage.local` retains events for 30 days. While raw values are not persisted to disk, the hash is reversible via brute force for short values (phone numbers, SSNs) because FNV-1a is not a password hash. An attacker with access to `chrome.storage.local` can extract the audit log and attempt rainbow-table attacks on the tokens.

**Recommended fix:**
- Use `crypto.subtle.digest('SHA-256', value + per-installation-salt)` instead of FNV-1a.
- Generate a random salt on first install and store it in `chrome.storage.local`.
- Consider not storing `unmaskToken` at all unless unmasking is explicitly requested.
- Add a setting to disable audit logging entirely for high-security environments.

### 4.2 No authentication on HTTP API

**Severity: Critical**
**Location:** `mcp-server/http-server.js` (lines 75-181)

**Explanation:**
The HTTP server listens on `127.0.0.1:8765` with no authentication, no CORS headers, no rate limiting, and no request size limit. Any process on the machine can:
- `POST /scan` with arbitrary text and receive detection results (information about what sensitive data exists in the text).
- `POST /redact` and receive redacted text.
- `GET /status` and receive the config file path.
- `GET /rules` and receive all active detection rules.

While binding to `127.0.0.1` limits exposure to the local machine, any malicious website can make fetch requests to `http://127.0.0.1:8765/scan` from the browser (DNS rebinding attacks bypass `127.0.0.1` restrictions). The `parseBody()` function has no body size limit, enabling memory exhaustion DoS.

**Recommended fix:**
- Add a shared-secret token (generated on first start, stored in config) required as `Authorization: Bearer <token>` header.
- Add CORS headers restricting origins to `null` (no cross-origin requests).
- Add a body size limit (e.g., 1MB) in `parseBody()`.
- Add rate limiting (e.g., 100 requests/minute).
- Consider adding `Content-Security-Policy` headers to the website.

### 4.3 `<all_urls>` content script permission

**Severity: Medium**
**Location:** `manifest.json` (lines 108-138)

**Explanation:**
The second content script matches `<all_urls>` to load `ai-intercept.js` on all sites except supported AI sites. While `exclude_matches` filters out the 16 supported sites, this still means the extension injects `settings.js`, `detector.js`, `sanitizer.js`, and `ai-intercept.js` into every website the user visits. This is a broad permission that:
- May trigger Chrome Web Store review delays.
- Increases attack surface (if any of these scripts have vulnerabilities, they're exposed on every site).
- May concern privacy-conscious users.

**Recommended fix:**
- Remove the `<all_urls>` content script. Instead, use `chrome.action.onClicked` to inject the script on demand, or use a more targeted match pattern for known AI sites.
- If broad interception is required, document clearly why in the CWS listing and privacy policy.

### 4.4 Non-cryptographic hash for sensitive data

**Severity: High**
**Location:** `engine/settings.js` `hashSensitive()` (lines 121-137)

**Explanation:**
```js
function hashSensitive(value, salt) {
    const s = salt || "maskit";
    // Simple FNV-1a hash for browser/Node compatibility (no crypto dependency)
    let hash = 0x811c9dc5;
    ...
}
```
FNV-1a is a non-cryptographic hash designed for hash tables, not security. The salt is hardcoded to `"maskit"`. For short values like SSNs (`123-45-6789`), phone numbers, or credit card numbers, an attacker can brute-force the hash in milliseconds. The comment acknowledges "no crypto dependency" but `crypto.subtle` is available in both browser and Node.js.

**Recommended fix:**
- Use `crypto.subtle.digest('SHA-256', ...)` in the browser.
- Use `crypto.createHash('sha256')` in Node.js.
- Generate a random per-installation salt stored in `chrome.storage.local`.

### 4.5 `innerHTML` usage with user-influenced content

**Severity: Medium**
**Location:** `content.js` `showKillswitchModal()` (line 99), `showReviewDialog()` (line 359)

**Explanation:**
```js
content.innerHTML = '<h2>... ' + (message || "AI tools restricted") + '</h2>' + ...
```
The `message` parameter comes from `currentSettings.killswitch.message`, which is user-configurable. If a user imports a malicious config (via `IMPORT_CONFIG` message handler in `background.js` line 296), the message could contain HTML that executes in the page context. While the extension CSP (`script-src 'self'`) prevents inline script execution, HTML injection can still exfiltrate data via image URLs or form actions.

Similarly, `showReviewDialog()` uses `card.innerHTML` with `findingsText` derived from `f.type` — though `type` values are controlled (`EMAIL`, `API_KEY`, etc.), custom rule names (`CUSTOM:<user-provided name>`) could contain HTML.

**Recommended fix:**
- Use `textContent` for all user-influenced strings.
- Use `document.createElement` + `textContent` instead of `innerHTML`.
- Sanitize custom rule names in `compileCustomRule()` / `validateCustomRegexPattern()`.

### 4.6 Config import lacks validation

**Severity: Medium**
**Location:** `background.js` `IMPORT_CONFIG` handler (lines 296-306)

**Explanation:**
```js
if (message.config && message.config.settings) {
    chrome.storage.sync.set(message.config.settings, () => { ... });
}
```
The import handler accepts any object with a `settings` property and writes it directly to `chrome.storage.sync` with no validation. A malicious config file could set `killswitch.enabled: true` with an indefinite duration, effectively disabling the extension. It could also set `siteListMode: "allowlist"` with an empty list, disabling protection on all sites.

**Recommended fix:**
- Validate the imported settings against `MASKIT_DEFAULTS` schema.
- Only allow known keys.
- Sanitize `customRules` through `validateCustomRegexPattern()`.
- Prompt the user for confirmation before overwriting.

### 4.7 MCP server `update_rules` writes config without validation

**Severity: Medium**
**Location:** `mcp-server/server.js` `handleUpdateRules()` (lines 289-307)

**Explanation:**
```js
const updated = engine.updateRules(args.customRules, settings);
const writeResult = config.writeConfig(Object.assign({}, settings, {
    customRules: updated.customRules
}));
```
While `engine.updateRules()` does call `validateCustomRegexPattern()` on each rule, the MCP server has no authentication. Any MCP client (including a compromised AI assistant) can replace all custom rules, potentially removing detection for specific patterns. The `update_rules` tool replaces ALL custom rules — there is no append/delete API.

**Recommended fix:**
- Add authentication to the MCP server (or document that it's local-only).
- Log all rule updates to the audit log.
- Consider requiring a confirmation step for rule changes.

### 4.8 Clipboard monitoring race condition

**Severity: Low**
**Location:** `maskit-agent/.../ClipboardMonitor.cs` `CheckClipboard()` (lines 121-152)

**Explanation:**
The clipboard monitor polls every 500ms. Between detecting sensitive data and replacing it (`SetClipboardText()`), there is a window where the original sensitive data is still in the clipboard. If the user pastes during this window (e.g., via keyboard shortcut faster than 500ms), the unredacted data is pasted. Additionally, `OpenClipboard()` can fail if another application has the clipboard open, silently skipping the check.

**Recommended fix:**
- Use `AddClipboardFormatListener` (event-based) instead of polling.
- The infrastructure for this is already present (dead code at lines 27-65) but unused.
- Fall back to polling only if event-based monitoring fails.

### 4.9 No input validation on MCP tool arguments

**Severity: Low**
**Location:** `mcp-server/server.js` tool handlers (lines 173-365)

**Explanation:**
Tool handlers access `args.text`, `args.app`, `args.format` without validating type or length. While the MCP SDK validates against the JSON Schema, a direct HTTP caller (via `http-server.js`) can send arbitrary types. `engine.scanText()` calls `limitScanText()` which caps at 50,000 chars, but `args.text` could be a non-string type causing `String(text)` to produce `"[object Object]"`.

**Recommended fix:**
- Add explicit type checks in handlers: `if (typeof args.text !== "string") return error`.
- Add a max length check before passing to the engine.

### 4.10 Dependency on `@modelcontextprotocol/sdk` with no lockfile

**Severity: Medium**
**Location:** `mcp-server/package.json`

**Explanation:**
```json
"dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
}
```
No `package-lock.json` is committed for the MCP server. The `^1.0.0` range allows any 1.x version. CI runs `cd mcp-server && npm ci` which requires a lockfile — if it doesn't exist, npm will fail or generate one non-deterministically. A supply chain attack on the SDK package would compromise all MCP server installations.

**Recommended fix:**
- Commit `mcp-server/package-lock.json`.
- Pin to an exact version: `"@modelcontextprotocol/sdk": "1.0.0"`.
- Add `npm audit` to CI.
- Consider adding an `.npmrc` with `ignore-scripts` to prevent postinstall scripts.

### 4.11 `unsafe-inline` in CSP

**Severity: Low**
**Location:** `manifest.json` (line 35)

**Explanation:**
```json
"content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
}
```
`style-src 'self' 'unsafe-inline'` allows inline styles, which is necessary for the Shadow DOM widget and dynamic UI elements. However, `unsafe-inline` in styles can be used for CSS-based data exfiltration attacks. This is a known trade-off for browser extensions that need dynamic styling.

**Recommended fix:**
- This is acceptable for the current use case. Document the trade-off in `SECURITY.md`.
- Consider using `style-src 'self' 'nonce-<random>'` with nonces for dynamically generated styles in the future.

### 4.12 No secrets management

**Severity: Medium**
**Location:** Entire codebase

**Explanation:**
There are no secrets to manage in the current local-first architecture — no API keys, database passwords, or signing keys. However, the `hashSensitive()` salt (`"maskit"`) is effectively a secret that is hardcoded. For SaaS development, there is no `.env` file pattern, no secrets manager integration, and no environment variable loading beyond `MASKIT_PORT`.

**Recommended fix:**
- For SaaS: Add `dotenv` for environment variables, use a secrets manager (AWS Secrets Manager, HashiCorp Vault), never commit secrets.
- Generate the hash salt randomly on first install.

---

## 5. Product Architecture Review

### Current limitations

1. **Single-user, single-device** — No user accounts, no cross-device sync, no org-level policy management.
2. **No backend** — All state is local. No remote policy push, no centralized audit log aggregation, no fleet management.
3. **No billing** — No subscription management, no usage metering, no payment integration.
4. **No telemetry** — No crash reporting, no usage analytics, no error tracking. While good for privacy, it means the developer is blind to issues in production.
5. **No auto-update for MCP server or C# agent** — Only the browser extension auto-updates via CWS. The MCP server and C# agent require manual updates.
6. **Windows-only desktop agent** — No macOS or Linux agent. Claude Desktop and ChatGPT Desktop have macOS versions.
7. **No enterprise controls** — The killswitch is local-only. There is no MDM integration, no GPO policy, no SCCM deployment.

### Missing SaaS components

| Component | Status | Priority |
|-----------|--------|----------|
| User authentication | Not started | Critical |
| Organization/tenant management | Not started | Critical |
| Centralized policy management | Stub in `engine/settings.js` (`MASKIT_POLICY_DEFAULTS`) | High |
| Centralized audit log sync | Stub in `server.js` `handleGetAuditLog()` ("Phase 5") | High |
| Billing/subscription | Not started | Medium |
| Usage metering | Not started | Medium |
| Admin dashboard | Not started | High |
| API gateway | `http-server.js` (no auth) | Critical |
| Multi-tenant config | Single config file | Critical |
| Telemetry/crash reporting | Not started (privacy stance) | Low |
| Feature flags | Not started | Medium |
| Email/notification service | Not started | Low |

### Multi-user readiness

**Not ready.** The architecture has no concept of users:
- `getUserIdentity()` in `engine/settings.js` returns `null`.
- `isUserExempt()` exists but is never called with a real identity.
- The MCP server config is a single file at `%APPDATA%/Maskit/config.json` — no per-user isolation.
- The browser extension uses `chrome.storage.sync` which is per-browser-profile, not per-user.
- The C# agent config is per-Windows-user (`%APPDATA%`), but there is no multi-user coordination.

### Configuration management

**Current:** Local JSON files and `chrome.storage`. No remote config, no versioned configs, no config rollback.
**SaaS requirement:** Remote config server with versioning, A/B testing, gradual rollout, and per-org overrides. The `maskit-core/policy/contexts.json` structure is a good foundation but needs a backend to serve it.

### Policy management

**Current:** `MASKIT_POLICY_DEFAULTS` in `engine/settings.js` defines a `default` policy with per-type actions. `maskit-core/policy/contexts.json` defines per-app overrides. The `selectPolicy()` function cascades app → domain → default.
**SaaS requirement:** Per-org policies, per-team policies, per-user policies, policy inheritance, policy versioning, policy audit trail. The current structure supports this conceptually but needs a backend.

### User management

**Not implemented.** No user model, no authentication, no roles, no permissions. The `getUserIdentity()` stub and `isUserExempt()` function are placeholders for future enterprise identity integration (LDAP/OS identity).

### Billing readiness

**Not implemented.** No payment processor integration, no subscription tiers, no usage tracking. The `PRD.md` describes pricing tiers but there is no code to support them.

### Telemetry considerations

The local-first stance is a **strength for privacy** but a **weakness for operations**. Without telemetry:
- No crash reporting — extension failures are silent.
- No usage analytics — can't prioritize features.
- No error tracking — can't reproduce user issues.

**Recommendation:** Add opt-in, anonymized telemetry with clear user consent. Use a privacy-preserving analytics tool (e.g., Plausible, PostHog in anonymous mode). Crash reporting via Sentry with PII scrubbing.

### Enterprise readiness

**Not ready.** Missing:
- SSO/SAML/OIDC authentication
- SCIM provisioning
- Audit log export (SIEM integration)
- MDM/Group Policy deployment
- Data residency controls
- DLP integration
- Custom rule management UI
- Role-based admin console
- Compliance certifications (SOC 2, ISO 27001)
- DPA (Data Processing Agreement)
- SLA/uptime guarantees

---

## 6. Scalability Review

### What will break first at 1,000 users?

1. **MCP server config I/O** — `config.readConfig()` reads from disk on every tool call. At 1,000 users each making 10 calls/day, that's 10,000 disk reads/day. Not catastrophic but wasteful. Add in-memory caching with file-watch invalidation.

2. **Audit log storage** — `chrome.storage.local` has a 10MB quota. At ~200 bytes per event and 10 events/day, a user hits the quota in ~5,000 days. But power users with 100+ events/day will hit it in 500 days. The C# agent has 10MB rotation, but the browser extension has no rotation — it prunes by age, not size.

3. **No support channel** — 1,000 users will have questions, bugs, and feature requests. There is no issue tracker linked from the extension, no support email, no feedback mechanism beyond GitHub.

4. **CWS review process** — The `<all_urls>` permission and broad host permissions will trigger manual review. At 1,000 users, any permission change requires re-review, potentially taking days.

### What will break at 100,000 users?

1. **No backend** — At 100K users, you need:
   - Centralized rule/policy distribution (CDN-hosted `maskit-core/` JSON)
   - Centralized audit log aggregation (for enterprise customers)
   - User accounts and authentication
   - License/subscription validation
   - Crash reporting and telemetry
   - Admin dashboard

2. **Rule updates** — Updating detection rules requires shipping a new extension version. At 100K users, rule updates need to be push-able without extension updates (fetch from CDN).

3. **Support load** — 100K users generate significant support load. Need:
   - In-app help/FAQ
   - Automated bug reporting
   - Status page
   - Documentation site

4. **C# agent distribution** — No auto-update mechanism. At 100K Windows users, distributing updates manually is unsustainable. Need code signing and auto-update infrastructure (e.g., Squirrel, ClickOnce, or custom update server).

5. **MCP server distribution** — No installer. Users must manually install Node.js, clone the repo, and run `npm install`. Need a standalone binary (pkg, nexe) or installer.

### Components needing redesign before growth

1. **Detection engine** — Must be unified into a single shared core (WASM or native) to avoid triple-maintenance.
2. **Config system** — Must support remote config with local caching and offline fallback.
3. **Audit log** — Must support optional central aggregation with batching, compression, and encryption.
4. **Update mechanism** — Must support push updates for rules and policies without extension re-publish.
5. **HTTP API** — Must add authentication, rate limiting, and request validation before any multi-user exposure.

---

## 7. Platform Expansion Review

### Browser extensions

**Current state:** Chrome MV3, Firefox, Edge, Opera supported via `browser_specific_settings.gecko` and standard MV3 APIs. Content scripts on 16 AI sites + `<all_urls>` for `ai-intercept.js`.

**Expansion readiness:** Good. Adding new AI sites is straightforward (add to `manifest.json`). The `ai-intercept.js` script already handles generic AI detection. Safari extension would require converting to Safari Web Extension (Xcode), but the codebase is compatible.

### MCP server integrations

**Current state:** Stdio MCP server with 6 tools. `claude-desktop.json` config for Claude Desktop. HTTP server for REST API.

**Expansion readiness:** Excellent. The MCP protocol is standardized. Any MCP-capable client (Claude Desktop, Cursor, Windsurf, VS Code with MCP extension) can connect. Adding new tools is trivial (add to `TOOLS` array). The `integrations/` directory shows patterns for GitHub Actions, Express middleware, Discord bots, and Slack bots.

### AI desktop applications

**Current state:** C# Windows agent monitors clipboard system-wide. `ForegroundDetector` recognizes ChatGPT Desktop, Claude Desktop, Copilot, Ollama, LM Studio, VS Code, Cursor, Windsurf.

**Expansion readiness:** Moderate. The C# agent is Windows-only. macOS needs a Swift/Objective-C agent (Clipboard API: `NSPasteboard`, `NSWorkspace.frontmostApplication`). Linux needs an X11/Wayland clipboard monitor. The detection logic would need to be reimplemented or shared via a native library.

### IDE integrations

**Current state:** MCP server works with Cursor and VS Code (via MCP extension). `ForegroundDetector` recognizes `Code.exe` and `Cursor.exe`.

**Expansion readiness:** Good for MCP-capable IDEs. For non-MCP IDEs (JetBrains, Vim, Emacs), the HTTP API can be called from plugins. The `express-middleware.js` integration shows the pattern.

### Local AI tools

**Current state:** `maskit-core/policy/contexts.json` has a `local-ai` context that allows emails, phones, and API keys (only blocks cards and SSNs). `ForegroundDetector` recognizes `ollama.exe` and `LMStudio.exe`.

**Expansion readiness:** Good. The policy engine already differentiates local vs. cloud AI. Adding new local AI tools requires only a new entry in `AiProcesses` and optionally a new policy context.

### Enterprise deployments

**Current state:** Killswitch with schedule/duration/exemptions. Audit log with 30-day retention. Per-app policy contexts. `SECURITY.md` documents the privacy stance.

**Expansion readiness:** Poor. Missing SSO, MDM, GPO, SIEM integration, central management, and compliance certifications. The killswitch is local-only — an enterprise admin cannot enforce it across the fleet.

### Recommended architecture for multiple platforms

**Recommendation: Hybrid architecture (D)**

The best architecture for Maskit is a **hybrid** combining:

1. **Shared core in Rust compiled to WASM** — The detection engine, validators, and policy engine are written once in Rust, compiled to WASM for the browser and MCP server, and compiled to native for the C# agent (via FFI or C bindings). This eliminates triple implementation.

2. **JSON rules loaded at runtime** — `maskit-core/rules/*.json` are fetched from a CDN (for SaaS) or bundled locally (for offline). All surfaces load the same rules.

3. **MCP server as the primary integration point** — For AI tools that support MCP (Claude Desktop, Cursor, VS Code), the MCP server is the primary integration. It runs locally and calls the WASM core.

4. **Browser extension for web AI** — For web-based AI (ChatGPT, Gemini, Copilot), the browser extension is necessary because MCP cannot intercept browser events.

5. **Native agents for desktop AI** — For desktop AI apps (ChatGPT Desktop, Copilot), native agents monitor the clipboard and input. These call the same WASM core.

6. **Optional SaaS backend** — For enterprise: central policy management, audit log aggregation, fleet management, SSO. The local-first stance is preserved for individual users; the backend is opt-in for organizations.

**Tradeoffs:**

| Architecture | Pros | Cons |
|-------------|------|------|
| A) Extension-first | Simple, web-focused | Can't protect desktop AI, no MCP integration |
| B) MCP-first | Standard protocol, IDE integration | Can't intercept browser events, no clipboard protection |
| C) Local agent | System-wide protection | No browser integration, per-OS implementation |
| D) Hybrid | All surfaces covered, shared core | Most complex to build and maintain |

The hybrid approach is more complex but is the only one that covers all use cases. The current codebase is already a (manual) hybrid — the recommendation is to automate the sharing via a compiled core.

---

## 8. Testing Review

### Existing tests

1. **`test.js` (root, 261 lines)** — 28 tests covering:
   - Detection: emails, phones, cards, M-Pesa, SSN, API keys (OpenAI, Stripe, GitHub, AWS, Google, Bearer), custom rules.
   - Validation: Luhn rejection, IP version filtering, M-Pesa false positives, unsafe regex rejection.
   - Sanitization: tagged, stars, custom formats.
   - Site allowlist/blocklist.
   - Manifest validation.
   - Typing simulation (word-by-word email detection).
   - DOM paste simulation (with optional jsdom).
   - Engine integration: `scanText`, `evaluatePolicy`, cloud key detection.

2. **`engine/test.js`** — Tests for the shared engine module (not read in detail, but referenced in `package.json` test script).

3. **`mcp-server/test.js`** — Tests for the MCP server (not read in detail, but referenced in `package.json` test script).

### Coverage quality

**Good coverage of:**
- Detection patterns (happy path).
- False positive validators (Luhn, IP, M-Pesa).
- Regex safety validation.
- Sanitization formats.
- Site list matching.

**Missing coverage:**
- **No tests for `content.js`** — The 1,192-line file with all the interception logic has zero tests. The `test.js` file tests `detector.js` and `sanitizer.js` but not the event handlers, UI rendering, or audit event generation.
- **No tests for `background.js`** — The message handler, audit log, pause state, and badge logic are untested.
- **No tests for `mcp-server/http-server.js`** — The HTTP API endpoints are untested.
- **No tests for `mcp-server/config.js`** — Config read/write is untested.
- **No tests for the C# agent** — No test project in `maskit-agent/`.
- **No tests for policy engine** — `selectPolicy()`, `getPolicyAction()`, `isAIToolsAllowed()` are untested.
- **No tests for killswitch** — The schedule/duration/exemption logic is untested.
- **No tests for audit log** — `createAuditEvent()`, `hashSensitive()`, `pruneAuditLog()` are untested.
- **No integration tests** — No end-to-end test simulating a real paste event on ChatGPT.
- **No security tests** — No tests for regex DoS, config injection, or XSS in UI.
- **No performance tests** — No tests for large input scanning performance.

### Missing test cases

1. **ReDoS attack patterns** — Test that catastrophic backtracking patterns are rejected and don't hang the engine.
2. **Large input scanning** — Test with 50KB+ input to verify `limitScanText()` works.
3. **Concurrent clipboard access** — C# agent clipboard race conditions.
4. **Config corruption** — What happens when `config.json` is malformed?
5. **Cross-origin attacks** — Can a malicious website call `http://127.0.0.1:8765/scan`?
6. **Audit log overflow** — What happens when `chrome.storage.local` quota is exceeded?
7. **Policy edge cases** — What if a policy has an invalid action? What if `contexts.json` references a non-existent type?
8. **Custom rule injection** — Can a custom rule name contain HTML? Can a pattern break the regex engine?

### CI/CD readiness

**Current CI (`ci.yml`):**
- Runs on push/PR to `main`.
- Tests on Node 18, 20, 22.
- Runs `npm ci`, `npm test`, MCP server tests.
- No linting step (despite `.eslintrc.json` existing).
- No build step in CI.
- No security scanning (no `npm audit`, no CodeQL, no Snyk).

**Current release (`release.yml`):**
- Triggered on `v*` tags.
- Runs tests, builds, creates GitHub Release with `dist/maskit-extension.zip`.
- No signing.
- No CWS auto-publish.
- No C# agent build/publish.
- No MCP server binary build.

**Missing:**
- ESLint step in CI.
- `npm audit` step in CI.
- C# agent build/test in CI.
- Cross-browser testing (Chrome, Firefox, Edge, Opera).
- CWS auto-publish (via Chrome Web Store API).
- Mozilla AMO auto-publish.
- Code signing for C# agent.
- Semantic versioning enforcement.
- Changelog generation from commits.

### Production testing requirements

1. **Unit tests** for `content.js` (extract testable functions).
2. **Integration tests** with Puppeteer/Playwright simulating real browser interactions.
3. **Security tests** with OWASP ZAP or similar against the HTTP API.
4. **Performance tests** for detection on large inputs.
5. **Compatibility tests** across Chrome, Firefox, Edge, Opera, Safari.
6. **Load tests** for the MCP server handling concurrent tool calls.
7. **End-to-end tests** for the C# agent clipboard monitoring.

---

## 9. Dependency Review

### Major dependencies

| Dependency | Version | Location | Purpose |
|-----------|---------|-----------|---------|
| `@modelcontextprotocol/sdk` | `^1.0.0` | `mcp-server/package.json` | MCP protocol implementation |
| (none) | — | root `package.json` | No runtime dependencies |

The root `package.json` has **zero dependencies** — the browser extension is pure vanilla JS with no build step (no bundler, no transpiler, no framework). This is a deliberate choice that keeps the extension lightweight and auditable.

The `package-lock.json` is empty (only the root package, no dependencies). The `mcp-server/` has no committed lockfile.

### Dev dependencies

There are **no declared devDependencies** in either `package.json`. This means:
- No test framework (tests use Node's built-in `assert` and `vm` module).
- No bundler (the extension ships raw JS files).
- No transpiler (no Babel, no TypeScript).
- No formatter (no Prettier).
- ESLint is configured (`.eslintrc.json`) but not declared as a dependency — it must be globally installed.

### Outdated libraries

- `@modelcontextprotocol/sdk: ^1.0.0` — The SDK is at 1.x. Should verify compatibility with the latest MCP spec.
- No other libraries to be outdated.

### Security concerns

1. **No `package-lock.json` for MCP server** — Non-reproducible builds, vulnerable to dependency confusion.
2. **No `npm audit` in CI** — Vulnerable to known CVEs in transitive dependencies.
3. **No `.npmrc` with `ignore-scripts`** — Postinstall scripts from dependencies execute with user privileges.
4. **No SRI/integrity checks** — If rules are ever fetched from a CDN, there is no integrity verification.
5. **No SBOM (Software Bill of Materials)** — Required for enterprise compliance.

### Dependency appropriateness

- **`@modelcontextprotocol/sdk`** — Appropriate. This is the official SDK for MCP servers.
- **No test framework** — Using `assert` + `vm` is acceptable for a small project but doesn't scale. Consider Vitest or Jest for future growth.
- **No bundler** — Acceptable for a small extension, but limits the ability to use TypeScript, tree-shaking, or modern JS features that need transpilation.
- **No formatter** — Inconsistent code style is visible (mixed quotes, inconsistent semicolons).

---

## 10. Recommended Roadmap

### Phase 1: Immediate fixes required before production (1-2 weeks)

1. **[Critical] Add authentication to HTTP API** — `mcp-server/http-server.js` needs a shared-secret token, CORS restrictions, body size limit, and rate limiting.

2. **[Critical] Commit `mcp-server/package-lock.json`** — Pin `@modelcontextprotocol/sdk` to an exact version. Add `.npmrc` with `ignore-scripts`.

3. **[High] Replace FNV-1a hash with SHA-256** — `engine/settings.js` `hashSensitive()` must use `crypto.subtle`/`crypto.createHash` with a per-installation random salt.

4. **[High] Fix version mismatch** — `package.json` says 2.3.0, `manifest.json` says 2.4.0. Sync versions.

5. **[High] Add `npm audit` and ESLint to CI** — Add `npm audit` and `npm run lint` steps to `ci.yml`.

6. **[Medium] Validate config imports** — `background.js` `IMPORT_CONFIG` handler must validate settings against `MASKIT_DEFAULTS` schema before writing.

7. **[Medium] Remove `innerHTML` usage** — Replace with `textContent` in `content.js` `showKillswitchModal()` and `showReviewDialog()`.

8. **[Medium] Add body size limit to `parseBody()`** — Cap at 1MB in `http-server.js`.

9. **[Low] Remove dead code in C# agent** — Clean up unused P/Invoke declarations in `ClipboardMonitor.cs`.

10. **[Low] Update `MASKIT_SUPPORTED_SITES`** — Sync with `manifest.json` host permissions.

### Phase 2: Improvements required for commercial beta (1-3 months)

1. **Unify detection logic** — Make the browser extension load patterns from `maskit-core/rules/*.json` at build time (inject into `detector.js` during `scripts/build.js`). This ensures browser and engine use the same patterns.

2. **Split `content.js`** — Extract modules: `interceptor.js`, `ui/widget.js`, `ui/review-dialog.js`, `ui/toast.js`, `audit.js`. Use ES modules with a bundler (esbuild).

3. **Add tests for `content.js`** — Extract testable functions (e.g., `getProposedText`, `isAlreadyRedacted`, `generateAuditEvents`) and unit test them. Add Puppeteer integration tests for paste/copy/typing interception.

4. **Add tests for policy engine and killswitch** — Test `selectPolicy()`, `getPolicyAction()`, `isAIToolsAllowed()` with various contexts and schedules.

5. **Add C# agent tests** — Create `maskit-agent/Maskit.Agent.Tests/` project with xUnit tests for `RuleEngine`, `PolicyEngine`, `AuditLogger`.

6. **Add C# agent to CI** — Add a `dotnet test` step to `ci.yml` using `actions/setup-dotnet`.

7. **Implement event-based clipboard monitoring** — Replace polling in `ClipboardMonitor.cs` with `AddClipboardFormatListener`. Reduces CPU usage and eliminates race conditions.

8. **Add macOS agent** — Swift/Objective-C clipboard monitor using `NSPasteboard` and `NSWorkspace.frontmostApplication`. Share rules via `maskit-core/` JSON.

9. **Add auto-update for C# agent** — Use Squirrel or custom update server with code signing.

10. **Add MCP server installer** — Package as a standalone binary using `pkg` or `nexe`. Add installer for Windows/macOS/Linux.

11. **Add opt-in telemetry** — Privacy-preserving crash reporting (Sentry with PII scrubbing) and anonymous usage analytics (Plausible). Clear opt-in consent UI.

12. **Add request logging to MCP server** — Log tool calls, arguments (hashed), and response times to a local log file for debugging.

13. **Add audit log export** — Allow exporting audit log as CSV/JSON from the options page for compliance.

14. **Add rule update mechanism** — Fetch rule updates from a CDN endpoint (with integrity verification) without requiring extension updates.

### Phase 3: Features required for SaaS scale (3-12 months)

1. **Build SaaS backend** — User authentication (OAuth/OIDC), organization management, centralized policy management, audit log aggregation, billing (Stripe), admin dashboard.

2. **Implement multi-tenant config** — Per-org policies, per-team overrides, per-user exemptions. Backend serves `maskit-core/policy/` JSON per tenant.

3. **Build admin console** — Web dashboard for enterprise admins to manage policies, view audit logs, manage users, and configure killswitches.

4. **Add SSO/SAML** — Integrate with Okta, Azure AD, Google Workspace for enterprise authentication.

5. **Add SCIM provisioning** — Automated user provisioning/deprovisioning for enterprise.

6. **Add SIEM integration** — Export audit logs to Splunk, ELK, Datadog via webhook or API.

7. **Add MDM deployment** — Generate `.msi`/`.pkg` installers with GPO/MDM configuration for enterprise fleet deployment.

8. **Build WASM core** — Rewrite the detection engine in Rust, compile to WASM for browser and MCP server, compile to native for desktop agents. Eliminates triple implementation.

9. **Add compliance certifications** — SOC 2 Type II, ISO 27001. Complete privacy impact assessment. Publish DPA.

10. **Add feature flags** — Use LaunchDarkly or similar for gradual feature rollout.

11. **Add status page** — Public status page for SaaS backend uptime.

12. **Add support system** — In-app help, ticketing, knowledge base.

13. **Add marketplace integrations** — Publish to Chrome Web Store, Mozilla AMO, Edge Add-ons, Opera Add-ons. Automate publishing in CI.

14. **Add localization** — Internationalize UI strings. Support major languages.

---

## 11. Final Assessment

### Overall score: 6.5 / 10

The project demonstrates strong architectural thinking and security-conscious engineering for a local-first privacy tool. The core detection logic is solid, the policy engine is well-designed, and the audit schema is thoughtful. However, the triple implementation of detection logic, lack of authentication on the HTTP API, non-cryptographic hashing of sensitive data, and missing SaaS infrastructure prevent it from being production-ready for commercial use.

### Production readiness: 55%

| Area | Readiness | Notes |
|------|-----------|-------|
| Core detection | 85% | Well-tested, good false-positive guards |
| Browser extension | 70% | Functional, but `content.js` needs refactoring |
| MCP server | 50% | Works but no auth, no lockfile |
| Windows agent | 40% | MVP, polling-based, Windows-only |
| Security | 45% | HTTP API exposed, weak hashing, `innerHTML` |
| Testing | 35% | Good detection tests, no UI/integration/security tests |
| CI/CD | 50% | Basic test CI, no lint/audit/build/security |
| Documentation | 75% | Extensive but aspirational |
| Error handling | 60% | Good in browser, poor in HTTP API |

### SaaS readiness: 20%

The codebase is a **local-first tool**, not a SaaS product. It lacks all SaaS infrastructure: authentication, multi-tenancy, billing, centralized management, and a backend. The architecture (shared core, JSON rules, policy engine) is a good foundation, but building the SaaS layer is 6-12 months of work.

### Biggest strengths

1. **Local-first privacy architecture** — The correct design for a privacy product. No network calls, no telemetry, no data collection.
2. **Cross-platform vision** — Browser extension + MCP server + Windows agent + JSON rules. The intent to cover all AI surfaces is clear.
3. **Policy engine with context-aware overrides** — `selectPolicy()` cascading app → domain → default is a solid foundation for enterprise policy management.
4. **Regex DoS protection** — `isRegexSafe()`, `limitScanText()`, `validateCustomRegexPattern()` show security-conscious engineering.
5. **Structured audit events** — Consistent schema across surfaces enables compliance reporting.
6. **Zero runtime dependencies in browser extension** — Pure vanilla JS, lightweight, auditable.

### Biggest weaknesses

1. **Triple implementation of detection logic** — `detector.js` (browser), `engine/detector.js` (Node), `RuleEngine.cs` (C#) will diverge, causing inconsistent detection.
2. **No authentication on HTTP API** — `http-server.js` is a critical security exposure.
3. **Non-cryptographic hash for sensitive data** — FNV-1a with hardcoded salt is reversible.
4. **`content.js` God Object** — 1,192 lines mixing 6+ concerns.
5. **No SaaS infrastructure** — No backend, no auth, no multi-tenancy, no billing.
6. **Windows-only desktop agent** — No macOS/Linux support for desktop AI protection.
7. **No lockfile for MCP server** — Non-reproducible builds, supply chain risk.

### Single most important improvement to make next

**Unify the detection engine into a single shared core.**

The triple implementation of detection logic (`detector.js`, `engine/detector.js`, `RuleEngine.cs`) is the root cause of the most significant risks: inconsistent detection across surfaces, triple maintenance burden, and inability to add new platforms without reimplementing security-critical logic. 

The fix is to write the detection engine once in Rust, compile to WASM for the browser and MCP server, and compile to native for desktop agents. This:
- Eliminates implementation drift.
- Enables adding new platforms (macOS, Linux, mobile) without reimplementing detection.
- Allows security auditing of a single codebase.
- Reduces maintenance from 3x to 1x.
- Enables property-based testing and fuzzing of a single core.

This is a 2-3 month investment that pays for itself before any SaaS work begins, because you cannot build a reliable commercial product on three divergent implementations of security-critical logic.

---

## Appendix: AI Privacy Platform Assessment

### Can this architecture become a universal local AI privacy layer?

**Target platforms and current support:**

| Platform | Support | Mechanism |
|----------|---------|-----------|
| MCP servers | ✅ Yes | `mcp-server/server.js` (stdio) |
| Claude Desktop | ✅ Yes | MCP server + `claude-desktop.json` |
| ChatGPT Desktop | ✅ Yes (Windows) | C# agent clipboard monitoring |
| ChatGPT Web | ✅ Yes | Browser extension content script |
| Codex | ⚠️ Partial | HTTP API available, no native integration |
| VS Code extensions | ✅ Yes | MCP server + `ForegroundDetector` recognizes `Code.exe` |
| Cursor | ✅ Yes | MCP server + `ForegroundDetector` recognizes `Cursor.exe` |
| Local LLM (Ollama, LM Studio) | ✅ Yes | C# agent + `local-ai` policy context |
| Gmail | ✅ Yes | Browser extension |
| Gemini/Copilot/Bing/Perplexity/HuggingFace | ✅ Yes | Browser extension |
| macOS desktop AI | ❌ No | No macOS agent |
| Linux desktop AI | ❌ No | No Linux agent |
| Mobile AI apps | ❌ No | No mobile agent |
| Enterprise AI (Slack, Teams) | ⚠️ Partial | Bot integrations exist but no DLP enforcement |

### Architecture recommendation: D) Hybrid architecture

**Rationale:**

No single architecture can cover all AI privacy surfaces:

- **Extension-first (A)** cannot protect desktop AI apps (ChatGPT Desktop, Claude Desktop) or MCP-integrated IDEs.
- **MCP-first (B)** cannot intercept browser paste/copy/typing events on web AI sites.
- **Local agent (C)** cannot inject into web pages or participate in MCP tool calls.

A **hybrid architecture** is the only option that covers all surfaces:

1. **Shared WASM core** (Rust → WASM) — detection engine, validators, policy engine.
2. **Browser extension** — for web AI (ChatGPT, Gemini, Copilot). Uses WASM core.
3. **MCP server** — for MCP-capable tools (Claude Desktop, Cursor, VS Code). Uses WASM core.
4. **Native agents** — for desktop AI (ChatGPT Desktop, Copilot). Uses native-compiled core.
5. **Optional SaaS backend** — for enterprise (policy management, audit aggregation, SSO). Opt-in.

**Tradeoffs:**

| Factor | Hybrid | Extension-only | MCP-only | Agent-only |
|--------|--------|----------------|---------|-----------|
| Web AI coverage | ✅ | ✅ | ❌ | ❌ |
| Desktop AI coverage | ✅ | ❌ | ✅ (MCP clients only) | ✅ |
| IDE coverage | ✅ | ❌ | ✅ | ⚠️ (clipboard only) |
| Implementation complexity | High | Low | Medium | Medium |
| Maintenance burden | Medium (shared core) | Low | Low | Medium |
| Enterprise readiness | ✅ | ❌ | ⚠️ | ⚠️ |
| User friction | Low (auto-detect surface) | Low | Medium (config) | Medium (install) |

The hybrid approach is more complex to build but is the only architecture that achieves the goal of a **universal local AI privacy layer**. The current codebase is already a manual hybrid — the recommendation is to automate the sharing via a compiled core, reducing the maintenance burden from 3x to 1x.

**Next step:** Prototype the Rust → WASM core with the existing `maskit-core/rules/*.json` as input. Benchmark detection accuracy and performance against the current JS implementation. If parity is achieved, migrate all surfaces to consume the WASM core.