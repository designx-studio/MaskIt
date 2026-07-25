# Maskit — Platform Features

## 1. Maskit Browser (Chrome Extension v2.3.0)

### Detection & Redaction
- Email address detection (with false-positive filtering)
- Kenyan phone number detection (+254, 07xx formats)
- Credit card detection (13–16 digits, Luhn checksum validation)
- M-Pesa transaction code detection (mixed alphanumeric validation)
- US SSN detection (XXX-XX-XXXX format)
- IPv4 address detection (ignores version-like strings)
- Passport number detection (letters + digits, minimum length)
- IBAN bank account detection (country code + check digits)
- API key detection: OpenAI, Anthropic, Stripe, GitHub, GitLab, Slack, AWS, Google, npm, Square, Bearer tokens, config assignments
- Custom regex rules (up to 15, validated for catastrophic backtracking)
- Organization-specific patterns (via custom rules)
- Tagged redaction format: [EMAIL_REDACTED], [SSN_REDACTED], etc.
- Stars redaction format: ***
- Custom redaction format: user-defined text
- Redact automatically mode
- Warn-only mode
- Ask-before-redact confirmation dialog with masked preview (jo***om)
- Allow pattern for this session/site only

### Scan Modes
- Paste interception (blocks default paste, inserts redacted text)
- Copy interception (replaces clipboard contents with redacted text)
- Typing scan with debounce (beforeinput, keyup, input, focusout, compositionend)
- Rich text editor support (ChatGPT ProseMirror, Gmail compose)
- Each scan mode can be toggled independently

### Control & Safety
- Global on/off toggle
- ON / PAUSED / OFF tri-state badge
- Traffic light widget (Shadow DOM, top-right): green/amber/red status dot
- Site allowlist / blocklist (wildcard support: *.domain.com)
- Per-site toggle (Exclude page button in popup and traffic light)
- Temporary pause with auto-resume (configurable 5–300 seconds)
- Keyboard shortcuts: Alt+Shift+M (toggle), Alt+Shift+P (pause)
- Pause banner with countdown timer

### UI Surfaces
- Toolbar popup: quick toggle, live stats, current site status, traffic light, MCP status indicator
- Settings page: full configuration, custom rules, stats, import/export, shared config export/import
- Traffic light widget (hover panel with brand, status, pause, exclude actions)
- Toast notification after redaction
- Review dialog (optional pre-redaction confirmation overlay)

### Settings & Policy
- Data type toggles (9 built-in types, individually enable/disable)
- Custom regex rules (up to 15, validated)
- Site list mode: all / allowlist / blocklist
- Auto-resume pause (configurable timeout)
- Redaction format selection
- Custom redaction text
- Per-site policy
- Severity thresholds (critical / high / medium / low)

### Statistics
- Total redactions counter
- Count by source: paste, copy, typing
- Count by data type
- Resettable from Settings

### Import/Export
- Export browser settings as JSON
- Import browser settings from JSON
- Export shared config (for MCP server compatibility)
- Import shared config (syncs with MCP server format)

### Privacy
- Local-only processing (no cloud inference)
- No raw page content uploads
- No clipboard logs stored
- Narrow host permissions (ChatGPT + Gmail only)
- No network/clipboard/tabs permissions
- Settings sync via chrome.storage.sync (only config, never content)

---

## 2. Maskit Desktop (MCP Server)

### MCP Tools (6)
- scan_text — scan text for sensitive data, returns findings + risk score + redacted text + matched rules
- redact_text — scan and redact, returns redacted version with findings
- evaluate_policy — evaluate text against policy, returns allowed/denied + risk score + reason
- get_status — engine version, config path, rules count, enabled state
- get_rules — list all built-in rules with severity + custom rules
- update_rules — replace custom rules (validates patterns before accepting)

### Config Management
- OS-specific config file location (%APPDATA%\Maskit on Windows, ~/Library/Application Support/Maskit on macOS, ~/.config/maskit on Linux)
- Per-app policy overrides (claude-desktop, cursor, discord, slack, etc.)
- Default config with severity mapping for all data types
- Config round-trip (read/write with JSON)

### Integration Surfaces
- Claude Desktop (stdio MCP server via claude_desktop_config.json)
- Cursor IDE (MCP server via IDE settings)
- Any MCP-capable IDE

---

## 3. Maskit HTTP Server (Custom Integrations)

### Endpoints
- POST /scan — scan text for sensitive data (JSON body: {text, app?})
- POST /redact — scan and redact text (JSON body: {text, format?, app?})
- POST /policy — evaluate policy for text (JSON body: {text, app?})
- GET /status — engine status, version, port
- GET /rules — list active rules

