# Maskit Platform Architecture & Technical Design

**Version:** 2.4.0  
**Classification:** Internal — Engineering Documentation  
**Audience:** Senior Developers, Security Engineers, Technical Leadership  
**Last Updated:** July 2026

---

# 1. Executive Overview

## 1.1 What Maskit Is

Maskit is a **local-first, real-time data loss prevention (DLP) platform** designed specifically for the age of AI. It intercepts sensitive data — API keys, credentials, PII, financial information — before it reaches AI models, cloud services, or any untrusted destination. All processing occurs on the user's machine. No data is ever transmitted to a remote server for analysis.

## 1.2 The Problem It Solves

The proliferation of AI tools (ChatGPT, Claude, Copilot, Gemini) has created a new class of data leakage risk. Developers paste API keys into chat prompts. Executives paste customer databases into AI assistants. Engineers commit credentials to AI-powered IDEs. Traditional DLP tools were designed for email and file transfer — they cannot intercept data flowing into a browser textarea or an AI chat interface.

Maskit solves this by operating **at the point of data entry**: the browser, the clipboard, the IDE, and the terminal.

## 1.3 Security Philosophy

Maskit's architecture is built on four principles:

1. **Local-first by default.** All detection, policy evaluation, and redaction happens on-device. No network calls for data analysis.
2. **Deterministic detection.** Regex-based pattern matching with validators. No ML models, no false-positive-prone heuristics for core detection.
3. **Defense in depth.** Multiple interception layers: browser events, clipboard monitoring, MCP protocol, and system-level hooks.
4. **Audit without exposure.** Sensitive values are never stored in plaintext. Audit logs use deterministic hashing for traceability without compromising secrets.

## 1.4 Why Local-First Processing Matters

| Aspect | Cloud DLP | Maskit (Local-First) |
|--------|-----------|---------------------|
| Data transit | Data sent to cloud for analysis | Data never leaves the machine |
| Latency | 100ms–2s network round-trip | <5ms local regex scan |
| Offline capability | Requires internet | Fully offline |
| Privacy | Third-party sees your data | No third-party visibility |
| Compliance | Data residency concerns | No data movement |

## 1.5 Maskit vs. Traditional DLP

Traditional DLP tools (Symantec, McAfee, Forcepoint) were designed for:

- Email gateway scanning
- Endpoint file monitoring
- Network traffic inspection
- USB device control

These tools cannot:

- Intercept data pasted into a browser contenteditable field
- Scan keystrokes in real-time inside an AI chat interface
- Operate as a browser extension with Manifest V3
- Integrate via the Model Context Protocol (MCP)

Maskit is purpose-built for the AI era. It is not a replacement for enterprise DLP — it is a **complementary layer** that addresses the AI data leakage gap.

## 1.6 Future Vision: AI Trust Layer

Maskit's long-term vision is to become the **universal trust layer for AI interactions**. This means:

- **Phase 1 (Current):** Browser extension + MCP server for individual developers
- **Phase 2 (In Development):** Windows system agent for clipboard-wide protection
- **Phase 3 (Planned):** IDE integrations (VS Code, JetBrains) for developer workflow protection
- **Phase 4 (Planned):** Organization dashboard for policy management and compliance reporting
- **Phase 5 (Planned):** Enterprise policy management with killswitch, role-based access, and SIEM integration

---

# 2. System Architecture Overview

## 2.1 Current Architecture

```mermaid
graph TB
    User([User]) --> Browser[Browser]
    Browser --> Extension[Maskit Browser Extension]
    
    subgraph "Browser Extension (Manifest V3)"
        ContentScript[Content Script<br/>content.js]
        ServiceWorker[Service Worker<br/>background.js]
        Popup[Popup UI<br/>popup.html/js]
        Options[Options Page<br/>options.html/js]
        
        ContentScript -->|paste/copy/typing events| DetectionEngine
        ServiceWorker -->|message routing| ContentScript
        ServiceWorker -->|storage| ChromeStorage[chrome.storage]
    end
    
    subgraph "Shared Detection Engine"
        DetectionEngine[Detection Engine<br/>engine/detector.js]
        SettingsEngine[Settings & Policy<br/>engine/settings.js]
        Rules[Detection Rules<br/>maskit-core/rules/]
        Policy[Policy Definitions<br/>maskit-core/policy/]
        
        DetectionEngine --> Rules
        DetectionEngine --> SettingsEngine
        SettingsEngine --> Policy
    end
    
    subgraph "MCP Server"
        MCPServer[MCP Server<br/>mcp-server/server.js]
        MCPConfig[MCP Config<br/>mcp-server/config.js]
        MCPServer --> DetectionEngine
        MCPServer --> MCPConfig
    end
    
    ClaudeDesktop[Claude Desktop] -->|stdio MCP| MCPServer
    IDEs[IDE Integrations] -->|MCP| MCPServer
    
    ContentScript --> DetectionEngine
    DetectionEngine -->|findings| ContentScript
    ContentScript -->|redacted text| Browser
    
    Browser --> AIServices[AI Services<br/>ChatGPT, Claude, Gemini, Copilot]
```

## 2.2 Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant ContentScript
    participant DetectionEngine
    participant PolicyEngine
    participant ServiceWorker
    participant Storage
    
    User->>Browser: Paste/Copy/Type data
    Browser->>ContentScript: DOM event (paste/copy/beforeinput)
    
    ContentScript->>DetectionEngine: detectSensitiveData(text, settings)
    DetectionEngine->>DetectionEngine: Match patterns (PII, API keys, financial)
    DetectionEngine->>DetectionEngine: Validate findings (Luhn, format checks)
    DetectionEngine->>DetectionEngine: Deduplicate findings
    DetectionEngine-->>ContentScript: findings[]
    
    ContentScript->>PolicyEngine: evaluatePolicy(text, settings)
    PolicyEngine->>PolicyEngine: selectPolicy(context)
    PolicyEngine->>PolicyEngine: getPolicyAction(type)
    PolicyEngine-->>ContentScript: {allowed, blocked, redacted}
    
    alt Blocked
        ContentScript->>Browser: preventDefault(), show warning
    else Redacted
        ContentScript->>ContentScript: sanitizeText(text, findings)
        ContentScript->>Browser: Insert redacted text
    else Allowed
        ContentScript->>Browser: Allow data through
    end
    
    ContentScript->>ServiceWorker: recordAuditEvents(events)
    ServiceWorker->>Storage: chrome.storage.local (audit log)
    ServiceWorker->>Storage: chrome.storage.sync (stats)
```

## 2.3 Trust Boundaries

```mermaid
graph LR
    subgraph "Trusted (Local Machine)"
        A[Browser Extension] --> B[Detection Engine]
        B --> C[Policy Engine]
        C --> D[Audit Log]
    end
    
    subgraph "Untrusted (External)"
        E[AI Services<br/>ChatGPT, Claude, etc.]
        F[Cloud Storage]
        G[Third-party APIs]
    end
    
    A -->|Redacted data only| E
    A -->|Redacted data only| F
    A -->|Redacted data only| G
    
    style A fill:#4CAF50
    style B fill:#4CAF50
    style C fill:#4CAF50
    style D fill:#4CAF50
    style E fill:#f44336
    style F fill:#f44336
    style G fill:#f44336
```

## 2.4 Future Architecture

```mermaid
graph TB
    subgraph "Maskit Platform (Future)"
        BrowserExt[Browser Extension]
        WindowsAgent[Windows Agent<br/>.NET]
        MCPServer[MCP Server]
        IDEs[IDE Plugins<br/>VS Code, JetBrains]
        CLITool[CLI Tool<br/>maskit-scan.sh]
        
        subgraph "Shared Core"
            DetectionEngine[Detection Engine]
            PolicyEngine[Policy Engine]
            AuditEngine[Audit Engine]
        end
        
        CloudDashboard[Cloud Dashboard<br/>Phase 4+]
        EnterpriseConsole[Enterprise Console<br/>Phase 5+]
    end
    
    BrowserExt --> DetectionEngine
    WindowsAgent --> DetectionEngine
    MCPServer --> DetectionEngine
    IDEs --> DetectionEngine
    CLITool --> DetectionEngine
    
    DetectionEngine --> PolicyEngine
    PolicyEngine --> AuditEngine
    
    AuditEngine -.->|Future: Sync| CloudDashboard
    CloudDashboard --> EnterpriseConsole
