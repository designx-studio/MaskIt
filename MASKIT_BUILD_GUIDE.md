# Maskit Developer Build Guide

This document tells developers exactly what to build, in what order, with acceptance criteria and code guidance.

---

## Phase 1: Launch (Browser + MCP)

You have 80% of the code. Phase 1 is hardening, testing, and shipping.

### Task 1.1: Browser Extension Hardening

**Current state:** v2.4.0, 32 tests passing, works locally

**What to do:**

1. **Verify host permissions are minimal**
   - Should only have: `https://chatgpt.com/*`, `https://chat.openai.com/*`, `https://mail.google.com/*`
   - No `<all_urls>`, no tabs permission, no webRequest
   - ✅ Already done per docs

2. **Test rich editor support end-to-end**
   - Paste API key into ChatGPT → should show [API_KEY_REDACTED]
   - Type slowly, watch for lag (should be <10ms delay on redaction)
   - Test with contenteditable and Shadow DOM
   - Test Gmail compose with rich text
   - ✅ Already done per docs

3. **Verify site allowlist/blocklist works across tab switches**
   - Add site to blocklist
   - Reload tab → badge should be OFF (greyed)
   - Switch tabs back and forth → state persists
   - ✅ Already done per docs

4. **Test keyboard shortcuts**
   - Alt+Shift+M toggles protection globally
   - Alt+Shift+P pauses for 30s (configurable)
   - Both work across all tabs
   - ✅ Already done per docs

5. **Hardening checklist:**
   - [x] Review manifest.json for overly broad permissions
   - [x] Run `npm test` — all 32 tests pass
   - [x] Test XSS prevention: paste `<script>alert('xss')</script>` → should redact, not execute
   - [x] Test regex catastrophic backtracking: upload 100KB of random text → no hang
   - [x] Settings export/import roundtrip: export → modify → import → verify all settings restored

**Acceptance criteria:**
- All 32 browser tests pass ✅
- Zero permission escalation warnings from Chrome Web Store review
- Manual test checklist from BUILD.md all pass
- No performance regression (redaction <10ms on typical paste)

**Estimated effort:** 4–6 hours (mostly testing, not coding)

**Total Phase 1.1 effort (hardening + MCP + website + submission):** ~12-15 hours
**Total Phase 1.2 effort (multi-browser):** ~8-12 hours additional

---

### Task 1.2: Multi-Browser Support (Phase 1.2)

**Current state:** Extension works in Chrome, needs Firefox/Edge/Opera deployment

**What to do:**

1. **Firefox Add-on**
   - Manifest V2 vs V3: Firefox supports MV3, but some legacy rules differ
   - Update manifest.json for Firefox compatibility (if needed)
   - Host permissions: same as Chrome
   - Test end-to-end in Firefox: paste, copy, typing, all scan modes
   - Build: `npm run build:firefox` → creates maskit-extension-firefox.zip
   - Submit to Mozilla Add-ons (7–10 day review)

2. **Edge Extension**
   - Edge uses same Chromium engine as Chrome
   - Same code, just re-register on Microsoft Store
   - Build: `npm run build:edge` → maskit-extension-edge.zip
   - Submit to Microsoft Store (1–3 day review)
   - Edge auto-syncs settings via Microsoft account (users appreciate this)

3. **Opera Extension**
   - Same Chromium base as Chrome/Edge
   - Build: copy to Opera Extensions directory
   - Submit to Opera Add-ons store (instant or 1 day)

4. **Expand Host Permissions (All Browsers)**
   - Current: only `chatgpt.com`, `chat.openai.com`, `mail.google.com`
   - New: add patterns for ALL browser inputs
   - Update manifest.json:
     ```json
     "host_permissions": [
       "https://*/*",  // ALL HTTPS sites (broad, but necessary for search bar protection)
       "http://localhost/*"  // Local development
     ]
     ```
   - Warning: Broad permissions will be scrutinized by app stores
   - Mitigation: Privacy policy states "content is never sent anywhere, only scanned locally"
   - Alternative: Keep narrow permissions, but then search bar/address bar won't be protected

5. **Test Coverage: All Inputs**
   - Address bar (type API key, should redact before sending)
   - Search bar (Google, Bing, DuckDuckGo — type sensitive data, should intercept)
   - Form fields (generic sites, should work)
   - contenteditable (ChatGPT, Gmail, Discord — should work)
   - Rich text editors (Google Docs, Notion — test compatibility)

6. **Build Script Updates**
   - `npm run build` → creates all 4 browser zips
   - Output: 
     - dist/maskit-chrome.zip
     - dist/maskit-firefox.zip
     - dist/maskit-edge.zip
     - dist/maskit-opera.zip

