# Maskit — Product Requirements Document

## 1. Problem Statement

Users paste customer data, API keys, secrets, and regulated information into ChatGPT, Gmail, Claude Desktop, and IDEs without realizing the risk. There is no lightweight, local-first DLP layer that catches this before text leaves the device. Existing solutions are either cloud-dependent, enterprise-only, or too broad.

## 2. Pitch

**Maskit prevents accidental data leaks before sensitive text leaves the user's device.** It detects risky content locally and redacts it before submission. Private by default, fast, and invisible when safe, it becomes immediately helpful when a user is about to expose sensitive data.

## 3. Product Goal

Maskit is a local-first privacy layer for text entry into AI tools and email. The product must work without sending raw content to a cloud service in normal mode, and it must be understandable in one sentence by non-technical users.

## 4. Architecture

```text
engine/index.js (shared core)
       |
  +----+----------------+
  |                     |
browser extension    mcp-server/
(chrome MV3)         (Claude Desktop, MCP-capable apps)
```

One detection engine, multiple surfaces. All local. No cloud.

## 5. v1 Scope

### 5.1 Shared Detection Engine (`engine/`)

The shared engine is the core of Maskit. It detects email, phone, credit card numbers with Luhn validation, SSNs, high-value API keys, and custom regex rules. It provides risk scoring from 0 to 100, severity levels, redaction formats, and false-positive guards.

v1 public API:
- `scanText()`
- `redactText()`
- `evaluatePolicy()`
- `getRules()`
- `updateRules()`
- `getStatus()`

Redaction formats:
- Tagged.
- Stars.
- Custom user-defined text.

v1 API key patterns:
- OpenAI (`sk-...`).
- GitHub (`ghp_...`, `github_pat_...`).
- AWS (`AKIA...`).
- Google (`AIza...`).
- Stripe (`sk_live_...`, `pk_test_...`).
- Bearer tokens.
- Config assignments such as `api_key=` and `secret_key:`.

Everything else, including Azure, DigitalOcean, Twilio, Datadog, SendGrid, and broader cloud-key catalogs, ships later.

### 5.2 Chrome Extension

The browser extension protects ChatGPT and Gmail only in v1. It intercepts paste, copy, and typing events, supports rich text editors, and provides an ON / PAUSED / OFF state with a traffic light widget, pause controls, and a review-before-redact dialog.

It must include:
- Site allowlist / blocklist.
- Per-site toggle.
- Auto-resume pause.
- Toolbar popup.
- Settings page.
- Data type toggles.
- Custom rules.
- Redaction format selection.
- Local-only processing.
- Narrow host permissions.

### 5.3 Claude Desktop MCP Server

The MCP server is the desktop integration layer for Claude Desktop and other MCP-capable apps. In v1, it exposes six tools:
- `scan_text`
- `redact_text`
- `evaluate_policy`
- `get_status`
- `get_rules`
- `update_rules`

It must use stdio transport and support OS-specific config file locations. Claude Desktop support should be documented using the local MCP pattern and desktop-extension workflow supported by Claude's tooling.

### 5.4 Testing

The first release must include:
- 50+ engine tests.
- 28+ browser extension tests.
- 15+ MCP server tests.

All tests should pass before v1 release.

### 5.5 Documentation

The following documents are required:
- `BUILD.md` — architecture, build, install.
- `SECURITY.md` — threat model and data handling.
- `mcp-server/README.md` — setup guide.
- `FEATURES.md` — feature inventory.

## 6. Deferred to v2

The following are optional adapters and should not block v1:
- HTTP server for custom integrations.
- CLI tool for scripts.
- Cursor / IDE-specific support.
- Discord bot integration.
- Slack bot integration.
- GitHub Action integration.
- Express.js middleware.
- Additional cloud-key patterns beyond v1.
- Shared config import/export between browser and MCP server.

## 7. Deferred to v3

Enterprise and fleet features are intentionally out of scope for v1:
- Audit trail events beyond local storage.
- Onboarding wizard.
- Rule preview panel.
- Conflict resolution for overlapping rules.
- Test mode.
- Enterprise policy export and rule packs.
- Fleet management.
- Cloud account monitoring.
- SIEM integration.
- Multi-tenant admin console.
- Compliance reporting.

## 8. Acceptance Criteria

### 8.1 Engine
- `scanText()` returns findings, `redactedText`, `riskScore`, `riskLevel`, and `matchedRules`.
- `redactText()` returns `redactedText` and findings.
- `evaluatePolicy()` returns `allowed`, findings, `riskScore`, and reason.
- Risk score caps at 100.
- Severity levels are weighted and mapped consistently.
- All v1 detection types work with false-positive guards.
- Custom regex rules are validated for length and safety.
- 50+ tests pass.

### 8.2 Browser Extension
- Scans paste, copy, and typing events.
- Works on ChatGPT and Gmail.
- ON / PAUSED / OFF badge updates correctly.
- Traffic light widget shows status.
- Review-before-redact dialog works.
- Site allowlist / blocklist works.
- Pause with auto-resume works.
- Settings save and load correctly.
- No network requests are required for content scanning.
- 28+ tests pass.

### 8.3 MCP Server
- Six tools are registered and callable.
- Stdio transport works with Claude Desktop.
- Config file read/write works.
- 15+ tests pass.
- Claude Desktop can discover and invoke tools through local MCP configuration.

## 9. Build Phases

### Phase 1: Shared Engine
- Extract detector and sanitizer into `engine/`.
- Add risk scoring and severity mapping.
- Add v1 API key patterns.
- Write engine tests.
- Exit criteria: 50+ tests passing.

### Phase 2: Chrome Extension
- Wire the extension to the shared engine.
- Confirm ChatGPT and Gmail support.
- Add traffic light widget, pause behavior, and settings.
- Exit criteria: 28+ tests passing.

### Phase 3: MCP Server
- Build the MCP server with six tools.
- Add config file management.
- Document Claude Desktop setup.
- Exit criteria: 15+ tests passing.

### Phase 4: Documentation
- Complete BUILD.md.
- Complete SECURITY.md.
- Create mcp-server/README.md.
- Create FEATURES.md.
- Exit criteria: docs complete.

### Phase 5: Polish
- Run the full suite.
- Verify all acceptance criteria.
- Update PLAN.md.
- Exit criteria: 93+ tests passing.

## 10. Non-Goals

v1 does not include:
- Fleet management.
- Cloud account monitoring.
- SIEM replacement.
- EDR functionality.
- Multi-tenant admin console.
- Complex compliance reporting.
- HTTP server mode.
- CLI tool.
- Bot integrations.
- Enterprise policy sync.

## 11. Success Metrics

The release is successful if:
- Users can protect data in ChatGPT, Gmail, and Claude Desktop.
- Redaction happens locally and reliably.
- The product is understandable in one sentence.
- Users trust the privacy model.
- 93+ tests pass.
- Chrome permissions stay minimal and privacy-friendly.

## 12. Product Summary

Maskit is a local-first privacy layer that stops sensitive text from leaving your device in ChatGPT, Gmail, Claude Desktop, and other supported MCP-capable apps.