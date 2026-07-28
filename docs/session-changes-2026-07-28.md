# Session Changes — Production Stabilization (2026-07-28)

This document records the engineering work completed in the MaskIt final production stabilization session. It is a change log of **what was implemented**, not a readiness audit.

**Commit:** `3967d10479ca36aa58ea0aeff374906b4321e23e`  
**Branch:** `main` (pushed to `origin`)  
**Version:** `2.4.0`

---

## Goals

Complete remaining production work for MaskIt:

1. Canonical audit event migration across all adapters  
2. One shared rule-loading architecture  
3. Removal of incomplete unmask functionality  
4. Real packaged browser E2E tests  
5. Production release artifacts with verification  

Do **not** stop at validators or reports — implement working behaviour, run tests, and ship a release candidate.

---

## 1. Canonical event migration

### Problem

Adapters created different audit shapes. The browser content script built legacy objects (`id`, `type`, `severity`, `unmaskToken`, …). The Node engine created legacy events then rewrote them. Windows partially mapped fields and still carried unmask aliases.

### Solution

**Single canonical builder:**

| Surface | Builder |
|---------|---------|
| Node / MCP / CLI | `engine/context.js` → `createContextEvent` / `createEventFromFinding` |
| Browser (content + background) | `context-event.js` (browser-safe mirror, no Node `crypto`) |
| Windows agent | `MaskitCoreService` emits full canonical `CoreAuditEvent`; clipboard monitor maps 1:1 into `AuditEvent` |

**Every event now includes:**

- `schemaVersion` (`1.0`)
- `eventId`
- `timestamp` (ISO-8601)
- `source` (`browser` | `windows` | `cli` | `mcp` | `ci` | `gateway`)
- `application`
- `user` / `device` (nullable when unavailable)
- `dataType`
- `confidence`
- `risk`
- `policy` (`name`, `version`, `result`)
- `action`
- `explanation`
- `ruleId` (when known)
- `matchedValueHash` only (SHA-256 of the raw value — **never** the raw value)

### Files

| File | Change |
|------|--------|
| `engine/context.js` | Expanded builder, validation (rejects raw values and unmask fields), `createEventFromFinding`, source normalization |
| `engine/detector.js` | Emits canonical events via `createEventFromFinding` only |
| `engine/index.js` | Validates/rebuilds events if a producer drifts |
| `engine/settings.js` | **Removed** `createAuditEvent`; ISO-aware `pruneAuditLog` |
| `context-event.js` | **New** browser content-script event builder + sync SHA-256 |
| `content.js` | `generateAuditEvents` uses `createEventFromFinding` |
| `background.js` | Stores/normalizes canonical events; migrates legacy on read; chain hash uses `eventId` |
| `manifest.json` | Loads `context-event.js` before detector/content |
| `mcp-server/cli.js` | Passes `_context: { source: "cli", app: "maskit-cli" }` |
| `maskit-agent/.../MaskitCoreService.cs` | Full canonical event fields + normalized `windows` source |
| `maskit-agent/.../ClipboardMonitor.cs` | Maps Core → Audit 1:1 (no legacy field aliases) |
| `maskit-agent/.../AuditLogger.cs` | Dropped unmask / legacy JsonIgnore aliases |
| `maskit-core/audit-schema/event.json` | Aligned to canonical schema (no unmask properties) |

### Verification

- `npm run test:canonical-events`
- `npm run test:adapter-events`
- Parity tests assert every engine event validates and stores no raw values

---

## 2. One runtime rule engine

### Problem

Browser, Node, and Windows loaded rules differently. Node `engine/detector.js` still used **hardcoded** regex maps, while the browser used generated `browser-rules.js` from `maskit-core/rules`, and Windows loaded the same JSON files independently. Behaviour could diverge when rules changed.

### Solution

```
maskit-core/rules/*.json
        │
        ├─► engine/rule-loader.js  ──► Node / MCP / CLI (engine/detector.js)
        ├─► scripts/generate-browser-rules.js ──► browser-rules.js ──► browser detector.js
        └─► Windows RuleEngine.LoadRules(rulesPath) ──► agent
```

- **Node detector** no longer embeds PII/API key pattern tables; it loads the shared bundle via `loadRuleBundle()`.
- **Browser detector** consumes `MASKIT_RULE_BUNDLE` (or falls back to `rule-loader` when required from Node in tests).
- Finding types stay consistent: `API_KEY_*` rules map to type `API_KEY` for settings/policy toggles; `ruleName` retains the specific rule id.
- `getRules()` / `getStatus()` report shared rule version and counts.

### Files