```

---

# 3. Repository Structure

```
Maskit/
├── engine/                          # Shared detection engine (Node.js)
│   ├── index.js                     # Public API — re-exports all engine functions
│   ├── detector.js                  # Core detection, redaction, policy evaluation
│   ├── settings.js                  # Settings, policy helpers, audit schema, killswitch
│   └── test.js                      # Engine unit tests
│
├── maskit-core/                     # Data definitions (rules, policies, schemas)
│   ├── README.md                    # Core documentation
│   ├── rules/
│   │   ├── pii.json                 # PII detection rules (email, phone, SSN, etc.)
│   │   ├── secrets.json             # API key/token detection rules (30+ providers)
│   │   └── financial.json           # Financial data detection rules
│   ├── policy/
│   │   ├── defaults.json            # Default policy actions per data type
│   │   └── contexts.json            # App-specific policy overrides
│   └── audit-schema/
│       └── event.json               # JSON Schema for audit events
│
├── mcp-server/                      # MCP protocol server
│   ├── server.js                    # MCP server (stdio transport)
│   ├── config.js                    # Config file management (OS-specific paths)
│   ├── cli.js                       # CLI wrapper for MCP server
│   ├── http-server.js               # HTTP server (alternative transport)
│   ├── test.js                      # MCP server tests
│   ├── package.json                 # Dependencies (MCP SDK)
│   ├── claude-desktop.json          # Claude Desktop config template
│   ├── README.md                    # MCP server documentation
│   └── integrations/
│       ├── github-action.js         # GitHub Actions integration
│       ├── express-middleware.js     # Express.js middleware
│       ├── discord-bot.js           # Discord bot integration
│       └── slack-bot.js             # Slack bot integration
│
├── maskit-agent/                    # Windows system agent (.NET)
│   ├── README.md                    # Agent documentation
│   └── Maskit.Agent/
│       ├── Program.cs               # Entry point, DI composition
│       ├── Maskit.Agent.csproj      # .NET project file
│       └── Services/
│           ├── RuleEngine.cs        # C# port of detection engine
│           ├── ClipboardMonitor.cs  # Windows clipboard hook (P/Invoke)
│           ├── PolicyEngine.cs      # Policy evaluation
│           ├── ForegroundDetector.cs # Active window detection
│           ├── AuditLogger.cs       # File-based audit logging
│           ├── Config.cs            # JSON config management
│           └── TrayApplication.cs   # System tray UI
│
├── website/                         # Marketing/landing page
│   ├── index.html                   # Main landing page
│   ├── styles.css                   # Landing page styles
│   └── demo.html                    # Interactive demo
│
├── scripts/                         # Build and utility scripts
│   ├── build.js                     # Extension build pipeline
│   ├── bump-version.js              # Version bumping
│   ├── generate-icons.js            # Icon generation
│   ├── generate-icons-new.js        # Updated icon generation
│   ├── maskit-scan.sh               # Shell script for terminal scanning
│   └── validate-manifests.js        # Manifest validation
│
├── .github/workflows/
│   ├── ci.yml                       # CI pipeline (lint, test, build)
│   └── release.yml                  # Release pipeline (publish to CWS)
│
├── build-docs/                      # Build process documentation
│   ├── 01-build-pipeline.md
│   ├── 02-code-quality.md
│   ├── 03-testing-hardening.md
│   ├── 04-security-hardening.md
│   ├── 05-distribution-packaging.md
│   ├── 06-legal-compliance.md
│   ├── 07-monitoring-error-handling.md
│   ├── 08-cws-preparation.md
│   └── 09-release-process.md
│
├── background.js                    # Extension service worker
├── content.js                       # Extension content script (main logic)
├── settings.js                      # Browser-side settings (duplicated from engine)
├── detector.js                      # Browser-side detector (duplicated from engine)
├── sanitizer.js                     # Browser-side sanitizer
├── editors.js                       # Rich editor integration helpers
├── ai-intercept.js                  # AI-specific interception logic
├── popup.html / popup.js            # Extension popup UI
├── options.html / options.js        # Extension options/settings page
├── manifest.json                    # Chrome Extension Manifest V3
├── package.json                     # Root package (ESLint, scripts)
├── ARCHITECTURE.md                  # This document
├── SECURITY.md                      # Security policy
├── PRD.md                           # Product requirements
├── PLAN.md                          # Development plan
├── BUILD.md                         # Build instructions
├── BUILD-ROADMAP.md                 # Build roadmap
├── FEATURES.md                      # Feature documentation
├── CHANGELOG.md                     # Version history
├── CONTRIBUTING.md                  # Contribution guidelines
├── CWS-LISTING.md                   # Chrome Web Store listing
├── CWS-SUBMISSION-CHECKLIST.md      # CWS submission checklist
├── RELEASE.md                       # Release process
├── CODEBASE_REVIEW.md               # Codebase review notes
├── SUMMARY.md                       # Project summary
├── LICENSE                          # MIT License
└── README.md                        # Project README
```

## 3.1 Directory Responsibilities

### `engine/` — Shared Detection Engine

**Purpose:** The core detection, redaction, and policy evaluation logic. This is a standalone Node.js module with zero browser dependencies. It is shared by the browser extension (via `importScripts` in the service worker and content script) and the MCP server (via `require()`).

**Key files:**
- `engine/index.js` — Public API surface. Re-exports all functions from `detector.js` and `settings.js`.
- `engine/detector.js` — Core detection logic: pattern matching, validation, risk scoring, redaction, policy evaluation.
- `engine/settings.js` — Settings defaults, policy helpers, audit event creation, killswitch logic, regex safety validation.

**Dependencies:** None (pure Node.js). Uses `crypto` module for hashing.

**Connections:** Imported by `background.js` (via `importScripts`), `content.js` (via `importScripts`), and `mcp-server/server.js` (via `require`).

### `maskit-core/` — Data Definitions

**Purpose:** JSON data files that define detection rules, policy defaults, and audit schemas. These are the "source of truth" for what Maskit detects and how it responds.

**Key files:**
- `maskit-core/rules/pii.json` — 5 PII detection rules (EMAIL, PHONE, SSN, PASSPORT, IP_ADDRESS)
- `maskit-core/rules/secrets.json` — 30+ API key/token patterns (OpenAI, Anthropic, AWS, GCP, Azure, GitHub, Stripe, etc.)
- `maskit-core/policy/defaults.json` — Default policy actions per data type (allow/redact/block)
- `maskit-core/policy/contexts.json` — App-specific policy overrides (chatgpt.com, claude.ai, copilot.microsoft.com, local-ai)
- `maskit-core/audit-schema/event.json` — JSON Schema defining the audit event structure

**Connections:** Referenced by the detection engine at runtime. The rules are compiled into the engine's `patterns` and `API_KEY_PATTERNS` arrays.

### `mcp-server/` — MCP Protocol Server

**Purpose:** A stdio-based MCP server that exposes Maskit's detection capabilities as MCP tools. Enables Claude Desktop, Cursor, and other MCP-capable tools to scan and redact data before sending it to AI models.

**Key files:**
- `mcp-server/server.js` — MCP server implementation using `@modelcontextprotocol/sdk`. Registers 6 tools.
- `mcp-server/config.js` — OS-specific config file management (Windows: `%APPDATA%/Maskit/`, macOS: `~/Library/Application Support/Maskit/`, Linux: `~/.config/maskit/`).
- `mcp-server/cli.js` — CLI wrapper for running the MCP server.
- `mcp-server/http-server.js` — HTTP server alternative transport.

**Dependencies:** `@modelcontextprotocol/sdk`, `../engine/index` (shared engine).

**Connections:** Uses the shared detection engine. Config is persisted to the filesystem.

### `maskit-agent/` — Windows System Agent

**Purpose:** A .NET desktop application that monitors the Windows clipboard system-wide. When any application copies text containing sensitive data, the agent intercepts it, scans it, and replaces it with a redacted version.

**Key files:**
- `Program.cs` — Entry point. Composes services via constructor injection.
- `Services/ClipboardMonitor.cs` — Windows clipboard hook using P/Invoke. Polls clipboard every 500ms.
- `Services/RuleEngine.cs` — C# port of the detection engine's pattern matching.
- `Services/PolicyEngine.cs` — Policy evaluation logic.
- `Services/ForegroundDetector.cs` — Detects the active foreground application.
- `Services/AuditLogger.cs` — File-based audit logging.
- `Services/Config.cs` — JSON configuration management.
- `Services/TrayApplication.cs` — System tray icon with context menu.

**Dependencies:** .NET 8.0, Windows-specific P/Invoke.

**Connections:** Standalone application. Shares the same detection philosophy as the browser extension but operates at the OS clipboard level.

### `website/` — Marketing & Demo

**Purpose:** Public-facing website for Maskit. Includes a landing page and an interactive demo.

**Key files:**
- `website/index.html` — Landing page
- `website/styles.css` — Styles
- `website/demo.html` — Interactive demo showing detection in action

### `scripts/` — Build & Utility

**Purpose:** Build scripts, version management, icon generation, and utility tools.

**Key files:**
- `scripts/build.js` — Main build pipeline. Bundles the extension, generates icons, validates manifests.
- `scripts/maskit-scan.sh` — Shell script for scanning files in the terminal.
- `scripts/bump-version.js` — Version bumping across all config files.

---

# 4. Core Detection Engine Architecture

## 4.1 Overview

The detection engine (`engine/detector.js`) is the heart of Maskit. It is a standalone, dependency-free Node.js module that performs:

1. Pattern matching against known sensitive data patterns
2. Validation to eliminate false positives
3. Risk scoring based on finding severity
4. Policy evaluation to determine action (allow/redact/block)
5. Text redaction/sanitization
6. Audit event generation

## 4.2 Detection Pipeline

```mermaid
graph LR
    Input[Input Text] --> Limit[limitScanText]
    Limit --> Match[Pattern Matching]
    
    subgraph "Pattern Matching"
        Match --> PII[PII Patterns<br/>email, phone, SSN, etc.]
        Match --> API[API Key Patterns<br/>30+ providers]
        Match --> Custom[Custom Rules<br/>user-defined regex]
    end
    
    PII --> Validate[Validation]
    API --> Validate
    Custom --> Validate
    
    Validate --> Dedupe[Deduplication]
    Dedupe --> Findings[Findings Array]
    
    Findings --> Risk[Risk Scoring]
    Findings --> Policy[Policy Evaluation]
    
    Policy --> Action{Action}
    Action -->|allow| Allowed[Allowed - No Action]
    Action -->|redact| Redact[Redact Text]
    Action -->|block| Block[Block - Prevent Input]
    
    Redact --> Audit[Audit Event]
    Block --> Audit
    Allowed --> Audit