**Acceptance criteria:**
- Extensions live on all 4 app stores
- All 32 tests still pass (no Firefox/Edge-specific logic needed)
- Manual testing: paste/copy/typing works in Chrome, Firefox, Edge, Opera
- Address bar protection works: type "sk-abcd1234" in address bar → redacted
- Search bar protection works: type "john@company.com" in Google search → redacted
- All 4 extensions sync settings independently (user can have different rules per browser)

**Testing:**
```
Chrome:
  1. Paste sk-abcd into search bar → redacted
  2. Type email in address bar → redacted
  
Firefox:
  Same tests as Chrome
  
Edge:
  Same tests as Chrome
  
Opera:
  Same tests as Chrome
```

**Important: Host Permissions Trade-off**

The broad `https://*/*` permission enables search bar protection, but will trigger store review concerns. Mitigation:
- Be explicit in store listings: "Maskit scans all input locally, never sends data"
- Reference SECURITY.md: No network permissions, no clipboard permissions
- Privacy policy: "All detection happens on your device"
- If rejected: fall back to narrower permissions (lose search bar protection)

**Estimated effort:** 8–12 hours (mostly testing and store submissions)

---

### Task 1.3: MCP Server Stability

**Current state:** 18 tests passing, works via stdio to Claude Desktop

**What to do:**

1. **Verify stdio transport is robust**
   - Crash recovery: if MCP server crashes, does Claude Desktop handle gracefully?
   - Large payloads: scan 50KB of text → should respond in <100ms
   - Concurrent requests: Claude sends 3 scan requests simultaneously → all handled
   - Config reload: user updates config file → server picks up changes within 1s

2. **Test all 6 MCP tools end-to-end**
   ```
   scan_text("sk-abcdefghij1234567890") → should find API_KEY, risk score 75+
   redact_text("Email: john@example.com") → should return [EMAIL_REDACTED]
   evaluate_policy(text, {EMAIL: true, API_KEY: false}) → EMAIL allowed, API_KEY denied
   get_status() → returns {version, engineReady, rulesEnabled}
   get_rules() → returns all built-in + custom rules
   update_rules([{pattern: "PROJ-\\d{4}", name: "internal_id"}]) → adds rule, validates
   ```

3. **Config management**
   - Config file location correct per OS (Windows: %APPDATA%, macOS: ~/Library, Linux: ~/.config)
   - Config persists across server restarts
   - Syntax error in config → graceful fallback to defaults, log error
   - Per-app overrides work: `claude-desktop`, `cursor`, `discord` sections respected

4. **Error handling**
   - Scan with malformed JSON input → 400 response, not crash
   - Regex too long in custom rule → validation rejects before storing
   - Disk permissions issue writing config → logs error, doesn't crash
   - Network unavailable (not relevant for local, but test file I/O)

**Acceptance criteria:**
- All 18 MCP tests pass ✅
- Successful Claude Desktop integration: user adds config → MCP tools appear in Claude → scan_text works
- Config survives reload cycle: restart Claude Desktop, config still there
- Error cases don't crash server

**Estimated effort:** 6–8 hours (mostly integration testing)

---

### Task 1.3: Public Website & Docs

**Current state:** Landing page exists, needs launch polish

**What to do:**

1. **Landing page (website/index.html)**
   - Clear value prop: "Protect sensitive data in every AI conversation"
   - Screenshots/demo GIF: redacting API key in ChatGPT
   - Three paragraphs max:
     - What: Local redaction for AI workflows
     - Who: Anyone using ChatGPT, Claude, local AI
     - Why: One line security
   - CTA: "Install for Chrome" + "Setup for Claude Desktop"
   - Trust signals: "Local only", "No signup", "Open source"

2. **Installation docs**
   - Browser: 3 steps (Chrome Web Store link, click install, reload tabs)
   - Claude Desktop: 5 steps (find config file, add JSON block, restart Claude, show tool list, done)
   - Troubleshooting: "MCP tools don't appear?" → common causes

3. **Permissions explanation**
   - "Why does Maskit need 'storage' permission?" → saves your settings
   - "Why only ChatGPT and Gmail?" → covered by host permissions, other sites can be added

4. **FAQ**
   - Does it send data anywhere? No, everything local.
   - Can I see what was redacted? Yes, Settings tab shows stats by type.
   - What about false positives? We guard with Luhn checks, Kenyan phone format, etc. Report issues.
   - Can I add custom patterns? Yes, Settings → Custom Rules.