| File | Change |
|------|--------|
| `engine/rule-loader.js` | Cacheable loader, `enabledTypeForRule`, `findingTypeForRule`, `ruleVersion` |
| `engine/detector.js` | Full rewrite onto shared rules |
| `detector.js` | Shared-bundle consumer with Node/browser dual load |
| `browser-rules.js` | Regenerated from maskit-core (40 rules) |
| `parity-test.js` | Engine ↔ browser finding parity + canonical event checks |

### Verification

- `npm test` (includes parity)
- `npm run test:regex` (ReDoS checks on **shared rule JSON only**)

---

## 3. Remove incomplete unmask functionality

### Problem

Unmask was partially implemented: UI banner that did not restore values, background handlers that stored plaintext tokens, schema/docs claiming audited unmask. That is unsafe product surface for v1.

### Decision

**Remove**, do not finish. MaskIt v1 behaviour is:

> **Detect → Warn / Block / Mask → Audit**

### Removed / cleaned

| Area | What changed |
|------|----------------|
| `content.js` | Deleted `showUnmaskButton`, `showUnmaskToast`, unmask fields on events |
| `background.js` | Deleted `UNMASK_VALUE` / `GET_UNMASKED_VALUE`, `unmaskStore`, `recordUnmask` |
| `engine/settings.js` | No `unmaskToken` / `unmaskedAt` / `unmaskedDuration` on events |
| Windows `AuditEvent` | Removed unmask aliases |
| Schema | `event.json` no longer documents unmask |
| Docs | `docs/security-model.md`, `docs/engineering-stabilization.md`, `docs/index.html` updated |

### Verification

- `test.js` asserts content/background source no longer contain unmask UI/handlers
- Canonical validators reject events that still carry unmask fields

---

## 4. Real browser E2E tests

### Problem

`scripts/e2e-chromium.js` previously only listed ZIP contents (preflight), not runtime behaviour.

### Solution

Playwright-based packaged extension E2E:

1. Ensure `npm run build` artifacts exist  
2. Stage `dist/maskit-chrome-e2e` from the production Chrome package (adds `http://127.0.0.1/*` for the fixture host only — **production ZIP is unchanged**)  
3. Launch Chromium via system **Chrome** or **Edge** (`channel`), with `--load-extension` and Chrome 137+ flag `DisableLoadExtensionCommandLineSwitch`  
4. Serve a local AI-like fixture page  
5. Enter sensitive fixture email  
6. Confirm masking  
7. Open packaged `popup.html` and confirm UI  

**Fallback:** if OS/browser blocks extension load, a packaged-file surface path injects the real dist scripts under a `chrome.*` mock and still proves detect → mask → audit → popup.

**Failure artefacts:** `dist/e2e-failures/` (logs + screenshots).

### Files

| File | Change |
|------|--------|
| `scripts/e2e-chromium.js` | Full rewrite |
| `package.json` | `playwright@1.49.1` devDependency; `test:e2e:chromium` script |

### Observed on this host

- System Chrome: service worker not visible after load  
- **Microsoft Edge: full extension load succeeded**; paste of `secret.user@example.com` became `Contact me at *** for access`; popup rendered  

---

## 5. Release artifacts

### Problem

Build did not always produce CLI package, checksums, or version metadata. Clean-install and release validators assumed artifacts that were incomplete or non-portable on Windows (e.g. `zip`/`unzip` only).

### Solution

`scripts/build.js` now:

1. Generates browser rules from `maskit-core`  
2. Builds Chrome / Edge / Firefox / Opera / generic extension ZIPs (MV3, includes `browser-rules.js` + `context-event.js` + `VERSION.json`)  
3. Builds **CLI** tarball (`maskit-cli.tar.gz`) with self-contained requires  
4. Builds **MCP** tarball (`maskit-mcp.tar.gz`)  
5. Writes `dist/SHA256SUMS.txt` and `dist/RELEASE-METADATA.json`  
6. Uses `zip` when available, otherwise PowerShell `Compress-Archive`  

Verification scripts updated for Windows (`tar` fallback for ZIP listing/extract) and for CLI exit code `1` when findings exist (expected).

### Artifact set (RC, version 2.4.0)

| Artifact | Role |
|----------|------|
| `maskit-chrome.zip` | Production Chrome extension |
| `maskit-edge.zip` | Edge |
| `maskit-firefox.zip` | Firefox |
| `maskit-opera.zip` | Opera |
| `maskit-extension.zip` | Generic browser package |
| `maskit-cli.tar.gz` | CLI outside monorepo |
| `maskit-mcp.tar.gz` | MCP + engine + maskit-core |
| `SHA256SUMS.txt` | Per-file SHA-256 |
| `RELEASE-METADATA.json` | Version, build time, artifact list |

