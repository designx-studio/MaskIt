```markdown
# MaskIt Product Roadmap

## Vision

MaskIt is the local-first AI Context Security Platform that protects sensitive
information before it reaches AI systems, coding assistants, autonomous agents,
and AI workflows.

Detection, classification, policy enforcement, and evidence generation happen on
the endpoint. Cloud services exist only for management and governance. Raw
prompts, clipboard contents, secrets, and private files never leave the device.

The goal is not to replace Data Loss Prevention (DLP).

The goal is to become the trusted security layer between users and AI.

---

## Core Mental Model

Every MaskIt capability plugs into one pipeline:

```
Human
  ↓
Application
  ↓
Context
  ↓
MaskIt Decision Engine
  ↓
Allow / Warn / Redact / Block
  ↓
Evidence
  ↓
Enterprise Management (optional)

```

Browser extension, Windows agent, IDE integrations, Git hooks, CI enforcement,
MCP server, and AI agent controls are all entry points into the same engine with
the same rules, the same policy language, and the same evidence format.

MaskIt secures context, not applications.

---

## Guiding Principles

### Always

- Local first
- Explain every finding
- Never upload raw customer data
- Open and verifiable
- Simple deployment
- Honest security claims
- One engine, one evidence model, one policy language across every surface

### Never

- Generic DLP replacement
- Secure browser replacement
- AI model hosting
- Prompt proxy
- Surveillance software
- Keylogging
- Kernel drivers or file system filter drivers
- False compliance claims

---

## Current State (v2.4.x)

### Completed

- Browser extension (Chrome, Edge, Firefox, Opera)
- Shared detection engine across all adapters
- Browser, CLI, MCP, and Windows parity
- Canonical audit events (schema 1.0)
- Local audit logging with hash-chained evidence
- Shared rule engine from maskit-core
- Windows clipboard agent
- CLI
- MCP server
- Pilot documentation and evidence package
- Release automation with checksums

### Current gaps

- Microsoft Copilot support incomplete (textarea detection failing)
- No file upload scanning
- Windows agent requires manual ZIP extraction — no MSI
- Browser extension requires Load Unpacked — no Web Store listing
- No central policy management
- No device visibility across an organisation

---

## Architecture

### Layer 1 — Browser Extension

**Purpose:** Protect browser-based AI interactions

**Coverage:**
- ChatGPT
- Claude
- Gemini
- Perplexity
- Microsoft Copilot Web
- Any future AI website

**Functions:**
- Typing detection
- Paste interception
- File upload scanning

**Status:** Mostly built. Copilot textarea fix and file upload scanning
remaining.

---

### Layer 2 — Windows Agent

**Purpose:** Protect Windows regardless of browser or application

**Coverage:**
- Clipboard from any application
- Copilot in all Microsoft surfaces (Teams, Outlook, Word, Edge sidebar,
  taskbar)
- Any desktop application that uses the clipboard

**Functions:**
- Clipboard interception and redaction
- Local audit logging
- Policy enforcement
- User notifications

**Status:** Built. Needs MSI installer, Intune deployment, auto-update, and
health monitoring.

**Note:** The Windows agent is the correct long-term answer for Microsoft
Copilot. Microsoft will keep changing their web UI but the clipboard is always
the clipboard.

---

### Layer 3 — IDE Integrations

**Purpose:** Catch secrets at the point of creation, before they reach Git,
clipboard, or AI

**Coverage:**
- Visual Studio Code
- Visual Studio
- JetBrains (IntelliJ, Rider, WebStorm, PyCharm, GoLand)

**Why IDE over file system watching:**
The IDE already knows the active file, selected code, AI chat request, Copilot
context, and file contents. Detection inside the IDE is far more accurate than
inferring intent from OS file events. File system filter drivers and kernel
approaches are complex, expensive to maintain, and put MaskIt in competition
with endpoint security vendors. IDE integrations achieve better results without
that complexity.

**Functions:**
- Hardcoded secret detection
- API key and credential scanning
- Confidence scores and explanations
- Fix suggestions
- Copilot and AI assistant context scanning

**Status:** Not built. Highest value for developer workflows.

---

### Layer 4 — Git and CI

**Purpose:** Prevent secrets before they leave the development environment

**Functions:**
- Pre-commit scanning
- Repository scanning
- Pull request scanning
- CI pipeline enforcement

**Status:** GitHub Action exists. Pre-commit hook and CI integration remaining.

---

### Layer 5 — MCP and AI Agents

**Purpose:** Protect autonomous AI workflows and agent-to-agent context

**Coverage:**
- MCP servers
- Claude Code
- GitHub Copilot
- Cursor
- Windsurf
- OpenCode
- Cline
- Future AI agent workflows

**Functions:**
- Tool permission control
- Context filtering before tool calls
- Agent permission boundaries
- Context passed between agents
- Approval workflows for high-risk actions
- Audit trail for autonomous actions

**Status:** MCP server exists as a scanner. Gateway enforcement not yet built.
This is the long-term differentiator.

---

## Enterprise Deployment

### Requirements for enterprise adoption

- Signed MSI installer for silent deployment
- Intune and SCCM compatible packaging
- Group Policy deployable browser extension
- Auto-update mechanism
- Health monitoring and heartbeat
- All binaries properly code-signed

### Positioning alongside existing security platforms

MaskIt extends enterprise AI security into local AI interactions and third-party
AI tools while complementing existing security platforms such as Microsoft
Purview, CrowdStrike, Palo Alto, Broadcom, and Trellix.

Existing security platforms protect corporate infrastructure.
MaskIt protects AI interactions wherever they occur.
Together they provide broader coverage.

**What existing platforms cover well:**
- Traditional file sharing controls
- Email DLP
- SharePoint and OneDrive
- Teams message scanning
- Microsoft AI surfaces

**Where MaskIt adds coverage:**
- ChatGPT and third-party AI websites
- Claude, Perplexity, and other non-Microsoft AI
- AI coding tools outside the Microsoft ecosystem
- Consumer AI tools that bypass the corporate perimeter
- Shadow AI that IT cannot see
- Browser-based AI on any device

---

## Roadmap

### Immediate (30 to 60 days)

**1. Complete Microsoft Copilot support**

Copilot is becoming the default AI assistant inside Microsoft 365. Failure to
support it is a blocker for enterprise conversations.

- Fix textarea detection in content.js and editors.js
- Add m365.cloud.microsoft to manifest host permissions
- Improve DOM resilience across Microsoft AI hostnames
- Test across Copilot Web, M365 Copilot app, and Edge sidebar

**2. Browser file upload scanning**

The highest remaining security gap. Files contain far more sensitive data than
typed prompts and users are unaware of what is inside files they upload.

Supported file types:
- CSV, Excel, Word, PDF
- Text, source code, configuration files
- .env, JSON, YAML, XML

Flow:
```