```

## 4.3 Core Functions

### `scanText(text, settings)`

**Purpose:** The primary entry point. Scans text for sensitive data, evaluates policy, and returns comprehensive results.

**Input:**
```javascript
scanText("My AWS key is AKIAIOSFODNN7EXAMPLE", {
  _context: { app: "chatgpt.com", source: "paste" }
})
```

**Processing:**
1. Merge provided settings with `MASKIT_DEFAULTS`
2. Call `detectSensitiveData()` to find all matches
3. Call `calculateRiskScore()` to compute aggregate risk
4. Call `applyPolicyToFindings()` to determine action per finding
5. Filter out "allow" decisions
6. Call `sanitizeText()` to redact actionable findings
7. Generate audit events for all findings

**Output:**
```javascript
{
  findings: [
    { type: "API_KEY", value: "AKIAIOSFODNN7EXAMPLE", severity: "critical", ruleName: "API_KEY" }
  ],
  allFindings: [ /* same */ ],
  policyDecisions: [
    { finding: { type: "API_KEY", ... }, action: "redact", format: undefined }
  ],
  redactedText: "My AWS key is [API_KEY_REDACTED]",
  riskScore: 50,
  riskLevel: "critical",
  matchedRules: ["API_KEY"],
  events: [ /* audit event objects */ ]
}
```

### `redactText(text, settings)`

**Purpose:** Simplified redaction. Returns only the redacted text and findings.

**Input:**
```javascript
redactText("Email: user@example.com", { _context: { app: "gmail" } })
```

**Output:**
```javascript
{
  redactedText: "Email: [EMAIL_REDACTED]",
  findings: [{ type: "EMAIL", value: "user@example.com", severity: "medium", ruleName: "EMAIL" }],
  allFindings: [ /* same */ ]
}
```

### `evaluatePolicy(text, settings)`

**Purpose:** Policy evaluation without performing redaction. Returns whether the text is allowed, blocked, or needs redaction.

**Input:**
```javascript
evaluatePolicy("SSN: 123-45-6789", { _context: { app: "chatgpt.com" } })
```

**Output:**
```javascript
{
  allowed: false,
  findings: [{ type: "SSN", value: "123-45-6789", severity: "critical", ruleName: "SSN" }],
  allFindings: [ /* same */ ],
  policyDecisions: [{ finding: { type: "SSN", ... }, action: "block" }],
  riskScore: 50,
  riskLevel: "critical",
  blocked: 1,
  allowedByPolicy: 0,
  redacted: 0,
  reason: "Found 1 sensitive item(s): 1 blocked, 0 redacted, 0 allowed"
}
```

### `selectPolicy(context, settings)`

**Purpose:** Selects the appropriate policy based on context (app, domain).

**Logic:**
1. If `context.app` matches a policy key, return that policy
2. If `context.domain` matches a policy key, return that policy
3. Fall back to "default" policy

**Example:**
```javascript
selectPolicy({ app: "chatgpt.com" }, settings)
// Returns: { EMAIL: { action: "redact" }, PHONE: { action: "redact" }, ... }
```

### `getPolicyAction(policy, dataType)`

**Purpose:** Returns the action (allow/redact/block) for a specific data type within a policy.

**Logic:**
1. Look up `dataType` in the policy
2. If found, return the action (validated against `POLICY_ACTIONS`)
3. If not found, default to "redact"

## 4.4 Pattern Matching

### Standard Patterns (`patterns` object)

Defined in `engine/detector.js` lines 42-51:

| Pattern | Regex | Severity | Validator |
|---------|-------|----------|-----------|
| EMAIL | `\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b` | medium | none |
| PHONE | `(\+254\|0)[17]\d{8}` | medium | none |
| CARD | `\b(?:\d[ -]*?){13,16}\b` | critical | Luhn |
| MPESA | `\b[A-Z0-9]{10}\b` | low | format |
| SSN | `\b\d{3}-\d{2}-\d{4}\b` | critical | none |
| IP_ADDRESS | IPv4 regex | high | range check |
| PASSPORT | `\b[A-Z]{1,2}\d{6,9}\b` | high | format |
| BANK_ACCOUNT | `\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b` | critical | length |

### API Key Patterns (`API_KEY_PATTERNS` array)

Defined in `engine/detector.js` lines 55-117. 30+ patterns covering:

- **AI Providers:** OpenAI (`sk-...`), Anthropic (`sk-ant-...`)
- **Cloud Providers:** AWS (`AKIA...`), GCP (`AIza...`), Azure (connection strings, JWT, subscription keys)
- **Dev Tools:** GitHub (`ghp_...`, `github_pat_...`), GitLab (`glpat-...`), npm (`npm_...`)
- **SaaS:** Stripe (`sk_live_...`), Slack (`xoxb-...`), Twilio (`AC...`), SendGrid (`SG.`), DigitalOcean, Datadog
- **Infrastructure:** Kubernetes service account tokens, Terraform Cloud, Docker Hub, Cloudflare
- **Generic:** Bearer tokens, config assignments (`api_key=...`), client secrets

### Custom Rules

Users can define custom regex patterns via the options page. These are compiled at runtime using `compileCustomRule()` and validated for safety using `isRegexSafe()`.

**Safety constraints:**
- Max pattern length: 120 characters
- Max custom rules: 15
- ReDoS protection: blocks patterns with nested quantifiers, unbounded repeats on groups

## 4.5 Validators

Validators reduce false positives by performing additional checks on matched values.

### `luhnCheck(value)` — Credit Card Validation

Implements the Luhn algorithm (ISO/IEC 7812). Validates that a card number passes the checksum. This eliminates ~90% of false positives from the `CARD` pattern.

### `validateFinding(type, value)` — Type-Specific Validation

| Type | Validation Logic |
|------|-----------------|
| CARD | Luhn check |
| MPESA | Must have 2-8 letters AND 2-8 digits, not all same character |
| PASSPORT | Must contain both letters and digits, minimum 8 chars |
| IP_ADDRESS | Must not be all <12, not loopback (127.x), not all zeros |
| API_KEY | Must be >= 20 chars (or have Bearer prefix) |
| BANK_ACCOUNT | Must be >= 15 chars |

## 4.6 Risk Scoring

### `calculateRiskScore(findings, settings)`

Computes an aggregate risk score from 0-100.

**Algorithm:**
1. For each finding, look up the severity weight
2. Sum all weights
3. Cap at 100

**Severity Weights:**
| Level | Weight |
|-------|--------|
| critical | 50 |
| high | 25 |
| medium | 10 |
| low | 5 |

**Example:** Two critical findings + one medium finding = 50 + 50 + 10 = 110 → capped at 100.

### `getRiskLevel(score)`

| Score Range | Level |
|-------------|-------|
| >= 50 | critical |
| >= 25 | high |
| >= 10 | medium |
| < 10 | low |

## 4.7 Redaction Process

### `sanitizeText(text, findings, settings)`

Replaces each finding's value in the text with a redaction placeholder.

**Redaction Formats:**
| Format | Example |
|--------|---------|
| `tagged` (default) | `[API_KEY_REDACTED]` |
| `stars` | `***` |
| `custom` | `[REDACTED]` |

**Algorithm:**
1. Iterate over findings
2. For each finding, call `getRedactionText(type, settings)` to get the replacement
3. Use `String.replaceAll()` to replace all occurrences
4. Return the sanitized text

**Important:** Findings are processed in order. If a finding's value appears within another finding's value, the first match wins.

## 4.8 Policy Evaluation

### `applyPolicyToFindings(findings, context, settings)`

For each finding, determines the action based on the active policy.

**Policy Resolution:**
1. `selectPolicy(context, settings)` — picks the right policy based on app/domain
2. `getPolicyAction(policy, dataType)` — gets the action for each data type

**Policy Structure:**
```javascript
{
  EMAIL: { action: "redact" },
  API_KEY: { action: "redact" },
  CARD: { action: "block" },
  SSN: { action: "block" }
}
```

**Available Actions:**
- `allow` — Let the data pass through unmodified
- `redact` — Replace with a placeholder
- `block` — Prevent the data from being sent

---

# 5. Browser Extension Architecture

## 5.1 Manifest V3 Architecture

Maskit uses Chrome's Manifest V3, the latest extension platform. Key characteristics:

| Aspect | Implementation |
|--------|---------------|
| Background | Service worker (`background.js`) — event-driven, non-persistent |
| Content scripts | Injected into all pages (`<all_urls>`) at `document_start` |
| Permissions | Minimal: `storage`, `contextMenus` |
| Host permissions | `<all_urls>` (required for content script injection) |
| CSP | `script-src 'self'; object-src 'self'` |
| Storage | `chrome.storage.sync` for settings, `chrome.storage.local` for audit log |
| Commands | `Alt+Shift+M` toggle, `Alt+Shift+P` pause |

## 5.2 Component Architecture

```mermaid
graph TB
    subgraph "Extension Components"
        SW[Service Worker<br/>background.js]
        CS[Content Script<br/>content.js]
        Popup[Popup<br/>popup.html/js]
        Options[Options Page<br/>options.html/js]
    end
    
    subgraph "Shared Scripts (importScripts)"
        Settings[settings.js]
        Detector[detector.js]
        Sanitizer[sanitizer.js]
        Editors[editors.js]
        AIIntercept[ai-intercept.js]
    end
    
    subgraph "Chrome APIs"
        Storage[chrome.storage]
        ContextMenus[chrome.contextMenus]
        Commands[chrome.commands]
        Tabs[chrome.tabs]
        Runtime[chrome.runtime]
    end
    
    CS --> Settings
    CS --> Detector
    CS --> Sanitizer
    CS --> Editors
    CS --> AIIntercept
    
    SW --> Settings
    
    CS <-->|Message Passing| SW
    Popup <-->|Message Passing| SW
    Options <-->|Message Passing| SW
    
    SW --> Storage
    SW --> ContextMenus
    SW --> Commands
    SW --> Tabs
    SW --> Runtime
```

## 5.3 Content Script (`content.js`)

The content script is the primary interception layer. It is injected into every page at `document_start` and runs in an isolated world.

### Event Interception

```mermaid
graph TB
    subgraph "DOM Events"
        Paste[paste event]
        Copy[copy event]
        BeforeInput[beforeinput event]
        Input[input event]
        KeyUp[keyup event]
        CompositionEnd[compositionend event]
        FocusOut[focusout event]
    end
    
    subgraph "Handlers"
        HP[handlePaste]
        HC[handleCopy]
        HBI[handleBeforeInput]
        HI[handleInput]
        HK[handleKeyup]
        HCE[handleCompositionEnd]
        HFO[handleFocusOut]
    end
    
    subgraph "Processing"
        Detect[detectSensitiveData]
        Sanitize[sanitizeText]
        Policy[evaluatePolicy]
        Audit[generateAuditEvents]
    end
    
    Paste --> HP
    Copy --> HC
    BeforeInput --> HBI
    Input --> HI
    KeyUp --> HK
    CompositionEnd --> HCE
    FocusOut --> HFO
    
    HP --> Detect
    HC --> Detect
    HBI --> Detect
    HI --> Detect
    HK --> Detect
    HCE --> Detect
    HFO --> Detect
    
    Detect --> Sanitize
    Sanitize --> Policy
    Policy --> Audit