### SHA-256 (this session’s final build)

```
c8e30d9bbfd74f45e85ce9248418c4a8b40f9b726b92cbc0f456aa839abed265  maskit-chrome.zip
bcb73828b739b2af62e249c4b1d64771eff23dbe555b9c2de91527ac6642ef25  maskit-edge.zip
4cde17901a16de73d005e1ef0d006f77bbc3cae373a0312f38c8f09fe40687f8  maskit-firefox.zip
33eea9d5698ea7657af44afd40a5e6e9a07fb54146d1d25e70d8c95b0f846df3  maskit-opera.zip
9240bea821c09c0cfcb1c41a0dd274fb325a5ec8c451ce6625232270a17c40cc  maskit-extension.zip
879aac0ad605d0015c940b60e172ef2239eb2b3c07358cb76d9af2050f7f976e  maskit-cli.tar.gz
ab0ab1b54a2de8c620e06b5ecafeeef0bf184edddb24dd6bff616c2c6a6123c0  maskit-mcp.tar.gz
```

Rebuild with `npm run build` refreshes these hashes.

### Verification

- `npm run test:release-artifacts`
- `npm run test:clean-install` (CLI + MCP extract-and-run outside the repo)
- `npm run check:browser-artifact`
- `npm run test:windows-package` — **skipped** when `maskit-windows-agent.zip` is absent

---

## Tests run this session

| Command | Result |
|---------|--------|
| `npm test` | Pass |
| `npm run test:regex` | Pass |
| `npm run test:canonical-events` | Pass |
| `npm run test:adapter-events` | Pass |
| `npm run test:stabilization` | Pass |
| `npm run test:browser-surface` | Pass |
| `npm run build` | Pass |
| `npm run test:release-artifacts` | Pass |
| `npm run test:clean-install` | Pass |
| `npm run check:browser-artifact` | Pass |
| `npm run test:e2e:chromium` | Pass (Edge full extension load) |
| `npm run test:windows-package` | Skipped (no agent ZIP / no .NET SDK) |

---

## Remaining environment limitations

These were **attempted** and left incomplete only because of the host, not missing product design:

1. **Windows agent binary package** — .NET 8 SDK was not installed; agent source was updated for canonical events but `maskit-windows-agent.zip` was not built here.  
2. **Chrome-channel E2E** — full load failed to expose a service worker; Edge succeeded. Packaged-surface fallback remains.  
3. **Code signing** — artifacts have checksums, not cryptographic signatures (no signing identity).  
4. **Playwright Chromium download** — CDN timed out; E2E uses system Chrome/Edge channels instead.

---

## File inventory (session)

### New

- `context-event.js`
- `docs/session-changes-2026-07-28.md` (this file)

### Substantially rewritten / major edits

- `engine/context.js`, `engine/detector.js`, `engine/index.js`, `engine/rule-loader.js`, `engine/settings.js`
- `detector.js`, `background.js`, `content.js`, `manifest.json`
- `scripts/build.js`, `scripts/e2e-chromium.js`
- `scripts/verify-release-artifacts.js`, `scripts/verify-clean-install.js`, `scripts/check-browser-artifact.js`, `scripts/validate-regex-safety.js`
- `parity-test.js`, `test.js`, `defaults-sync-test.js`, `engine/test.js`
- Windows agent audit/event mapping (`AuditLogger.cs`, `MaskitCoreService.cs`, `ClipboardMonitor.cs`)
- `maskit-core/audit-schema/event.json`
- Docs: `engineering-stabilization.md`, `security-model.md`, `docs/index.html`
- `package.json` / `package-lock.json` (Playwright + scripts)

---

## Product behaviour after this session

| Area | Behaviour |
|------|-----------|
| Detection rules | One source of truth: `maskit-core/rules` |
| Audit | Canonical schema only; irreversible hash; no raw secrets |
| Unmask | Not supported in v1 |
| Browser protection | MV3 extension with shared rules + context events |
| CLI / MCP | Runnable from extracted release tarballs |
| Release RC | Browser ZIPs + CLI + MCP + checksums + metadata |

---

## How to reproduce verification

```bash
npm ci
npm test
npm run test:regex
npm run test:canonical-events
npm run test:adapter-events
npm run test:stabilization
npm run build
npm run test:release-artifacts
npm run test:clean-install
npm run check:browser-artifact
npm run test:e2e:chromium
```

Optional (requires .NET 8 + Windows agent packaging pipeline):

```bash
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj -c Release
# then produce maskit-windows-agent.zip and:
npm run test:windows-package
```