User selects file
  ↓
Local scan in browser before upload
  ↓
Findings detected
  ↓
Review dialog shown to user
  ↓
Allow / Redact / Block
  ↓
Upload proceeds or is prevented
```

No cloud required. Everything local.

**3. Windows agent enterprise deployment**

Replace portable ZIP with:
- Signed MSI installer
- Silent installation support
- Intune deployment package
- Group Policy compatible
- Auto-update mechanism

---

### Phase 2 — Developer Security (3 to 6 months)

**VS Code Extension**

First IDE integration. Catches secrets at the point of creation.

- Hardcoded secret detection in active files
- API key and credential scanning
- Explanations and confidence scores
- Fix suggestions
- AI chat context scanning
- Copilot request scanning

**Chrome Web Store and Edge Add-ons listing**

Removes Load Unpacked barrier for enterprise. Enables force-install via Group
Policy and Intune.

**Git pre-commit hook**

- Local secret scanning before commit
- Blocks commits containing credentials
- Explanation of what was found and why

**JetBrains plugin**

After VS Code proves successful. Covers IntelliJ, Rider, WebStorm, PyCharm,
GoLand.

---

### Phase 3 — Lightweight Admin Console (6 to 12 months)

Not a SIEM. Not a replacement for Microsoft Defender. A focused answer to one
question: what is happening across our devices?

**Device visibility:**
- Online and offline status
- MaskIt version
- Policy version
- Last heartbeat

**Policy management:**
- Create and version policies
- Assign to devices or groups
- Rollback capability
- Signed policy bundles that enforce locally even if cloud is unavailable

**Activity summary:**
- Findings today
- Blocks, redactions, warnings
- Risk categories (API keys, PII, financial, credentials)

**Principles:**
- Never raw prompts
- Never clipboard contents
- Never customer files
- Aggregated metadata only

**SIEM export** for organisations that need audit data in existing security
platforms.

---

### Phase 4 — AI Workflow Protection (12 to 18 months)

Expand the MaskIt decision engine into autonomous AI workflows.

**MCP Security Gateway:**
- Tool allowlists and denylists
- Context filtering before tool calls
- Approval workflows for high-risk actions
- Trust scoring for MCP servers
- Response scanning before content returns to client

**AI Agent Controls:**
- Agent identity and permission boundaries
- Repository and file access scope
- Command execution controls
- Agent activity timeline
- Context passed between agents

---

### Phase 5 — Enterprise Platform

Only after significant adoption.

- Organisation management
- Device enrolment at scale
- Fleet management
- SSO integration
- Full SIEM export
- Compliance reporting
- Role-based access control
- Mandatory policy enforcement

---

### Phase 6 — MSP Platform

Only after enterprise succeeds.

- Multi-tenant architecture
- Customer isolation
- Per-customer policies
- Fleet management per customer
- Health monitoring
- Licensing management
- Remote deployment

---

## Known Limitations

The following scenarios are not covered and are documented honestly:

- Typing directly into native desktop apps (Teams, Outlook Copilot pane) where
  content is not routed through clipboard
- Terminal input to Claude Code and CLI tools
- Voice input to AI assistants
- AI tools that read screen content such as Copilot+ Recall
- Browsers without the MaskIt extension installed

Catching terminal typing requires OS keyboard hooks. Catching voice requires
audio capture. Catching screen readers requires screen capture. All three cross
into surveillance territory and will not be built. The clipboard agent and
browser extension together cover the vast majority of real-world leak scenarios
without requiring invasive OS access.

---

## Definition of Success

MaskIt succeeds when:

- Developers install it in minutes without IT involvement
- Security teams trust the evidence it produces
- Organisations control AI security policy without seeing private data
- AI tools become safer without blocking everyday work
- The same detection engine protects browsers, IDEs, terminals, agents, and
  workflows
- Enterprise security teams see MaskIt as extending their existing investment,
  not replacing it

---

## Long-Term Vision

```