**Acceptance criteria:**
- Landing page loads in <2s
- All links work (Chrome Web Store, GitHub, docs)
- Mobile-friendly (responsive design)
- FAQ answers top 10 support questions
- Installation docs match actual steps (no "do X then Y" that doesn't work)

**Estimated effort:** 3–4 hours

---

### Task 1.4: Privacy Policy & Security Model Doc

**Current state:** SECURITY.md exists, privacy policy in HTML

**What to do:**

1. **Privacy Policy**
   - Data handling: "We never see your data. All processing is local."
   - Settings sync: "Chrome storage.sync syncs only your settings (not clipboard), encrypted in transit"
   - Analytics: "No analytics collected" (or: "Basic crash reports via Chrome" if you add it)
   - Third-party: "No third-party services"
   - Sign-off: "Policy effective [date]"

2. **Security Model (SECURITY.md)**
   - Threat model: "Malicious website tries to exfiltrate data; Maskit intercepts it"
   - Attack surface: Content script injection points, storage keys, user input
   - Mitigations: Regex limits, input capping (50KB max scan), sandbox isolation
   - Known limitations: "Regex-based detection, not ML; can have false positives/negatives"
   - Vulnerability disclosure: "Email security@maskit.dev if you find an issue"

**Acceptance criteria:**
- Privacy policy approved for Chrome Web Store submission
- Security.md explains threat model clearly
- No weasel words ("may" → "does" or "doesn't")
- Vulnerability disclosure process documented

**Estimated effort:** 2–3 hours

---

### Task 1.5: Chrome Web Store Submission

**What to do:**

1. **Prepare store assets**
   - Icon: 128x128 PNG ✅ (already have)
   - Screenshots: 3–5 showing redaction UI, settings panel, stats
   - Description: 2–3 sentences max
   - Category: "Privacy"
   - Language: English

2. **Build zip**
   - Run `npm run build` → creates `dist/maskit-chrome.zip`
   - Zip includes only: manifest.json, *.js files, *.html, icons
   - No: node_modules, tests, source maps, website/

3. **Submit**
   - Create Chrome Web Store developer account
   - Upload dist/maskit-chrome.zip
   - Add store metadata (title, description, icon)
   - Accept developer agreement
   - Submit for review

4. **Review cycle**
   - Chrome review takes 1–5 days
   - Common rejections: over-broad permissions (already fixed), misleading description
   - If rejected: review feedback, fix, resubmit

**Acceptance criteria:**
- Extension live on Chrome Web Store
- Store listing shows screenshots, description, ratings
- Installation from store works end-to-end

**Estimated effort:** 2–3 hours (mostly waiting for review)

---

### Task 1.6: MCP Registry Publication

**What to do:**

1. **Publish to MCP registry**
   - Repository: https://github.com/modelcontextprotocol/servers
   - Create PR with folder: `src/maskit/`
   - Include: README.md, server.js, package.json
   - CI runs tests, verifies stdio transport

2. **Make server discoverable**
   - Users can install via: `npm install @maskit-ai/mcp-server`
   - Or: Point to GitHub raw file in Claude Desktop config
   - Recommend: GitHub raw file is easier, npm is phase 2

**Acceptance criteria:**
- MCP server in official registry
- Users can add it to claude_desktop_config.json in <5 minutes
- Tools appear in Claude automatically

**Estimated effort:** 1 hour (mostly paperwork)

---

### Task 1.7: Launch Checklist

Before shipping:

- [x] All 32 browser tests pass
- [x] All 18 MCP tests pass
- [x] All 83 engine tests pass
- [ ] Manual test checklist complete (paste, copy, typing, API key, review mode, blocklist, shortcut)
- [ ] Website loads, all links work
- [x] Privacy policy approved
- [x] Security.md complete
- [ ] Chrome Web Store submission approved
- [ ] MCP registry PR merged
- [ ] Docs updated with install links
- [ ] GitHub repo README points to Chrome Web Store + Claude Desktop setup
- [ ] Twitter/LinkedIn announcement ready (optional, depends on your visibility preference)

**Launch date:** When all checkboxes checked.

---

## Phase 2: Feedback Loop & Control (Weeks 2-3 after launch)

You've shipped. Users are using it. Now you learn and iterate.

### Task 2.1: Structured Audit Log

**Current state:** Stats are just counters (total redactions, by type, by source)

**Problem:** You can't build features without detailed event data.

**What to build:**

Replace `stats` storage with `auditLog`:

```javascript
// Old (chrome.storage.local):
{
  stats: {
    total: 150,
    paste: 100,
    copy: 40,
    typing: 10,
    byType: { EMAIL: 50, API_KEY: 60, ... }
  }
}

// New (chrome.storage.local):
{
  auditLog: [
    {
      timestamp: 1690000000000,
      type: 'API_KEY',
      severity: 'critical',
      source: 'paste',           // paste | copy | typing
      app: 'chatgpt.com',
      action: 'redacted',        // redacted | blocked | allowed | unmasked
      riskScore: 75,
      matchedRule: 'sk-',
      policyApplied: 'default',  // or specific policy name
      userAction: null           // 'approved' | 'dismissed' | 'unmasked' if user interacted
    },
    // ... more events
  ]
}
```

**Implementation:**

1. **Update engine/index.js**
   ```javascript
   scanText(text, settings) {
     // ... detection logic ...
     return {
       findings,
       redactedText,
       riskScore,
       events: [  // NEW: return event objects
         {
           type: 'EMAIL',
           severity: 'medium',
           matchedRule: 'email regex',
           startIndex, endIndex
         }
       ]
     }
   }
   ```

2. **Update content.js (browser extension)**
   ```javascript
   const result = scanText(text, settings);
   
   // For each finding, create audit event
   result.events.forEach(event => {
     const auditEvent = {
       timestamp: Date.now(),
       ...event,
       source: 'paste',  // or 'copy', 'typing'
       app: window.location.hostname,
       action: 'redacted',
       policyApplied: settings.activePolicy || 'default'
     };
     recordAuditEvent(auditEvent);
   });
   ```

3. **Add UI to view audit log**
   - Settings → Audit Log tab
   - Table: timestamp, type, action, app, user action (if any)
   - Filter by: date range, type, action, app
   - Export as CSV for compliance

4. **Prune old logs**
   - Keep 30 days by default (configurable)
   - On startup, delete events older than retention window
   - Storage quota: ~50MB in chrome.storage.local, ~30 days of logs fits easily

**Acceptance criteria:**
- Every redaction/block/allow creates a structured audit event
- Audit log UI shows last 100 events with filters
- Export to CSV works
- Old events pruned after 30 days
- No performance impact (<5ms per audit write)

**Testing:**
- Paste 10 sensitive items → 10 events created
- Filter by type → shows only API_KEY events
- Export → opens CSV with all columns

**Estimated effort:** 6–8 hours

---

### Task 2.2: Role-Based Policies

**Current state:** You have single policy: severity-based (critical block, high redact, medium allow, etc.)

**Problem:** Users need different rules for different apps.

**What to build:**

Policies are context-aware configurations:

```javascript
// MASKIT_DEFAULTS (engine/settings.js)
{
  activePolicy: 'default',
  policies: {
    default: {
      EMAIL: { action: 'redact', format: 'tagged' },
      PHONE: { action: 'redact', format: 'tagged' },
      API_KEY: { action: 'redact', format: 'tagged' },
      CARD: { action: 'block' },
      SSN: { action: 'block' },
      // ... etc
    },
    'claude-desktop': {
      EMAIL: { action: 'allow' },
      PHONE: { action: 'allow' },
      API_KEY: { action: 'redact' },
      CARD: { action: 'block' },
      // ... rest inherit from default
    },
    'chatgpt.com': {
      EMAIL: { action: 'redact' },
      PHONE: { action: 'redact' },
      API_KEY: { action: 'redact' },
      CARD: { action: 'redact' },
      SSN: { action: 'redact' },
    },
    'local': {  // Ollama, LM Studio
      EMAIL: { action: 'allow' },
      PHONE: { action: 'allow' },
      API_KEY: { action: 'allow' },
      // Trust local inference
    }
  }
}
```

**Implementation:**

1. **Update engine/index.js**
   ```javascript
   evaluatePolicy(text, context, settings) {
     // context = { app, model, domain, userRole }
     const policy = selectPolicy(context, settings);  // NEW
     
     const findings = detectSensitiveData(text);
     const decisions = findings.map(f => {
       const rule = policy[f.type] || { action: 'redact' };
       return {
         finding: f,
         decision: rule.action,  // allow | redact | block
         format: rule.format
       };
     });
     
     return { decisions, findings, riskScore };
   }
   ```

2. **Add selectPolicy function**
   ```javascript
   function selectPolicy(context, settings) {
     // Try to match specific policy by context
     if (context.app && settings.policies[ctx.app]) {
       return settings.policies[ctx.app];
     }
     if (context.domain && settings.policies[ctx.domain]) {
       return settings.policies[ctx.domain];
     }
     return settings.policies.default;
   }
   ```

3. **Browser extension UI (options.html)**
   - Settings → Policies tab
   - List all policies (default, claude-desktop, chatgpt.com, local, custom)
   - Click "Edit" → modal shows each data type with action selector
   - For each type: dropdown (allow | redact | block)
   - Save → writes to chrome.storage.sync

4. **MCP server config**
   ```json
   // ~/.config/maskit/config.json
   {
     "activePolicy": "default",
     "policies": {
       "default": { ... },
       "claude-desktop": { ... }
     }
   }
   ```
   - User edits config file directly (or via UI later)
   - Server reads at startup, watches for changes

**Acceptance criteria:**
- Policy selection works by app context (if possible to detect)
- Fallback to default if no specific policy
- Settings UI lets users create/edit policies
- Each policy setting persists
- Audit log records which policy was applied

**Testing:**
- Paste API key with default policy → [API_KEY_REDACTED]
- Switch to claude-desktop policy → paste same API key → allowed (not redacted)
- Switch to chatgpt.com policy → paste → [API_KEY_REDACTED]
- Verify audit log shows `policyApplied` for each event

**Estimated effort:** 8–10 hours

---

### Task 2.3: Safe Unmasking

**Current state:** No way to reveal redacted values

**Problem:** Users need to copy the original value sometimes (debugging, testing, legitimate use).

**What to build:**

Deterministic, auditable unmasking:

```javascript
// In audit log, add unmasking support:
{
  timestamp,
  type: 'API_KEY',
  action: 'redacted',
  redactedValue: '[API_KEY_REDACTED]',
  unmaskToken: hashSensitive(originalValue, salt),
  unmaskedAt: null,  // filled in if user clicks "unmask"
  unmaskedDuration: null  // "30s" or "until response"
}
```

**Implementation:**

1. **Engine-level: deterministic hash**
   ```javascript
   function hashSensitive(value, salt = 'maskit') {
     // HMAC-SHA256(value + salt) → token
     // Same value + salt → same token always
     // Doesn't store the original value
     const crypto = require('crypto');
     return crypto
       .createHmac('sha256', salt)
       .update(value)
       .digest('hex');
   }
   
   // Usage:
   const token = hashSensitive('sk-abcd1234');  // → 'a3b2c1d0...'
   // Later: hashSensitive('sk-abcd1234') → 'a3b2c1d0...' (same!)
   ```

2. **Browser extension: unmasking UI**
   - After redaction, show inline button: "Unmask (audited)"
   - Click → show original value in browser for 30 seconds
   - After 30s, re-mask automatically
   - Show toast: "Value unmasked at 2:34 PM — logged"
   - Audit log records: `unmaskedAt: timestamp, unmaskedDuration: 30000`

3. **Unmasking for responses (Phase 4)**
   - Mentioned for completeness, not in Phase 2
   - User can say: "This is a false positive, allow it permanently"

**Acceptance criteria:**
- Unmask button appears after redaction
- Click → shows original value for 30s
- Toast confirms audit logging
- Audit log event includes `unmaskedAt` timestamp
- No raw values stored in storage (only tokens)

**Testing:**
- Paste API key → [API_KEY_REDACTED]
- Click unmask → see original "sk-abcd1234" for 30s
- After 30s → re-masked to [API_KEY_REDACTED]
- Audit log shows unmaskedAt timestamp

**Estimated effort:** 5–6 hours

---

### Task 2.4: Config Sync (Browser ↔ MCP)

**Current state:** Browser settings in chrome.storage.sync, MCP config in ~/.config/maskit/config.json

**Problem:** Two separate configs get out of sync.

**Solution (Phase 2, manual):** One-click export/import

**What to build:**

1. **Browser extension: Export shared config**
   ```javascript
   // Settings → Export button
   // Creates JSON with:
   {
     version: '2.4.0',
     exportDate: ISO timestamp,
     policies: { ... },
     siteList: [ ... ],
     customRules: [ ... ],
     dataTypeToggles: { EMAIL: true, ... }
   }
   // Save as maskit-config.json
   ```

2. **MCP server: Import shared config**
   ```javascript
   // User downloads maskit-config.json from browser
   // User edits ~/.config/maskit/config.json, copies policies/rules/toggles from maskit-config.json
   // Server reads at startup
   ```
   OR: Provide a CLI helper:
   ```bash
   maskit config import ~/Downloads/maskit-config.json
   # Copies shared settings to ~/.config/maskit/config.json
   ```

3. **Browser: Import MCP config**
   - Opposite direction: MCP server exports config → browser imports
   - Advanced feature, probably Phase 3

**Acceptance criteria:**
- Export from browser creates valid JSON
- Manual import to MCP config works
- Both use policies, custom rules, toggles afterward
- No sync conflicts or overwrites

**Testing:**
- Export from browser → save to desktop
- Manually edit MCP config → paste policies from export
- Restart MCP server → rules appear in Claude Desktop scans

**Estimated effort:** 2–3 hours

---

### Task 2.5: Release Notes & Communication

**What to do:**

1. **GitHub Release (v2.4.0)**
   - Title: "Phase 2: Audit log, role-based policies, safe unmasking"
   - Changelog:
     - Structured audit log (timestamp, type, action, app, policy)
     - Role-based policies (per-app rules: allow, redact, block)
     - Safe unmasking with 30-second reveal and audit trail
     - Settings export/import for config backup
   - Migration notes: "Existing stats data will be migrated to audit log format"
   - Update browser extension to v2.4.0, submit to Web Store

2. **Blog post** (2–3 paragraphs)
   - Feedback from Phase 1: "Users asked for policy control and audit trails"
   - Phase 2 delivers: per-app rules, unmasking with audit, config export
   - Next: Company pattern learning from audit data

3. **Email to Phase 1 users**
   - "Maskit v2.4 is live — here's what's new"
   - Highlight: "You can now allow APIs in Claude Desktop while masking in ChatGPT"

**Acceptance criteria:**
- Release notes accurate and clear
- Migration from v2.3 to v2.4 is seamless
- Users understand new features

**Estimated effort:** 2–3 hours

---

## Phase 3: Company Pattern Learning (Weeks 4-6 after launch)

After Phase 2, you have audit data. Phase 3 mines it.

### Task 3.1: Pattern Suggestion Engine

**What to build:**

Analyze audit logs for frequently blocked patterns:

```javascript
function suggestPatterns(auditLog, threshold = 10) {
  const blocked = auditLog.filter(e => e.action === 'blocked');
  
  // Group by type
  const byType = {};
  blocked.forEach(e => {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e.matchedRule);
  });
  
  // Extract common sub-patterns
  // If 15 blocks on "sk-" prefix, and another 8 on "sk-proj-"
  // Suggest: "sk-proj-" as company pattern (more specific)
  
  const suggestions = [];
  Object.entries(byType).forEach(([type, rules]) => {
    if (rules.length >= threshold) {
      const commonPattern = findCommonPrefix(rules);  // e.g., "sk-"
      suggestions.push({
        type,
        pattern: commonPattern,
        count: rules.length,
        confidence: rules.length / blocked.length  // % of all blocks
      });
    }
  });
  
  return suggestions;
}
```

**UI (Settings → Pattern Suggestions tab):**
- List suggestions: "Pattern `sk-` found in 50 blocks (15% of total)"
- Buttons: "Allow this always", "Block this always", "Dismiss"
- If allow: add to custom rules, mark as "learned pattern"

**Acceptance criteria:**
- Engine suggests patterns after 100+ audit events
- Top 5 suggestions match actual user blocking patterns
- One-click approval adds to custom rules
- Suggestion gets marked with date learned

**Estimated effort:** 4–6 hours

---

### Task 3.2: False Positive Dashboard

**What to build:**

Help security team tune rules:

```javascript
function analyzeFalsePositives(auditLog) {
  // Find rules with high block rate but low unmasking
  // If EMAIL rule blocked 500 times but never unmasked,
  // likely false positives
  
  const rules = groupBy(auditLog, 'matchedRule');
  
  const analysis = Object.entries(rules).map(([rule, events]) => {
    const total = events.length;
    const unmasked = events.filter(e => e.unmaskedAt).length;
    const unmaskRate = unmasked / total;
    
    return {
      rule,
      totalBlocks: total,
      unmaskRate,
      confidence: calculateConfidence(unmaskRate),  // low if unmask rate high
      suggestion: unmaskRate > 0.3 
        ? 'May be too aggressive (high unmask rate)'
        : 'Seems appropriate'
    };
  });
  
  return analysis.sort((a, b) => b.totalBlocks - a.totalBlocks);
}
```

**UI (Settings → Rule Tuning tab):**
- Show top rules by block count
- Highlight: "EMAIL (500 blocks, 40% unmasked) — Consider allowing more"
- Button: "Relax this rule" → moves to 'allow' action

**Acceptance criteria:**
- Dashboard shows rule stats
- Suggestions are actionable
- Security team can tune without engineering

**Estimated effort:** 3–4 hours

---

## Phase 4: Bidirectional Protection

### Task 4.1: Response Scanning (MCP only)

**What to build:**

MCP intercepts Claude's responses and scans for leaked secrets:

```javascript
// In mcp-server/server.js, add tool:
{
  name: "scan_response",
  description: "Scan Claude's response for potential credential leaks",
  inputSchema: { type: "object", properties: { response: { type: "string" } } },
  process: async (input) => {
    const { response } = input;
    const result = scanText(response, settings);
    return {
      hasFindings: result.findings.length > 0,
      findings: result.findings,
      recommendation: result.riskScore > 50 ? 'warn' : 'ok'
    };
  }
}
```

**UI (Claude Desktop):**
- If response contains API keys or credentials, show warning: "Response contains potential credentials — check before copying"
- Offer to redact response

**Acceptance criteria:**
- Response scanning catches hallucinated secrets
- No false positives on legitimate code samples
- Audit log tracks all response scans

**Estimated effort:** 3–4 hours

---

## Phase 5: Enterprise Centralization

### Task 5.1: Central Policy Server (Minimal)

**What to build:**

Simple API for pushing policies to users:

```javascript
// Backend (Node.js + simple HTTP):
GET /policies/:orgId → returns policies JSON
POST /policies/:orgId → admin pushes new policies (with auth token)

// Client (browser + MCP):
// On startup, fetch /policies/{orgId} → cache locally
// Fall back to cached version if offline
// Check for updates every 24h
```

**Phase 5 feature set:**
- Policy versioning
- Canary rollout (push to 10% of users first)
- Rollback
- Audit sink (collect logs from all users to central store)

**Acceptance criteria:**
- Org admin can push policies to all users
- Policies version and rollback
- Users stay in sync without manual export/import

---

### Task 5.2: AI Killswitch (Admin Enforcement)

**Current state:** Maskit has role-based policies per app, but no org-level kill mechanism

**Problem:** In sensitive situations (security incident, compliance hold, restricted project), org needs instant, unbypassable "disable all AI tools" control.

**What to build:**

#### 5.2.1 Killswitch Policy

Add to policy schema:

```javascript
// ~/.config/maskit/config.json or cloud policy
{
  "policies": { ... },
  "killswitch": {
    "enabled": false,  // true to activate
    "message": "AI tools are restricted by Admin on this PC",
    "duration": null,  // null = indefinite, or ISO 8601 datetime for auto-enable
    "exemptions": [],  // e.g., ["analyst-ai-approved"] for certain users (Phase 5.3)
    "schedule": null   // e.g., { "disable": "17:00", "enable": "09:00", "daysOfWeek": [1,2,3,4,5] }
  }
}
```

#### 5.2.2 Browser Extension Enforcement

In `content.js`, before any scan:

```javascript
function isAIToolsAllowed(settings) {
  if (settings.killswitch?.enabled) {
    // Killswitch is active
    if (settings.killswitch.schedule) {
      // Check if within restricted hours
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      if (shouldBeDisabledBySchedule(hour, day, settings.killswitch.schedule)) {
        return false;
      }
    } else {
      // Killswitch indefinite
      return false;
    }
  }
  
  if (settings.killswitch?.duration) {
    const deadline = new Date(settings.killswitch.duration);
    if (Date.now() < deadline) {
      return false;
    }
  }
  
  return true;
}

// In content.js, on paste/typing:
if (!isAIToolsAllowed(settings)) {
  showKillswitchModal(settings.killswitch.message);
  preventDefault();  // Block the paste/input
  return;
}
```

#### 5.2.3 Killswitch Modal

Persistent popup that shows when AI tools are disabled:

```javascript
function showKillswitchModal(message) {
  const modal = document.createElement('div');
  modal.id = 'maskit-killswitch-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 8px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  content.innerHTML = `
    <h2>⛔ ${message}</h2>
    <p>This restriction was set by your organization.</p>
    <p style="font-size: 12px; color: #666;">
      Contact your administrator if you believe this is in error.
    </p>
    <button onclick="alert('Contact your IT department')">
      Help & Support
    </button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
}
```

#### 5.2.4 MCP Server Enforcement

In `mcp-server/server.js`:

```javascript
async function handleScanTool(input) {
  const settings = loadConfig();
  
  if (!isAIToolsAllowed(settings)) {
    return {
      error: "AI tools are restricted by Admin",
      message: settings.killswitch.message,
      blocked: true
    };
  }
  
  // Normal scan logic
  return scanText(input.text, settings);
}
```

When Claude Desktop receives `blocked: true`, it shows a toast: "AI tools are currently disabled by your administrator."

#### 5.2.5 CLI Enforcement

```bash
$ maskit scan "my secret api key"
# Returns:
# Error: AI tools are restricted by Admin on this PC
# AI tools are restricted by Admin on this PC
```

#### 5.2.6 Audit Trail

Log killswitch events to audit log:

```javascript
{
  timestamp: 1690000000000,
  type: 'KILLSWITCH',
  action: 'enabled',  // or 'disabled'
  triggeredBy: 'admin-sync',  // or 'manual', 'schedule'
  message: 'AI tools are restricted by Admin on this PC',
  duration: null,  // or ISO timestamp
  blockedAttempts: 0  // incremented when user tries to use AI tools
}
```

#### 5.2.7 Admin Dashboard (Backend)

Simple web dashboard for org admin:

```
Killswitch Status
✓ Enabled
Message: "AI tools are restricted by Admin on this PC"
Duration: Indefinite

