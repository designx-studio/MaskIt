# Session Changes — Production Stabilization (2026-07-28)

This document records the engineering work completed in the MaskIt production stabilization sessions on 2026-07-28. It is a change log of **what was implemented**, not a readiness audit.

| Field | Value |
|-------|--------|
| **Branch** | `main` |
| **Version** | `2.4.0` |
| **Commits** | `3967d10` (browser/CLI/MCP stabilization), `3b6c648` (Windows agent package + pipeline) |
| **Remote** | `https://github.com/designx-studio/MaskIt.git` |

---

## Goals

1. Canonical audit event migration across all adapters  
2. One shared rule-loading architecture  
3. Removal of incomplete unmask functionality  
4. Real packaged browser E2E tests  
5. Production release artifacts with verification  
6. **Windows agent production package** (remaining gap after browser/CLI/MCP)

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
| `maskit-agent/.../AuditLogger.cs` | Canonical camelCase JSONL; no unmask/raw fields; chain hash |
| `maskit-core/audit-schema/event.json` | Aligned to canonical schema (no unmask properties) |

### Verification

- `npm run test:canonical-events`
- `npm run test:adapter-events`
- Parity tests assert every engine event validates and stores no raw values
- Windows `--scan --json` and `--self-test` emit schema 1.0 events with hashes only

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

- **Node detector** loads the shared bundle via `loadRuleBundle()`.
- **Browser detector** consumes `MASKIT_RULE_BUNDLE` (or falls back to `rule-loader` when required from Node in tests).
- **Windows `RuleEngine`** loads `pii.json` / `financial.json` / `secrets.json` in the same order; normalizes `API_KEY_*` → finding type `API_KEY` (rule id preserved on `Finding.Name` / event `ruleId`).
- Finding types stay consistent across adapters for policy toggles.

### Files

| File | Change |
|------|--------|
| `engine/rule-loader.js` | Cacheable loader, `enabledTypeForRule`, `findingTypeForRule`, `ruleVersion` |
| `engine/detector.js` | Full rewrite onto shared rules |
| `detector.js` | Shared-bundle consumer with Node/browser dual load |
| `browser-rules.js` | Regenerated from maskit-core (40 rules) |
| `maskit-agent/.../RuleEngine.cs` | Stable file order, API_KEY normalization, match timeout |
| `parity-test.js` | Engine ↔ browser finding parity + canonical event checks |

### Verification

- `npm test` (includes parity)
- `npm run test:regex` (ReDoS checks on **shared rule JSON only**)
- `Maskit.Agent.exe --parity` (shared fixtures against packaged rules)

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

## 5. Release artifacts (browser, CLI, MCP)

### Problem

Build did not always produce CLI package, checksums, or version metadata. Clean-install and release validators assumed artifacts that were incomplete or non-portable on Windows (e.g. `zip`/`unzip` only).

### Solution

`scripts/build.js`:

1. Generates browser rules from `maskit-core`  
2. Builds Chrome / Edge / Firefox / Opera / generic extension ZIPs (MV3, includes `browser-rules.js` + `context-event.js` + `VERSION.json`)  
3. Builds **CLI** tarball (`maskit-cli.tar.gz`) with self-contained requires  
4. Builds **MCP** tarball (`maskit-mcp.tar.gz`)  
5. Invokes Windows agent packaging when .NET 8 SDK is available  
6. Writes `dist/SHA256SUMS.txt` and `dist/RELEASE-METADATA.json`  
7. Uses `zip` when available, otherwise PowerShell `Compress-Archive`  

Verification scripts updated for Windows (`tar` fallback for ZIP listing/extract) and for CLI exit code `1` when findings exist (expected).

---

## 6. Windows agent production package

### Problem

After browser/CLI/MCP completion, the remaining production gap was the **Windows agent release**: no reliable self-contained package, weak clean-install proof, incomplete parity with other adapters, and CI/release that did not always produce `maskit-windows-agent.zip` with checksums.

### Solution

#### Agent runtime

| Capability | Implementation |
|------------|----------------|
| Rules | Packaged `publish/maskit-core/rules` next to exe (no repo path required) |
| Policy | Loads `maskit-core/policy/defaults.json` + `contexts.json` |
| Events | Canonical schema only; camelCase JSONL audit log |
| Unmask | None |
| Tray | Default interactive mode (`Application.Run`) |
| Headless | `--scan`, `--self-test`, `--parity`, `--help` |

#### Package layout (`maskit-windows-agent.zip`)

```
README.md
VERSION.json
parity-fixtures.json
publish/
  Maskit.Agent.exe          # self-contained win-x64 single-file
  maskit-core/
    rules/*.json
    policy/*.json
    audit-schema/*.json
  VERSION.json
  parity-fixtures.json
```