```

### Paste Detection (`handlePaste`)

1. Check killswitch — if active, `preventDefault()` and show modal
2. Check protection is active (enabled, site allowed, not paused)
3. Check `scanPaste` setting
4. Get clipboard text from `event.clipboardData`
5. Check if text is already redacted (contains `***` or `[REDACTED]`)
6. Run `detectSensitiveData()` on the text
7. If findings exist, `preventDefault()` and apply redaction
8. If `reviewBeforeRedact` is enabled, show review dialog

### Copy Detection (`handleCopy`)

1. Check protection is active
2. Check `scanCopy` setting
3. Get selected text from `window.getSelection()`
4. Run detection
5. If findings exist, `preventDefault()` and set redacted text on clipboard
6. If `reviewBeforeRedact` is enabled, show review dialog

### Typing Detection (`handleBeforeInput`, `handleInput`, `handleKeyup`)

Typing detection is the most complex interception path. It uses a multi-layered approach:

1. **`beforeinput` event** (capture phase): Intercepts before the DOM is modified. Can `preventDefault()` to block the input entirely.
   - Computes the proposed text after the input using `getProposedText()`
   - Runs detection on the proposed text
   - If sensitive data found, `preventDefault()` and apply redaction

2. **`input` event** (bubble phase): Fires after the DOM is modified. Used as a fallback for rich editors where `beforeinput` interception is unreliable.
   - Schedules a debounced scan using `scheduleTypingScan()`

3. **`keyup` event**: Triggers immediate scan on space, enter, and tab keys.
   - Clears any pending debounced scans
   - Runs `scanTypedContent()` immediately

4. **`compositionend` event**: Handles IME input (Chinese, Japanese, Korean).
   - Clears pending scans and runs an immediate scan

5. **`focusout` event**: Scans when the user leaves a field.
   - Catches any remaining sensitive data that wasn't caught during typing

### Debounce Strategy

```javascript
// For plain text inputs:
typingTimer = setTimeout(() => scanTypedContent(target), 80);  // 80ms debounce
typingMaxTimer = setTimeout(() => scanTypedContent(target), 450); // 450ms max

// For rich editors (ChatGPT, Gmail):
typingTimer = setTimeout(() => scanTypedContent(target), 150);  // 150ms debounce
typingMaxTimer = setTimeout(() => scanTypedContent(target), 800); // 800ms max
```

### Editor Detection (`editors.js`)

The `getEditorProfile()` function classifies editable elements:

| Profile | Detection | Examples |
|---------|-----------|---------|
| `plain` | `<textarea>` or `<input>` | Standard form fields |
| `rich` | ChatGPT, Gmail, ProseMirror, contenteditable with role="textbox" | ChatGPT, Claude, Gmail |
| `contenteditable` | Generic contenteditable | Other rich editors |

Rich editors require special handling because:
- They use Shadow DOM and complex DOM structures
- `execCommand('insertText')` may not work reliably
- They may have custom input handling that conflicts with direct DOM manipulation

## 5.4 Service Worker (`background.js`)

The service worker is the extension's event-driven background process. It handles:

### Message Routing

| Message Type | Handler | Description |
|-------------|---------|-------------|
| `RECORD_REDACTIONS` | `recordRedactions()` | Update stats counters |
| `GET_STATS` | `getStats()` | Return redaction statistics |
| `RESET_STATS` | `saveStats()` | Reset statistics |
| `RECORD_AUDIT_EVENTS` | `recordAuditEvents()` | Store audit events |
| `GET_AUDIT_LOG` | `getAuditLog()` | Return audit log |
| `RESET_AUDIT_LOG` | `saveAuditLog()` | Reset audit log |
| `SET_AUDIT_RETENTION` | `setAuditRetention()` | Set retention period |
| `UNMASK_VALUE` | `setUnmaskedValue()` | Temporarily store unmasked value |
| `GET_UNMASKED_VALUE` | `getUnmaskedValue()` | Retrieve unmasked value |
| `EXPORT_CONFIG` | `exportConfig()` | Export settings as JSON |
| `IMPORT_CONFIG` | `importConfig()` | Import and validate settings |
| `GET_PAUSE_STATE` | `getPauseState()` | Check if paused |
| `TOGGLE_PAUSE` | `togglePause()` | Toggle pause state |
| `ADD_TO_BLOCKLIST` | `addToBlocklist()` | Add current site to blocklist |
| `UPDATE_BADGE` | `updateActionBadge()` | Refresh badge state |
| `OPEN_OPTIONS` | `openOptionsPage()` | Open settings page |

### Badge System

The extension badge is tri-state:

| State | Text | Color | Meaning |
|-------|------|-------|---------|
| Active | ON | Green (#00b894) | Protection active on this page |
| Paused | PSE | Amber (#f6b93b) | Protection paused, data passing through |
| Inactive | OFF | Gray (#5f6368) | Protection off (disabled or site not in scope) |

### Unmask System

When a user wants to view the original value of a redacted item:

1. The original value is stored in memory (`unmaskStore` object) with a TTL (default 30s)
2. A deterministic hash token is generated and stored in the audit event
3. The user can request unmasking, which returns the value from memory
4. After the TTL expires, the value is deleted from memory
5. The audit event records when the unmask occurred and for how long

**Security:** Values are never persisted to disk. They exist only in the service worker's memory for the duration of the TTL.

## 5.5 Popup Interface (`popup.html` / `popup.js`)

The popup provides quick status and controls:

- **Status indicator:** Shows whether protection is active, paused, or off
- **Toggle switch:** Enable/disable protection
- **Pause button:** Temporarily pause protection (with auto-resume countdown)
- **Statistics:** Total redactions, by type, by source
- **Quick actions:** Open options, view audit log
- **Site controls:** Add current site to allowlist/blocklist

## 5.6 Options Page (`options.html` / `options.js`)

The options page provides full configuration:

- **General settings:** Enable/disable, scan paste/copy/typing, review before redact
- **Redaction format:** Tagged, stars, custom text
- **Site list:** Allowlist/blocklist mode with domain management
- **Detection toggles:** Enable/disable individual data type detection
- **Custom rules:** Add/edit/delete custom regex patterns
- **Severity overrides:** Custom severity per data type
- **Policy management:** View and configure policies
- **Audit log:** View, filter, export, and clear audit events
- **Config import/export:** JSON-based settings backup and restore
- **Killswitch configuration:** Enterprise admin controls (future)

## 5.7 Supported Platforms

Maskit's content script is designed to work on any website, but has specific optimizations for:

| Platform | Detection | Special Handling |
|----------|-----------|-----------------|
| ChatGPT (chatgpt.com) | Paste, Copy, Typing | Rich editor, ProseMirror integration |
| Claude (claude.ai) | Paste, Copy, Typing | Contenteditable, custom event handling |
| Gemini (gemini.google.com) | Paste, Copy, Typing | Rich editor |
| Copilot (copilot.microsoft.com) | Paste, Copy, Typing | Contenteditable |
| Gmail (mail.google.com) | Paste, Typing | Rich editor, compose window detection |
| Generic sites | Paste, Copy, Typing | Standard textarea/input handling |

---

# 6. MCP Server Architecture

## 6.1 What is MCP?

The **Model Context Protocol (MCP)** is an open protocol developed by Anthropic that standardizes how applications provide context and tools to LLMs. MCP uses a client-server architecture where:

- **MCP Hosts:** Programs like Claude Desktop, Cursor, or VS Code that host AI interactions
- **MCP Clients:** Protocol clients that connect to servers
- **MCP Servers:** Programs that expose tools, resources, and prompts to AI models

Maskit implements an MCP server that exposes its detection capabilities as tools that AI models can call before sending or receiving data.

## 6.2 Why Maskit Supports MCP

The browser extension protects data entered through the browser. But many AI interactions happen outside the browser:

- **Claude Desktop:** Native desktop app with no browser extension
- **Cursor IDE:** AI-powered code editor
- **VS Code with Copilot:** AI pair programming
- **Terminal-based AI tools:** CLI interactions with AI models

MCP provides a standardized way for all these tools to integrate with Maskit's detection engine.

## 6.3 Architecture

```mermaid
graph TB
    subgraph "MCP Hosts"
        ClaudeDesktop[Claude Desktop]
        Cursor[Cursor IDE]
        VSCode[VS Code]
        Custom[Custom MCP Clients]
    end
    
    subgraph "MCP Transport"
        Stdio[stdio transport]
    end
    
    subgraph "Maskit MCP Server"
        Server[mcp-server/server.js]
        Config[mcp-server/config.js]
        Engine[Shared Detection Engine]
    end
    
    subgraph "Config Storage"
        ConfigFile[config.json<br/>OS-specific path]
    end
    
    ClaudeDesktop -->|stdio| Stdio
    Cursor -->|stdio| Stdio
    VSCode -->|stdio| Stdio
    Custom -->|stdio| Stdio
    
    Stdio --> Server
    Server --> Config
    Server --> Engine
    Config --> ConfigFile