[ ] Schedule-based (e.g., disable after-hours)
   Disable at: 17:00
   Enable at: 09:00
   Days: Mon-Fri

[ ] Time-limited (e.g., 1 hour, 24 hours, until datetime)
   Duration: 24 hours from now (auto-enable)

[Disable Killswitch] [Update Message] [View Blocked Attempts]
```

**Acceptance criteria:**
- Killswitch enabled → all AI tools blocked (browser, MCP, CLI)
- Modal shows custom message
- Cannot be bypassed by user (no UI toggle to disable)
- Audit log tracks enable/disable + blocked attempts
- Schedule-based killswitch works (e.g., disable after 5pm)
- Admin can disable and message is customizable
- MCP returns error when killswitch active
- CLI returns error when killswitch active

**Testing:**
```
1. Admin enables killswitch with message "Restricted for audit"
2. User tries to paste API key in ChatGPT → modal appears with message
3. User tries to use Claude Desktop → scan tool returns error
4. User tries CLI → returns error
5. Audit log shows 3 blocked attempts
6. Admin disables killswitch
7. User can paste/scan again
```

**Estimated effort:** 8–10 hours

---

### Task 5.3: Killswitch Exemptions (Advanced)

**What to build (if demand justifies):**

Allow certain users/groups to bypass killswitch:

```javascript
{
  "killswitch": {
    "enabled": true,
    "exemptions": [
      {
        "type": "user",
        "identifier": "alice@company.com",  // Email or username
        "reason": "Security analyst investigating incident"
      },
      {
        "type": "group",
        "identifier": "security-team",  // LDAP group
        "reason": "Authorized to use AI for threat research"
      }
    ]
  }
}
```

**Implementation:**
- Check user identity (from OS login or LDAP)
- If user in exemption list, allow AI tools even when killswitch on
- Audit log records: "User alice@company.com exempted from killswitch"

**Estimated effort:** 4–6 hours (Phase 5.3, lower priority)

---

## Timeline Summary

| Phase | Duration | Key Milestones |
|-------|----------|---|
| Phase 1.1 | Weeks 1-2 | Chrome + Firefox launch, Web Store + Mozilla approval |
| Phase 1.2 | Weeks 2-3 | Edge + Opera, all browser inputs, address bar protection |
| Phase 2 | Weeks 4-6 | Audit log, policies, unmasking live; v2.4.0 release |
| Phase 3 | Weeks 7-9 | Pattern suggestions, false positive tuning |
| Phase 4 | Weeks 10-12 | Response scanning, bidirectional protection |
| Phase 5.1 | Weeks 13-15 | Central policy server, enterprise audit sink |
| Phase 5.2 | Weeks 15-17 | AI killswitch, admin enforcement, modal UI |
| Phase 5.3 | Weeks 18-20 | Killswitch exemptions, group-based access control |

---

## Code Quality Standards

For all phases:

1. **Tests first (or alongside)**
   - New feature → write test → implement → test passes
   - Maintain >80% test coverage
   - All tests must pass before merge

2. **Documentation**
   - Code comments for non-obvious logic
   - Docstrings for public functions
   - README for new modules

3. **Performance**
   - Redaction: <10ms on typical paste
   - Audit writes: <5ms
   - Startup: <500ms
   - No memory leaks (check with DevTools)

4. **Security**
   - No raw sensitive values in logs
   - Regex validated for backtracking
   - Input capped at 50KB
   - No network calls on hot path

---

## Review Checklist (Per PR)

Before merging:

- [ ] All tests pass (`npm test`)
- [ ] No console errors or warnings
- [ ] New features have tests
- [ ] Code reviewed by one other person
- [ ] Commit message references phase/task (e.g., "Phase 2.1: Audit log schema")
- [ ] No sensitive data in diff
- [ ] Performance impact documented (if any)