#### Build

```bash
npm run build:windows   # → dist/maskit-windows-agent.zip
# or
npm run build           # full release set including Windows when SDK present
```

`scripts/build-windows-agent.js`:

- Resolves `dotnet` from `PATH`, `DOTNET_ROOT`, or `%LOCALAPPDATA%\dotnet`
- `dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true`
- Asserts required files, writes metadata, zips staging tree

#### Clean-install verification

`scripts/verify-windows-package.js`:

1. Requires `dist/maskit-windows-agent.zip` when `MASKIT_REQUIRE_WINDOWS_ARTIFACT=1`  
2. Lists ZIP; checks README, VERSION, exe, rules, policy  
3. Extracts to a temp directory  
4. On Windows: runs `--self-test` and `--scan ... --json`  
5. Asserts canonical events (schema, source `windows`, 64-char hash, no raw/unmask fields)  
6. Confirms rules resolve from packaged tree (no monorepo dependency)

#### Cross-adapter parity

`scripts/verify-cross-adapter-parity.js`:

- Same `parity-fixtures.json` inputs for browser, CLI/engine, MCP, and Windows (when binary present)
- Compares `dataType`, confidence, risk, policy result, action (and rule id when aligned)
- Only `source` / `application` are allowed to differ by design

#### CI / release

| Workflow | Change |
|----------|--------|
| `.github/workflows/ci.yml` | `windows-agent` job on `windows-latest`: build ZIP, require artifact, package verify, `--parity`, cross-adapter parity, upload artifact |
| `.github/workflows/release.yml` | Runs on `windows-latest` with Node + .NET 8; `npm run build` produces full set including Windows agent; attaches ZIP + SHA256SUMS + RELEASE-METADATA to GitHub Release |

### Files

| File | Change |
|------|--------|
| `scripts/build-windows-agent.js` | **New** publish + package |
| `scripts/verify-windows-package.js` | Structure + clean-install runtime checks |
| `scripts/verify-cross-adapter-parity.js` | **New** multi-adapter parity |
| `scripts/build.js` | Integrates Windows package when SDK available |
| `scripts/verify-release-artifacts.js` | Windows ZIP checks (not browser `manifest.json`) |
| `package.json` | `build:windows`, `test:cross-adapter-parity` |
| `maskit-agent/Maskit.Agent/Program.cs` | Headless modes + tray entry |
| `maskit-agent/.../RuleEngine.cs`, `MaskitCoreService.cs`, `AuditLogger.cs`, `Config.cs`, `PolicyEngine.cs`, `CoreParityTests.cs`, `TrayApplication.cs` | Production alignment |
| `maskit-agent/README.md` | Package layout and modes |
| `.gitignore` | Ignore `**/bin/`, `**/obj/` |

### Verification (executed)

| Command | Result |
|---------|--------|
| `npm run build:windows` | Pass |
| `Maskit.Agent.exe --parity` | Pass (0 failed) |
| `MASKIT_REQUIRE_WINDOWS_ARTIFACT=1 npm run test:windows-package` | Pass (structure + self-test + scan) |
| `npm run test:cross-adapter-parity` | Pass (9 fixtures; 8 compared live on Windows) |
| `npm run build` | Pass (full set including Windows) |
| `npm run test:release-artifacts` | Pass (8 artifacts + SHA-256) |

---

## Final release set (RC, version 2.4.0)

| Artifact | Role |
|----------|------|
| `maskit-chrome.zip` | Production Chrome extension |
| `maskit-edge.zip` | Edge |
| `maskit-firefox.zip` | Firefox |
| `maskit-opera.zip` | Opera |
| `maskit-extension.zip` | Generic browser package |
| `maskit-cli.tar.gz` | CLI outside monorepo |
| `maskit-mcp.tar.gz` | MCP + engine + maskit-core |
| `maskit-windows-agent.zip` | Self-contained Windows tray agent |
| `SHA256SUMS.txt` | Per-file SHA-256 |
| `RELEASE-METADATA.json` | Version, build time, artifact list |

### SHA-256 (final build this session)