Browser
  ↓
Clipboard
  ↓
Files
  ↓
IDE
  ↓
Git
  ↓
CI/CD
  ↓
MCP
  ↓
AI Agents
  ↓
Enterprise Governance
```

One policy engine. One evidence model. One detection engine. Everywhere.
# Enterprise Integration Layer

## Philosophy

MaskIt should not become another security dashboard that administrators must monitor.

Enterprise teams already operate through:

- Endpoint management platforms
- RMM tools
- SIEM platforms
- Identity providers
- Alerting systems

MaskIt should integrate into existing workflows.

The goal:

> MaskIt provides local enforcement and security evidence while existing enterprise platforms provide management, visibility, and response.

MaskIt should never require raw prompts, secrets, clipboard contents, or private files to leave the endpoint.

---

# Phase 1.5: Enterprise Operability Foundation

## Timeline

3 to 6 months

## Goal

Make MaskIt deployable, observable, and manageable without requiring a dedicated MaskIt console.

---

## Windows Agent Health Interface

Build a lightweight local health endpoint.

Purpose:

Allow existing IT management tools to monitor MaskIt without custom integrations.

Expose:

- Agent status
- Version
- Policy version
- Last synchronization time
- Rules loaded
- Service uptime
- Detection statistics

Example:

```json
{
  "status": "active",
  "version": "3.0.0",
  "policyVersion": "5",
  "lastSync": "2026-07-29T08:00:00Z",
  "findingsToday": 4,
  "rulesLoaded": 45
}

                 Enterprise Systems

        SIEM       RMM       Identity
          |         |           |

          -----------------------
                    |
              MaskIt Agent
                    |
          -----------------------

 Browser     IDE     CLI     MCP
    |          |      |       |

        Shared Context Engine

              |
        Policy Engine

              |
        Evidence Engine
```