```

## 6.4 Available Tools

### `scan_text`

**Purpose:** Scan text for sensitive data. Returns findings with risk score, matched rules, and redacted text.

**Input:**
```json
{
  "text": "My API key is sk-proj-abc123def456",
  "app": "claude-desktop"
}
```

**Output:**
```json
{
  "findings": [{ "type": "API_KEY", "value": "sk-proj-abc123def456", "severity": "critical", "ruleName": "API_KEY" }],
  "allFindings": [...],
  "policyDecisions": [...],
  "redactedText": "My API key is [API_KEY_REDACTED]",
  "riskScore": 50,
  "riskLevel": "critical",
  "matchedRules": ["API_KEY"],
  "events": [...]
}
```

**Security considerations:** The `app` parameter is used to select the appropriate policy. If no app is specified, the default policy is used.

### `redact_text`

**Purpose:** Scan and redact sensitive data from text. Returns only the redacted version.

**Input:**
```json
{
  "text": "Email: user@example.com",
  "format": "tagged",
  "app": "claude-desktop"
}
```

**Output:**
```json
{
  "redactedText": "Email: [EMAIL_REDACTED]",
  "findings": [{ "type": "EMAIL", "value": "user@example.com", "severity": "medium", "riskLevel": "medium" }],
  "riskScore": 10,
  "riskLevel": "medium"
}
```

### `evaluate_policy`

**Purpose:** Evaluate whether text contains sensitive data and should be blocked or allowed. Does not perform redaction.

**Input:**
```json
{
  "text": "SSN: 123-45-6789",
  "app": "claude-desktop"
}
```

**Output:**
```json
{
  "allowed": false,
  "findings": [{ "type": "SSN", "value": "123-45-6789", "severity": "critical", "ruleName": "SSN" }],
  "allFindings": [...],
  "policyDecisions": [{ "finding": {...}, "action": "block" }],
  "riskScore": 50,
  "riskLevel": "critical",
  "blocked": 1,
  "allowedByPolicy": 0,
  "redacted": 0,
  "reason": "Found 1 sensitive item(s): 1 blocked, 0 redacted, 0 allowed"
}
```

### `scan_response`

**Purpose:** Scan an AI response for potential credential leaks, reconstructed secrets, or leaked API keys. Use after receiving responses from AI models to detect accidental exposure.

**Input:**
```json
{
  "response": "Here's your API key: sk-proj-abc123def456",
  "app": "claude-desktop"
}
```

**Output:**
```json
{
  "hasFindings": true,
  "findings": [{ "type": "API_KEY", "value": "sk-proj-abc123def456", "severity": "critical", "ruleName": "API_KEY" }],
  "riskScore": 50,
  "riskLevel": "critical",
  "recommendation": "warn",
  "message": "Response contains potential secrets: 1 finding(s). WARNING: Critical credentials detected — check before copying."
}
```

### `get_status`

**Purpose:** Get Maskit engine status and configuration info.

**Output:**
```json
{
  "version": "2.4.0",
  "engineReady": true,
  "configPath": "/home/user/.config/maskit/config.json",
  "rulesEnabled": 38,
  "enabled": true,
  "severity": { "API_KEY": "critical", ... },
  "appOverrides": { "claude-desktop": { "enabled": true, "reviewBeforeRedact": true } }
}
```

### `get_rules`

**Purpose:** Get all active detection rules and custom rules.

**Output:**
```json
{
  "rules": [
    { "type": "EMAIL", "enabled": true, "severity": "medium" },
    { "type": "API_KEY", "enabled": true, "severity": "critical" },
    ...
  ],
  "customRules": [...]
}
```

### `update_rules`

**Purpose:** Update custom detection rules. Replaces all custom rules with the provided list.

**Input:**
```json
{
  "customRules": [
    { "id": "rule1", "name": "My Custom Rule", "pattern": "\\bSECRET-\\d{6}\\b", "enabled": true }
  ]
}
```

### `get_audit_log`

**Purpose:** Get the audit log of all redaction and policy events. Currently returns a summary since the full audit log lives in the browser extension. Future versions will sync to a central backend.

## 6.5 Request/Response Lifecycle

```mermaid
sequenceDiagram
    participant Client as MCP Client<br/>(Claude Desktop)
    participant Server as Maskit MCP Server
    participant Config as Config Manager
    participant Engine as Detection Engine
    
    Client->>Server: ListTools
    Server-->>Client: { tools: [scan_text, redact_text, ...] }
    
    Client->>Server: CallTool(scan_text, { text: "..." })
    Server->>Config: getSettingsForApp(app)
    Config-->>Server: settings (with app overrides)
    Server->>Server: checkKillswitch(settings)
    alt Killswitch Active
        Server-->>Client: { error: "AI tools restricted", blocked: true }
    else Killswitch Inactive
        Server->>Engine: scanText(text, settings)
        Engine-->>Server: { findings, redactedText, riskScore, ... }
        Server-->>Client: { content: [{ type: "text", text: JSON.stringify(result) }] }
    end
```

## 6.6 Configuration

The MCP server stores configuration at OS-specific paths:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\Maskit\config.json` |
| macOS | `~/Library/Application Support/Maskit/config.json` |
| Linux | `~/.config/maskit/config.json` |

**Config structure:**
```json
{
  "enabled": true,
  "severity": { "API_KEY": "critical", ... },
  "appOverrides": {
    "claude-desktop": { "enabled": true, "reviewBeforeRedact": true },
    "cursor": { "enabled": true }
  },
  "apiToken": "...",
  "hashSalt": "..."
}
```

## 6.7 Claude Desktop Integration

To integrate with Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "maskit": {
      "command": "node",
      "args": ["path/to/maskit/mcp-server/server.js"],
      "env": {}
    }
  }
}
```

---

# 7. Policy Engine Architecture

## 7.1 Overview

The policy engine determines what action to take when sensitive data is detected. It supports:

- **Default policies:** Applied when no app-specific policy exists
- **Application-specific policies:** Overrides for specific AI platforms
- **User-defined rules:** Custom regex patterns with configurable actions
- **Killswitch:** Enterprise-wide disable of AI tools

## 7.2 Policy Resolution

```mermaid
graph TD
    Start[Context: app/domain] --> CheckApp{App-specific<br/>policy exists?}
    CheckApp -->|Yes| AppPolicy[Use app policy]
    CheckApp -->|No| CheckDomain{Domain-specific<br/>policy exists?}
    CheckDomain -->|Yes| DomainPolicy[Use domain policy]
    CheckDomain -->|No| DefaultPolicy[Use default policy]
    
    AppPolicy --> Evaluate[Evaluate each finding]
    DomainPolicy --> Evaluate
    DefaultPolicy --> Evaluate
    
    Evaluate --> Action{Action?}
    Action -->|allow| Allow[Allow - No modification]
    Action -->|redact| Redact[Replace with placeholder]
    Action -->|block| Block[Prevent data transmission]