```
d86bead6169c20d22a826852466bc6f8e1e01bb8c6e8f80bee04946b9457c836  maskit-chrome.zip
cb707d68ffcee6f9f48ed7a4c904d908ae58aa8d334d60fff8c3c8187067e246  maskit-edge.zip
b9ebda21c479e653025479608f7375242699b36e0ed1378b3605016fbf4ccce1  maskit-firefox.zip
00a100cbf7f81c97d1712956f2b138c964a9124cca609a0b61de028c6cd05fa2  maskit-opera.zip
54c55e75a31bdfa857ca5b8ee478fd8f75b261287f71830979f363eecb242775  maskit-extension.zip
1ece2d47d74982d99a1fbb761f7322851180ca73518b46f628673956b820e7b5  maskit-cli.tar.gz
4d26d1e15f9893f38ee39da0d711fac3c941590f7e709810783414dff46701b3  maskit-mcp.tar.gz
6ab76dc13b78ac64b5ed018c1d39628805e8b52b0896096d0f86ff62fee356d0  maskit-windows-agent.zip
```

Rebuild with `npm run build` (requires .NET 8 SDK for the Windows artifact) refreshes these hashes.

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
| `npm run test:cross-adapter-parity` | Pass |
| `npm run build` | Pass (browser + CLI + MCP + Windows) |
| `npm run test:release-artifacts` | Pass |
| `npm run test:clean-install` | Pass (CLI + MCP) |
| `npm run check:browser-artifact` | Pass |
| `npm run test:e2e:chromium` | Pass (Edge full extension load) |
| `npm run test:windows-package` | Pass (required artifact on this host) |
| `Maskit.Agent.exe --parity` | Pass |

---

## Remaining limitations (honest)

These are environment or ops gaps, not missing adapter design:

1. **Code signing** — artifacts have checksums, not Authenticode / release signatures (no signing identity).  
2. **Chrome-channel E2E** — full load failed to expose a service worker; Edge succeeded. Packaged-surface fallback remains.  
3. **Tray/clipboard desktop smoke in CI** — clean-install proves headless `--self-test` / `--scan`, not interactive tray under a logged-in desktop session.  
4. **Custom rules via Windows `--scan` CLI** — custom fixture is covered by in-process `--parity`; not by headless `--scan` flags.

---

## File inventory (session)

### New

- `context-event.js`
- `docs/session-changes-2026-07-28.md` (this file)
- `scripts/build-windows-agent.js`
- `scripts/verify-cross-adapter-parity.js`

### Substantially rewritten / major edits

- `engine/context.js`, `engine/detector.js`, `engine/index.js`, `engine/rule-loader.js`, `engine/settings.js`
- `detector.js`, `background.js`, `content.js`, `manifest.json`
- `scripts/build.js`, `scripts/e2e-chromium.js`
- `scripts/verify-release-artifacts.js`, `scripts/verify-clean-install.js`, `scripts/verify-windows-package.js`, `scripts/check-browser-artifact.js`, `scripts/validate-regex-safety.js`
- `parity-test.js`, `test.js`, `defaults-sync-test.js`, `engine/test.js`
- Windows agent: `Program.cs`, `RuleEngine.cs`, `MaskitCoreService.cs`, `AuditLogger.cs`, `Config.cs`, `PolicyEngine.cs`, `CoreParityTests.cs`, `TrayApplication.cs`, `Maskit.Agent.csproj`
- `maskit-core/audit-schema/event.json`
- Docs: `engineering-stabilization.md`, `security-model.md`, `docs/index.html`, `maskit-agent/README.md`
- CI: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- `package.json` / `package-lock.json`, `.gitignore`

---

## Product behaviour after this session

| Area | Behaviour |
|------|-----------|
| Detection rules | One source of truth: `maskit-core/rules` |
| Audit | Canonical schema only; irreversible hash; no raw secrets |
| Unmask | Not supported in v1 |
| Browser protection | MV3 extension with shared rules + context events |
| CLI / MCP | Runnable from extracted release tarballs |
| Windows agent | Self-contained tray agent + headless scan/self-test/parity |
| Release RC | Browser ZIPs + CLI + MCP + Windows agent + checksums + metadata |

---

## How to reproduce verification

```bash
npm ci
npm test
npm run test:regex
npm run test:canonical-events
npm run test:adapter-events
npm run test:stabilization
npm run test:cross-adapter-parity
npm run build
npm run test:release-artifacts
npm run test:clean-install
npm run check:browser-artifact
npm run test:e2e:chromium
```

Windows agent (requires .NET 8 SDK on the build host):

```bash
npm run build:windows
# or included automatically in npm run build when SDK is present

set MASKIT_REQUIRE_WINDOWS_ARTIFACT=1   # PowerShell: $env:MASKIT_REQUIRE_WINDOWS_ARTIFACT=1
npm run test:windows-package
npm run test:cross-adapter-parity
```

Headless agent checks after extract:

```powershell
.\publish\Maskit.Agent.exe --self-test
.\publish\Maskit.Agent.exe --scan "email test@example.com" --json
.\publish\Maskit.Agent.exe --parity
```