### Features
- Runs on localhost:8765 (configurable via MASKIT_PORT env var)
- JSON request/response
- App-specific settings via app parameter
- Format override for redaction
- Binds to 127.0.0.1 only (not exposed to network)

---

## 4. Maskit CLI (Script Integration)

### Commands
- scan "text" — scan text for sensitive data
- scan-file ./file.txt — scan a file for sensitive data
- redact "text" — redact sensitive data from text
- risk "text" — check risk score of text

### Flags
- --json — output as JSON
- --compact — compact output (default for scan)
- --exit-on-risk — exit code 1 if findings found (for CI/CD gates)

### Exit Codes
- 0 = no sensitive data found
- 1 = sensitive data found (or error)

---

## 5. Shared Engine (Detection Core)

### Detection Types (9 built-in + 30+ cloud keys)
- EMAIL — email addresses
- PHONE — Kenyan phone numbers
- CARD — credit cards (Luhn validated)
- MPESA — M-Pesa codes
- SSN — US Social Security numbers
- IP_ADDRESS — IPv4 addresses
- PASSPORT — passport-style IDs
- BANK_ACCOUNT — IBAN bank accounts
- API_KEY — 30+ patterns:
  - OpenAI (sk-, sk-proj-)
  - Anthropic (sk-ant-)
  - Stripe (sk_live_, pk_test_, rk_live_)
  - GitHub (ghp_, github_pat_)
  - GitLab (glpat-)
  - Slack (xoxb-, xoxp-)
  - AWS (AKIA, aws_secret_access_key)
  - Google/GCP (AIza, ya29.)
  - npm (npm_)
  - Square (sq0atp-)
  - Bearer tokens
  - Config assignments (api_key=, secret_key:, access_token=)
  - Azure (connection strings, AD JWT tokens, subscription keys)
  - DigitalOcean (do_token_, dop_v1_)
  - Twilio (AC... SIDs)
  - Datadog (dd_, datadog_)
  - SendGrid (SG.)
  - Jira/Atlassian (atlassian_token, jira_api_key)
  - Terraform (TF_TOKEN_)
  - Docker (dckr_pat_)
  - Kubernetes (service account tokens)
  - Cloudflare (CF_, cloudflare_api_token_)
  - Auth0 (auth0|)
  - Firebase (FIREBASE_, firebase_api_key_)
  - Azure DevOps (AZDO_, azure_devops_token_)
  - GCP service account private keys
  - Generic cloud secrets (client_secret, private_key assignments)

### Risk Scoring
- Severity levels: critical (weight 50), high (25), medium (10), low (5)
- Risk score: 0–100, capped
- Risk level: low / medium / high / critical (thresholds: 0–9, 10–24, 25–49, 50+)

### Severity Mapping
| Type | Severity |
|------|----------|
| API_KEY | critical |
| CARD | critical |
| SSN | critical |
| BANK_ACCOUNT | critical |
| PASSPORT | high |
| IP_ADDRESS | high |
| EMAIL | medium |
| PHONE | medium |
| MPESA | low |
| CUSTOM | medium (configurable) |

### Public API
- scanText(text, settings) → { findings, redactedText, riskScore, riskLevel, matchedRules }
- redactText(text, settings) → { redactedText, findings }
- evaluatePolicy(text, settings) → { allowed, findings, riskScore, riskLevel, reason }
- getRules(settings) → { rules, customRules }
- updateRules(customRules, settings) → updated settings
- getStatus() → { version, engineReady, rulesEnabled }

### False-Positive Guards
- CARD: Luhn checksum required
- MPESA: mixed alphanumeric, 2–8 letters + 2–8 digits, not all same character
- IP_ADDRESS: ignores version-like strings (all octets < 12), ignores 127.x.x.x and 0.0.0.0
- PASSPORT: requires letters + digits, minimum 8 characters
- API_KEY: minimum length 20, Bearer token validation
- BANK_ACCOUNT: minimum length 15
- Custom regex: length limit 120 chars, catastrophic backtracking protection, max 15 rules
- Scan input capped at 50,000 characters

---

## 6. Integration Examples

- GitHub Action — scans git diffs for secrets before commit
- Express.js Middleware — scans request bodies, blocks or warns on findings
- Discord Bot — scans messages before sending to channels
- Slack Bot — scans messages before posting to channels

---

## 7. Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Browser extension (test.js) | 32 | All pass |
| Shared engine (engine/test.js) | 52 | All pass |
| MCP server (mcp-server/test.js) | 18 | All pass |
| **Total** | **102** | **All pass** |