```

## 7.3 Default Policies

Defined in `maskit-core/policy/defaults.json` and `engine/settings.js` (`MASKIT_POLICY_DEFAULTS`):

| Data Type | Default Action | Rationale |
|-----------|---------------|-----------|
| EMAIL | redact | PII, but commonly shared |
| PHONE | redact | PII, but commonly shared |
| API_KEY | redact | Critical, but may need to be used in prompts |
| CARD | block | PCI-DSS, should never be shared |
| SSN | block | Regulatory, should never be shared |
| BANK_ACCOUNT | block | Financial, should never be shared |
| PASSPORT | redact | High sensitivity |
| IP_ADDRESS | redact | Moderate sensitivity |
| MPESA | redact | Low sensitivity |

## 7.4 Application-Specific Policies

Defined in `maskit-core/policy/contexts.json`:

### ChatGPT (`chatgpt.com`)

| Data Type | Action |
|-----------|--------|
| EMAIL | redact |
| PHONE | redact |
| API_KEY | redact |
| CARD | redact (not block — allows legitimate use cases) |
| SSN | block |
| BANK_ACCOUNT | block |

### Claude (`claude.ai`)

| Data Type | Action |
|-----------|--------|
| EMAIL | allow (Claude is often used for email drafting) |
| PHONE | redact |
| API_KEY | redact |
| CARD | block |
| SSN | block |

### Copilot (`copilot.microsoft.com`)

| Data Type | Action |
|-----------|--------|
| EMAIL | redact |
| PHONE | redact |
| API_KEY | redact |
| CARD | block |
| SSN | block |

### Local AI (`local-ai`)

| Data Type | Action |
|-----------|--------|
| EMAIL | allow (local models are trusted) |
| PHONE | allow |
| API_KEY | allow |
| CARD | redact (still sensitive, but local) |
| SSN | redact |

## 7.5 Policy Selection Logic

```javascript
function selectPolicy(context, settings) {
    const policies = (settings && settings.policies) || MASKIT_POLICY_DEFAULTS.policies;
    const ctx = context || {};

    // Try app-specific policy first
    if (ctx.app && policies[ctx.app]) return policies[ctx.app];
    // Try domain-specific policy
    if (ctx.domain && policies[ctx.domain]) return policies[ctx.domain];
    // Fall back to default
    return policies["default"] || {};
}
```

## 7.6 Killswitch

The killswitch is an enterprise feature that allows administrators to disable AI tool usage entirely.

### Configuration

```javascript
{
  enabled: false,           // Master switch
  message: "AI tools are restricted by Admin",
  duration: null,           // ISO 8601 datetime for auto-enable, null = indefinite
  exemptions: [],           // [{ type: "user", identifier: "alice@company.com" }]
  schedule: {               // Time-based restriction
    disable: "17:00",
    enable: "09:00",
    daysOfWeek: [1, 2, 3, 4, 5]  // Monday-Friday
  }
}
```

### Evaluation Logic

```javascript
function isAIToolsAllowed(killswitch, now) {
    // 1. Check if killswitch is enabled
    // 2. Check schedule-based restrictions (time of day, day of week)
    // 3. Check time-limited restrictions (duration)
    // 4. Check indefinite restrictions
    // 5. Check user exemptions
    return { allowed: boolean, reason: string };
}
```

### Enforcement Points

- **Browser extension:** `handlePaste()` and `handleBeforeInput()` check killswitch before allowing any data through
- **MCP server:** All tool handlers check killswitch before processing
- **Windows agent:** (Future) Check killswitch before clipboard modification

---

# 8. Audit Logging System

## 8.1 Overview

Maskit maintains a structured audit log of all detection events. The audit log is stored locally on the user's machine and is never transmitted externally.

## 8.2 Audit Event Schema

Defined in `maskit-core/audit-schema/event.json`:

```json
{
  "id": "evt_1712345678_a1b2c3",
  "timestamp": 1712345678000,
  "type": "API_KEY",
  "severity": "critical",
  "source": "paste",
  "app": "chatgpt.com",
  "action": "redacted",
  "riskScore": 50,
  "matchedRule": "API_KEY",
  "policyApplied": "default",
  "unmaskToken": "a1b2c3d4e5f6...",
  "unmaskedAt": null,
  "unmaskedDuration": null
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier: `evt_<timestamp>_<random>` |
| `timestamp` | number | Unix timestamp in milliseconds |
| `type` | string | Data type detected: `EMAIL`, `PHONE`, `API_KEY`, `CARD`, `SSN`, `BANK_ACCOUNT`, `PASSPORT`, `IP_ADDRESS`, `MPESA`, `CUSTOM:<name>` |
| `severity` | string | Severity level: `critical`, `high`, `medium`, `low` |
| `source` | string | How data was intercepted: `paste`, `copy`, `typing`, `contextMenu`, `clipboard`, `terminal`, `api` |
| `app` | string | Application or hostname where the event occurred |
| `action` | string | Action taken: `redacted`, `blocked`, `allowed`, `unmasked` |
| `riskScore` | number | Aggregate risk score at time of detection (0-100) |
| `matchedRule` | string | Rule ID that matched (e.g., `API_KEY_OPENAI`, `EMAIL`) |
| `policyApplied` | string | Policy context that was applied (`default`, `chatgpt.com`, etc.) |
| `unmaskToken` | string\|null | Deterministic hash token for unmasking (null if not applicable) |
| `unmaskedAt` | number\|null | Timestamp when value was unmasked (null if never unmasked) |
| `unmaskedDuration` | number\|null | Duration in ms the value was visible (null if never unmasked) |
| `appContext` | object\|null | Additional context (Windows agent only): `processName`, `processPath`, `aiDetected`, `aiConfidence`, `isLocal` |

## 8.3 Storage Mechanism

### Browser Extension

- **Storage:** `chrome.storage.local`
- **Key:** `auditLog`
- **Structure:**
  ```javascript
  {
    events: [ /* array of audit event objects */ ],
    retentionDays: 30
  }
  ```
- **Pruning:** Events older than `retentionDays` are pruned on every write

### MCP Server

- **Storage:** Currently returns a summary message. Full audit log is in the browser extension.
- **Future:** Will sync to a central backend for enterprise compliance.

### Windows Agent

- **Storage:** File-based at `%APPDATA%\Maskit\audit.log`
- **Format:** JSON lines (one event per line)

## 8.4 Retention

Default retention is 30 days. Configurable via the options page (browser extension) or config file (MCP server, Windows agent).

## 8.5 Export Functionality

The options page provides:

- **View:** Paginated list of audit events with filtering by type, severity, action, and date range
- **Export:** Download audit log as JSON
- **Clear:** Delete all audit events (with confirmation)

## 8.6 Security Considerations

- **Sensitive values are never stored in plaintext.** The `unmaskToken` is a deterministic SHA-256 hash of the value + a per-installation random salt.
- **Unmasking is temporary.** Values are stored in memory only, with a configurable TTL (default 30s).
- **Audit log is local.** No audit data is transmitted to external servers.
- **Config import/export is validated.** Settings are validated against a whitelist of allowed keys and types before being applied.

---

# 9. Windows Agent Architecture

## 9.1 Overview

The Maskit Windows Agent is a .NET 8.0 desktop application that provides system-wide clipboard protection. It runs in the user session with a system tray icon and monitors the Windows clipboard for sensitive data.

**Status:** In development (Phase 2).

## 9.2 Architecture

```mermaid
graph TB
    subgraph "Windows Agent"
        Program[Program.cs<br/>Entry Point]
        
        subgraph "Services"
            CM[ClipboardMonitor]
            RE[RuleEngine]
            PE[PolicyEngine]
            FD[ForegroundDetector]
            AL[AuditLogger]
            Config[Config]
            TA[TrayApplication]
        end
        
        Program --> CM
        Program --> RE
        Program --> PE
        Program --> FD
        Program --> AL
        Program --> Config
        Program --> TA
        
        CM --> RE
        CM --> PE
        CM --> FD
        CM --> AL
        
        TA --> CM
        TA --> PE
        TA --> AL
        TA --> Config
    end
    
    subgraph "Windows APIs"
        Clipboard[Win32 Clipboard API<br/>user32.dll]
        Foreground[Foreground Window API<br/>user32.dll]
        Tray[System Tray API<br/>shell32.dll]
    end
    
    CM --> Clipboard
    FD --> Foreground
    TA --> Tray
    
    subgraph "File System"
        ConfigFile[config.json]
        AuditFile[audit.log]
        RulesFile[rules.json]
    end
    
    Config --> ConfigFile
    AL --> AuditFile
    RE --> RulesFile
```

## 9.3 Component Details

### `Program.cs` — Entry Point

Composes all services and starts the application:

```csharp
static void Main()
{
    // Single-instance mutex
    using var mutex = new Mutex(true, "MaskitAgentSingleInstance", out bool createdNew);
    if (!createdNew) return;

    var config = Config.Load();
    var ruleEngine = new RuleEngine();
    ruleEngine.LoadRules(config.RulesPath);
    var policyEngine = new PolicyEngine(config);
    var auditLogger = new AuditLogger(config.AuditLogPath);
    var foregroundDetector = new ForegroundDetector();
    var clipboardMonitor = new ClipboardMonitor(ruleEngine, policyEngine, auditLogger, foregroundDetector);
    var trayApp = new TrayApplication(clipboardMonitor, policyEngine, auditLogger, config);
    trayApp.Run();
}
```

### `ClipboardMonitor.cs` — Clipboard Hook

**Mechanism:** Polling-based clipboard monitoring (500ms interval). Uses Windows P/Invoke to access the clipboard API.

**Flow:**
1. Poll clipboard every 500ms
2. On change, read clipboard text via `GetClipboardData(CF_UNICODETEXT)`
3. Scan text with `RuleEngine.Scan()`
4. Get foreground app context via `ForegroundDetector.GetForegroundContext()`
5. Evaluate policy via `PolicyEngine.Evaluate()`
6. If redaction needed, replace clipboard content with redacted version
7. Log to audit

**Key Windows API calls:**
- `OpenClipboard` / `CloseClipboard` — Clipboard access
- `GetClipboardData` / `SetClipboardData` — Data read/write
- `GlobalAlloc` / `GlobalLock` / `GlobalUnlock` — Memory management
- `EmptyClipboard` — Clear before setting new data

### `RuleEngine.cs` — Detection Engine (C# Port)

A C# port of the JavaScript detection engine. Implements the same pattern matching and validation logic.

### `PolicyEngine.cs` — Policy Evaluation

Evaluates findings against the active policy. Supports the same policy structure as the browser extension.

### `ForegroundDetector.cs` — Active Window Detection

Uses Windows API to detect the foreground application:

```csharp
public ForegroundContext GetForegroundContext()
{
    // Get foreground window handle
    // Get process name and path
    // Check if process is an AI tool
    // Determine if it's a local or cloud AI
    return new ForegroundContext {
        ProcessName = "chrome.exe",
        ProcessPath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        AiDetected = true,
        AiConfidence = 0.85,
        IsLocal = false
    };
}
```

### `AuditLogger.cs` — File-Based Audit Logging

Writes audit events to a JSON lines file at `%APPDATA%\Maskit\audit.log`.

### `Config.cs` — Configuration Management

Reads/writes JSON configuration at `%APPDATA%\Maskit\config.json`.

### `TrayApplication.cs` — System Tray UI

Provides a system tray icon with context menu:

- **Status indicator:** Green/amber/red icon based on protection state
- **Pause/Resume:** Toggle protection
- **View Log:** Open audit log file
- **Settings:** Open config file
- **Exit:** Stop the agent

## 9.4 Why the Agent Transforms Maskit

The Windows agent extends Maskit from a browser-only tool to a **system-wide AI trust layer**:

| Capability | Browser Extension | Windows Agent |
|-----------|------------------|---------------|
| Browser AI tools | ✓ | ✓ (via clipboard) |
| Desktop AI apps | ✗ | ✓ (Claude Desktop, etc.) |
| IDE clipboard | ✗ | ✓ (VS Code, JetBrains) |
| Terminal | ✗ | ✓ |
| All applications | ✗ | ✓ |
| System-wide policy | ✗ | ✓ |
| Offline operation | ✓ | ✓ |

---

# 10. Security Architecture

## 10.1 Threat Model

### Threat 1: Accidental Data Leakage

**Scenario:** A developer pastes an AWS access key into ChatGPT while debugging.

**Mitigation:**
- Real-time paste interception detects the key before it reaches the AI model
- Policy evaluation blocks or redacts the key
- Audit event is logged for compliance

### Threat 2: Malicious AI Usage

**Scenario:** An employee intentionally uploads a customer database to an AI model.

**Mitigation:**
- Typing detection catches data as it's entered
- Copy detection redacts data copied to clipboard
- Killswitch can disable AI tools entirely during sensitive periods
- Audit log provides forensic evidence

### Threat 3: Credential Exposure

**Scenario:** A developer commits code containing hardcoded API keys.

**Mitigation:**
- MCP server's `scan_response` tool detects leaked credentials in AI responses
- CLI tool (`maskit-scan.sh`) can scan files before commit
- GitHub Actions integration can block PRs with exposed credentials

### Threat 4: Sensitive Document Sharing

**Scenario:** An executive pastes a confidential document into an AI summarization tool.

**Mitigation:**
- Paste interception detects PII and financial data
- Review-before-redact dialog allows user to confirm before redaction
- Audit log records the event for compliance

### Threat 5: Insider Risk

**Scenario:** A departing employee exfiltrates customer data via AI tools.

**Mitigation:**
- Killswitch can disable AI tools for specific users or schedules
- Audit log provides evidence of data exfiltration attempts
- Future enterprise console will provide centralized monitoring

## 10.2 Protections

### Local Processing

All detection, policy evaluation, and redaction happens on the user's machine. No data is ever transmitted to a remote server for analysis.

**Verification:**
- The detection engine (`engine/detector.js`) has zero network dependencies
- The browser extension uses no remote APIs
- The MCP server runs locally via stdio
- The Windows agent runs entirely locally

### No Sensitive Data Transmission

Maskit never sends sensitive data to any external service. The only network requests made by the extension are:

- `chrome.storage.sync` — Google's sync API (stores settings only, no sensitive data)
- Extension updates — Chrome Web Store update checks

### Minimal Permissions

The browser extension requests only two permissions:

| Permission | Purpose |
|-----------|---------|
| `storage` | Store settings and audit log |
| `contextMenus` | Add "Scan & Redact Selection" context menu |

No `webRequest`, `cookies`, `tabs` (beyond querying), or `scripting` permissions are required.

### No Unnecessary Telemetry

Maskit does not collect:
- Usage statistics
- Error reports
- Analytics
- User behavior data

The only data stored is:
- User settings (synced via `chrome.storage.sync`)
- Audit log (local only)
- Redaction statistics (local only)

### Deterministic Redaction

Redaction is deterministic and reversible only through the unmask system:

1. Original value is replaced with a placeholder (`[API_KEY_REDACTED]`)
2. Original value is stored in memory with a TTL (default 30s)
3. A deterministic hash is stored in the audit log for traceability
4. After TTL expires, the value is permanently unrecoverable

## 10.3 Limitations

### What Maskit Does Not Protect Against

- **Screenshot capture:** Maskit cannot prevent screen recording or screenshots
- **Side-channel attacks:** Maskit cannot prevent data leakage through audio, video, or other side channels
- **Malicious extensions:** Maskit cannot protect against other browser extensions that may have access to page content
- **Compromised devices:** Maskit cannot protect against keyloggers, screen scrapers, or other malware
- **Physical access:** Maskit cannot protect against an attacker with physical access to the device
- **AI model training:** Once data reaches an AI model, Maskit cannot control how the model uses that data

### False Positives

Regex-based detection can produce false positives. Maskit mitigates this through:

- **Validators:** Luhn check for credit cards, format validation for other types
- **Custom rules:** Users can disable specific detection types
- **Review dialog:** Users can review and confirm before redaction
- **Allowlist/blocklist:** Users can exclude specific sites from protection

### Performance Impact

- **Typing detection:** Adds ~80ms latency to keystroke processing (debounced)
- **Paste detection:** Adds <5ms latency (local regex scan)
- **Clipboard monitoring (agent):** Polls every 500ms, negligible CPU impact

---

# 11. Data Flow Examples

## Example 1: User Pastes API Key into ChatGPT

**Input:**
```
My OpenAI key is sk-proj-abc123def456ghi789jkl012
```

**Detection:**
1. `handlePaste` event fires on `chatgpt.com`
2. Killswitch check: not active
3. Protection check: enabled, site allowed, not paused
4. `scanPaste` setting: enabled
5. Clipboard text extracted: `"My OpenAI key is sk-proj-abc123def456ghi789jkl012"`
6. `detectSensitiveData()` called:
   - `API_KEY_PATTERNS[0]` matches: `sk-proj-abc123def456ghi789jkl012`
   - `validateFinding("API_KEY", ...)` passes (length >= 20)
   - Finding created: `{ type: "API_KEY", value: "sk-proj-abc123def456ghi789jkl012", severity: "critical" }`
7. `calculateRiskScore()`: 50 (critical)
8. `selectPolicy({ app: "chatgpt.com" })`: returns ChatGPT-specific policy
9. `getPolicyAction(chatgptPolicy, "API_KEY")`: returns `"redact"`

**Decision:** Redact

**Action:**
1. `sanitizeText()` replaces the key with `[API_KEY_REDACTED]`
2. `preventDefault()` on the paste event
3. Redacted text inserted into the ChatGPT input field
4. Toast notification: "Maskit: sanitized 1 sensitive item(s)"

**Audit Record:**
```json
{
  "id": "evt_1712345678_a1b2c3",
  "timestamp": 1712345678000,
  "type": "API_KEY",
  "severity": "critical",
  "source": "paste",
  "app": "chatgpt.com",
  "action": "redacted",
  "riskScore": 50,
  "matchedRule": "API_KEY",
  "policyApplied": "chatgpt.com"
}
```

## Example 2: User Pastes Customer Database into Copilot

**Input:**
```
Customer: John Doe
Email: john@example.com
Phone: +1-555-123-4567
SSN: 123-45-6789
Credit Card: 4111-1111-1111-1111
```

**Detection:**
1. `handlePaste` event fires on `copilot.microsoft.com`
2. `detectSensitiveData()` finds:
   - EMAIL: `john@example.com` (medium)
   - PHONE: `+1-555-123-4567` (medium)
   - SSN: `123-45-6789` (critical)
   - CARD: `4111-1111-1111-1111` (critical, Luhn validated)
3. `calculateRiskScore()`: 10 + 10 + 50 + 50 = 120 → capped at 100
4. `selectPolicy({ app: "copilot.microsoft.com" })`: returns Copilot policy
5. Policy decisions:
   - EMAIL → redact
   - PHONE → redact
   - SSN → block
   - CARD → block

**Decision:** Mixed (redact + block)

**Action:**
1. `preventDefault()` on the paste event
2. Redacted text: `Customer: John Doe\nEmail: [EMAIL_REDACTED]\nPhone: [PHONE_REDACTED]\nSSN: [BLOCKED]\nCredit Card: [BLOCKED]`
3. Toast notification: "Maskit: sanitized 4 sensitive item(s)"

## Example 3: Developer Commits AWS Credentials

**Scenario:** Developer uses Claude Desktop to review code containing AWS credentials.

**Input (via MCP):**
```
const AWS_CONFIG = {
  accessKeyId: "AKIAIOSFODNN7EXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
};
```

**Detection (via `scan_text` tool):**
1. MCP server receives `scan_text` call with `app: "claude-desktop"`
2. `getSettingsForApp("claude-desktop")` returns settings with app overrides
3. Killswitch check: not active
4. `detectSensitiveData()` finds:
   - API_KEY: `AKIAIOSFODNN7EXAMPLE` (critical, AWS access key)
   - API_KEY: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (critical, AWS secret key)
5. Policy evaluation: both redacted

**Decision:** Redact both

**Action:**
1. Redacted text returned to Claude Desktop
2. Developer sees: `accessKeyId: "[API_KEY_REDACTED]"` and `secretAccessKey: "[API_KEY_REDACTED]"`

## Example 4: User Uses Local AI Model

**Input:**
```
My email is user@example.com and my phone is 0712345678
```

**Detection:**
1. User is running a local AI model (Ollama, LM Studio)
2. Context is identified as `local-ai` (via MCP app parameter or Windows agent foreground detection)
3. `selectPolicy({ app: "local-ai" })`: returns local-ai policy
4. Policy decisions:
   - EMAIL → allow (local model is trusted)
   - PHONE → allow (local model is trusted)

**Decision:** Allow

**Action:**
1. Data passes through unmodified
2. Audit event records the "allowed" action for compliance

---

# 12. Technology Stack

## 12.1 Current Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Detection Engine** | Node.js (vanilla) | Zero dependencies, portable, shared across all components |
| **Browser Extension** | Chrome Extension Manifest V3 | Modern extension platform, service worker architecture |
| **MCP Server** | Node.js + `@modelcontextprotocol/sdk` | Official MCP SDK, stdio transport |
| **Windows Agent** | .NET 8.0 (C#) | Native Windows API access (P/Invoke), system tray support |
| **Rules & Policy** | JSON | Human-readable, version-controllable, no compilation needed |
| **Audit Schema** | JSON Schema (draft-07) | Standard validation, tooling support |
| **Build System** | Node.js scripts | Simple, no external build tools required |
| **CI/CD** | GitHub Actions | Free for open source, integrated with GitHub |
| **Landing Page** | Vanilla HTML/CSS/JS | No framework overhead, fast loading |
| **Testing** | Node.js (vanilla) | No test framework dependency, simple assertion patterns |

## 12.2 Why Each Technology Was Chosen

### Node.js (Vanilla) for Detection Engine

- **Zero dependencies:** The engine can be imported anywhere without npm install
- **Portable:** Works in Node.js, browser (via importScripts), and can be ported to other languages
- **Simple:** No build step, no transpilation, no framework overhead
- **Testable:** Simple assertion-based tests in `engine/test.js`

### Chrome Extension Manifest V3

- **Modern platform:** MV3 is the current and future Chrome extension standard
- **Service worker:** Event-driven, non-persistent background process (better security)
- **Security:** Stricter CSP, no remote code execution, no eval()
- **Performance:** Lazy loading, better memory management

### .NET 8.0 for Windows Agent

- **Native Windows API access:** P/Invoke for clipboard, foreground window, system tray
- **Performance:** Compiled, native performance for clipboard monitoring
- **Single-instance:** Built-in mutex support
- **Deployment:** Self-contained deployment, no runtime dependency

### JSON for Rules and Policy

- **Human-readable:** Easy to review in code reviews
- **Version-controllable:** Changes are tracked in git
- **No compilation:** Changes take effect immediately
- **Portable:** Can be consumed by any language

## 12.3 Future Stack Considerations

| Component | Current | Future Consideration |
|-----------|---------|---------------------|
| **Cloud Dashboard** | N/A | React/Next.js + Node.js API |
| **Enterprise Console** | N/A | React + .NET API + SQL Server |
| **IDE Plugins** | N/A | VS Code: TypeScript, JetBrains: Kotlin |
| **Mobile** | N/A | React Native or Flutter |

---

# 13. Testing Architecture

## 13.1 Testing Philosophy

Maskit's testing approach prioritizes:

1. **Correctness:** Detection must be accurate (no false negatives for critical patterns)
2. **Performance:** Detection must be fast (<5ms per scan)
3. **Safety:** Redaction must never corrupt the original text
4. **Determinism:** Same input must always produce same output

## 13.2 Current Test Coverage

### Engine Tests (`engine/test.js`)

Tests the core detection engine:

- **Pattern matching:** Each pattern type is tested with valid and invalid inputs
- **Validation:** Luhn check, format validators
- **Redaction:** Text sanitization with various formats
- **Policy evaluation:** Policy selection and action determination
- **Risk scoring:** Score calculation and level assignment
- **Edge cases:** Empty input, special characters, Unicode, very long text

### MCP Server Tests (`mcp-server/test.js`)

Tests the MCP server:

- **Tool registration:** All 6 tools are registered
- **Tool execution:** Each tool returns expected output format
- **Error handling:** Invalid input, missing parameters
- **Killswitch:** Killswitch blocks tool execution when active

### Browser Tests (Manual)

The browser extension is tested manually:

- **Paste interception:** Tested on ChatGPT, Claude, Gemini, Copilot, Gmail
- **Copy interception:** Tested on all supported platforms
- **Typing detection:** Tested with various typing speeds and IME input
- **Rich editor support:** Tested with ProseMirror, contenteditable
- **Popup UI:** Tested for all states (active, paused, inactive)
- **Options page:** Tested for all configuration options
- **Audit log:** Tested for recording, viewing, exporting, clearing

## 13.3 Test Categories

### Unit Tests

- Individual pattern matching functions
- Validator functions (Luhn, format validation)
- Redaction text generation
- Risk score calculation
- Policy selection and action determination
- Regex safety validation

### Integration Tests

- Full detection pipeline (input → findings → redaction)
- Policy evaluation with context
- Audit event generation
- Config import/export validation

### Browser Tests

- Content script injection
- Event interception (paste, copy, typing)
- Message passing between content script and service worker
- Storage operations (sync, local)
- Badge state management

### MCP Tests

- Tool listing
- Tool execution with valid/invalid input
- Killswitch enforcement
- Config file read/write

## 13.4 Future Test Coverage

| Area | Current | Target |
|------|---------|--------|
| Engine unit tests | Basic | Comprehensive (all patterns, all validators) |
| Engine integration tests | None | Full pipeline tests |
| Browser extension tests | Manual | Automated with Puppeteer/Playwright |
| MCP server tests | Basic | Comprehensive |
| Windows agent tests | None | Unit + integration |
| Security tests | None | Fuzzing, ReDoS testing |
| Performance tests | None | Benchmark suite |

---

# 14. Deployment Architecture

## 14.1 Current Deployment

### Browser Extension

**Distribution:** Chrome Web Store  
**Update mechanism:** Automatic (Chrome handles updates)  
**Version:** 2.4.0  
**Permissions:** Minimal (storage, contextMenus)

**Build process:**
1. `scripts/build.js` — Validates manifests, generates icons, creates zip
2. GitHub Actions CI — Lints, tests, builds on every push
3. GitHub Actions Release — Builds and prepares for CWS submission

### MCP Server

**Distribution:** npm (planned) or manual install  
**Installation:**
```bash
git clone https://github.com/designx-studio/MaskIt.git
cd maskit/mcp-server
npm install
node server.js
```

**Claude Desktop integration:**
```json
{
  "mcpServers": {
    "maskit": {
      "command": "node",
      "args": ["path/to/maskit/mcp-server/server.js"]
    }
  }
}
```

## 14.2 Future Deployment

### Windows Agent

**Distribution:** Windows installer (MSI)  
**Installation:** Silent install for enterprise deployment  
**Update mechanism:** Auto-update via GitHub Releases

### Organization Deployment

**Policy distribution:** Centralized policy pushed via config file or future cloud dashboard  
**Killswitch:** Enterprise-wide disable of AI tools  
**Compliance reporting:** Centralized audit log aggregation

---

# 15. Scalability Roadmap

## 15.1 Phase 1: Browser + MCP (Current)

**Status:** Complete (v2.4.0)

**Capabilities:**
- Browser extension for Chrome-based browsers
- MCP server for Claude Desktop and MCP-capable tools
- Shared detection engine
- Local audit logging
- Custom rules and policies

## 15.2 Phase 2: Windows Agent (In Development)

**Status:** In development

**Capabilities:**
- System-wide clipboard monitoring
- Foreground application detection
- AI tool identification
- System tray UI
- File-based audit logging

**Architecture impact:** The Windows agent uses the same detection and policy engine concepts, ported to C#. It extends protection from browser-only to system-wide.

## 15.3 Phase 3: IDE Integrations (Planned)

**Status:** Planned

**Capabilities:**
- VS Code extension
- JetBrains plugin
- Real-time code scanning
- Pre-commit hooks
- AI-powered IDE protection

**Architecture impact:** IDE plugins will use the MCP server or a language-specific port of the detection engine.

## 15.4 Phase 4: Organization Dashboard (Planned)

**Status:** Planned

**Capabilities:**
- Centralized policy management
- Audit log aggregation
- Compliance reporting
- User management
- Alerting and notifications

**Architecture impact:** Requires a cloud backend (Node.js API + database) and a web frontend (React/Next.js).

## 15.5 Phase 5: Enterprise Policy Management (Planned)

**Status:** Planned

**Capabilities:**
- Role-based access control
- SIEM integration (Splunk, ELK)
- LDAP/Active Directory integration
- Advanced killswitch (scheduled, user-specific)
- Compliance frameworks (SOC2, HIPAA, PCI-DSS)

**Architecture impact:** Requires enterprise-grade authentication, authorization, and integration with existing enterprise infrastructure.

## 15.6 Architecture Support for Growth

The architecture is designed to scale across all phases:

- **Shared engine:** The detection engine is a standalone module that can be embedded in any component
- **JSON-based rules:** Rules can be updated without code changes
- **MCP protocol:** Standardized interface for any MCP-capable tool
- **Local-first:** Each component operates independently, no central dependency
- **Audit schema:** Standardized event format across all components

---

# 16. Engineering Decisions and Tradeoffs

## 16.1 Why Local-First?

**Decision:** All detection and redaction happens on-device.

**Rationale:**
- Privacy: No data leaves the user's machine
- Latency: <5ms vs 100ms+ for cloud-based DLP
- Offline: Works without internet
- Compliance: No data residency concerns
- Cost: No cloud infrastructure required

**Tradeoff:** Cannot use ML-based detection (requires cloud). Regex-based detection is less accurate but more private and faster.

## 16.2 Why Shared Engine?

**Decision:** A single detection engine shared across all components.

**Rationale:**
- Consistency: Same detection logic everywhere
- Maintainability: One codebase to update
- Testing: One test suite for core logic
- Portability: Can be embedded in any JavaScript environment

**Tradeoff:** The engine must be ported to C# for the Windows agent. This creates a maintenance burden for keeping the two implementations in sync.

## 16.3 Why Regex Rules?

**Decision:** Use regex patterns for detection rather than ML or heuristic approaches.

**Rationale:**
- Deterministic: Same input always produces same output
- Fast: Regex matching is O(n) for well-formed patterns
- Transparent: Rules are human-readable and auditable
- No training data: No need for labeled datasets
- No false positives from ML uncertainty

**Tradeoff:** Cannot detect obfuscated or novel patterns. For example, a base64-encoded API key would not be detected.

## 16.4 Why Browser Extension First?

**Decision:** Start with a browser extension rather than a desktop application.

**Rationale:**
- Fastest time to market: Extension development is rapid
- Largest addressable market: Most AI interactions happen in the browser
- Platform independence: Works on Windows, macOS, Linux
- Distribution: Chrome Web Store provides built-in distribution
- Permissions: Browser extensions have well-defined security boundaries

**Tradeoff:** Cannot protect desktop AI applications, IDE interactions, or terminal-based AI tools.

## 16.5 Why Windows Agent?

**Decision:** Develop a Windows-specific agent for system-wide protection.

**Rationale:**
- System-wide coverage: Protects all applications, not just browser
- Clipboard monitoring: Catches copy operations from any source
- Foreground detection: Knows which app is being used
- Enterprise deployment: Can be deployed via Group Policy
- No browser dependency: Works even without a browser

**Tradeoff:** Windows-only (for now). Requires .NET runtime. More complex development and distribution.

## 16.6 Why Not Compete with Endpoint Security Vendors?

**Decision:** Position Maskit as a complementary layer, not a replacement for enterprise DLP.

**Rationale:**
- Focus: Maskit solves one specific problem (AI data leakage) extremely well
- Integration: Can work alongside existing DLP tools
- Adoption: Lower barrier to entry for individual developers
- Distribution: Browser extension is easier to adopt than enterprise software

**Tradeoff:** Organizations may need both Maskit and traditional DLP for complete coverage.

## 16.7 Why Manifest V3?

**Decision:** Use Chrome's Manifest V3 extension platform.

**Rationale:**
- Future-proof: MV2 is being deprecated
- Security: Stricter CSP, no remote code execution
- Performance: Service worker is more efficient than persistent background page
- Compliance: Required for Chrome Web Store listing

**Tradeoff:** MV3 has limitations:
- Service worker cannot use DOM APIs
- Service worker can be terminated by the browser
- `importScripts` is the only module system
- No `chrome.webRequest` (not needed for Maskit)

## 16.8 Why Deterministic Hashing for Audit?

**Decision:** Use SHA-256 with per-installation salt for audit tokens.

**Rationale:**
- Traceability: Same value always produces same token
- Privacy: Raw values are never stored
- Security: Salt prevents rainbow table attacks
- Performance: SHA-256 is fast in both Node.js and browser

**Tradeoff:** If the salt is lost, previously hashed values cannot be matched to new hashes.

---

# 17. Final Architecture Summary

## 17.1 What Maskit Is Today

Maskit is a **local-first, real-time data loss prevention browser extension** that protects sensitive data from being exposed to AI models. It uses a shared detection engine with regex-based pattern matching, policy-based decision making, and local audit logging. It also provides an MCP server for integration with Claude Desktop and other MCP-capable tools.

**Current capabilities:**
- Real-time paste, copy, and typing interception
- Detection of 8 PII types and 30+ API key patterns
- Policy-based allow/redact/block decisions
- App-specific policy overrides
- Local audit logging with 30-day retention
- Custom regex rules
- Config import/export
- MCP server with 6 tools
- Keyboard shortcuts (Alt+Shift+M, Alt+Shift+P)

## 17.2 What It Becomes

Maskit evolves from a browser extension into a **universal AI trust layer**:

- **Phase 1 (Current):** Browser + MCP — protects browser-based AI interactions
- **Phase 2 (In Development):** Windows Agent — system-wide clipboard protection
- **Phase 3 (Planned):** IDE Integrations — protects developer workflows
- **Phase 4 (Planned):** Organization Dashboard — centralized management
- **Phase 5 (Planned):** Enterprise Console — enterprise-grade policy and compliance

## 17.3 Why the Architecture Is Unique

1. **Local-first by design:** Unlike cloud DLP solutions, Maskit processes everything on-device. This is not a feature — it's a fundamental architectural principle.

2. **Shared engine, multiple surfaces:** The same detection engine powers the browser extension, MCP server, and (via port) the Windows agent. This ensures consistent behavior across all protection surfaces.

3. **Defense in depth:** Multiple interception layers (browser events, clipboard, MCP protocol) provide overlapping protection. If one layer fails, others catch the data.

4. **Deterministic detection:** Regex-based detection with validators provides predictable, auditable results. No ML black boxes.

5. **Privacy-preserving audit:** Audit events use deterministic hashing to enable traceability without exposing sensitive values.

## 17.4 Core Engineering Strengths

| Strength | Description |
|----------|-------------|
| **Zero dependencies** | The detection engine has no npm dependencies. It can run anywhere JavaScript runs. |
| **Portable** | The engine is a single file that works in Node.js, browsers, and can be ported to other languages. |
| **Fast** | Detection completes in <5ms for typical inputs. No network latency. |
| **Secure** | Minimal permissions, no data transmission, no telemetry, no remote code execution. |
| **Deterministic** | Same input always produces same output. No ML uncertainty. |
| **Auditable** | Every detection event is logged with a structured schema. |
| **Extensible** | Custom rules, app-specific policies, and configurable severity allow users to tailor protection. |
| **Offline** | Works completely offline. No internet connection required. |

---

*This document is maintained by the Maskit engineering team. For questions, corrections, or updates, please open an issue or pull request on the [Maskit repository](https://github.com/designx-studio/MaskIt).*