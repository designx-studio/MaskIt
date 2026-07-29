# MaskIt Product Roadmap

## Vision

MaskIt is a local-first AI Context Security Platform that protects sensitive information before it reaches AI systems, coding assistants, autonomous agents, and AI workflows.

MaskIt is not a replacement for Data Loss Prevention (DLP).

MaskIt exists to become the trusted security layer between humans and AI.

The future of work will involve:

- AI assistants
- Coding agents
- Autonomous workflows
- MCP tools
- AI-powered applications
- Human and machine collaboration

Traditional security controls were designed around networks, applications, and files.

AI introduces a new security boundary:

**Context.**

MaskIt protects the movement of sensitive context wherever it happens.

---

# Core Security Model

Every MaskIt capability follows the same pipeline:

Human ↓ Application ↓ Context ↓ MaskIt Decision Engine ↓ Allow / Warn / Redact / Block ↓ Evidence ↓ Enterprise Management (optional)

All integrations use:

- One detection engine
- One policy language
- One evidence model
- One security decision process

MaskIt secures context, not applications.

---

# Product Principles

## Always

- Local-first enforcement
- Explainable findings
- No raw customer data uploaded
- Open and verifiable security model
- Simple deployment
- Honest security claims
- Privacy-preserving evidence
- Consistent behaviour across all integrations

## Never

MaskIt will not become:

- A generic DLP replacement
- A secure browser
- An AI model host
- A prompt proxy
- Surveillance software
- A keylogger
- A kernel-level security product
- A compliance certification provider

---

# Current Product State

## Version

v2.4.x

## Completed

- Browser extension
- Chrome, Edge, Firefox, Opera support
- Shared detection engine
- Browser, CLI, MCP, and Windows parity
- Canonical audit event schema
- Local audit logging
- Hash-chained evidence
- Secret detection
- Personal information detection
- Financial information detection
- Redaction engine
- Allow, redact, block policies
- Windows clipboard agent
- CLI scanner
- MCP scanner
- Pilot documentation package
- Evidence package
- Release automation
- Checksums

---

# Current Gaps

## Product

- Microsoft Copilot browser support incomplete
- No browser file upload scanning
- No IDE integrations
- No enterprise deployment package
- No central policy management
- No device visibility

## Deployment

- Windows agent requires manual installation
- Browser extension requires developer mode installation
- No MSI package
- No Intune deployment
- No auto-update channel

---

# Architecture

## Layer 1: Browser Extension

### Purpose

Protect browser-based AI interactions.

### Coverage

- ChatGPT
- Claude
- Gemini
- Perplexity
- Microsoft Copilot Web
- Future AI websites

### Functions

- Typing detection
- Paste interception
- File upload scanning
- Local policy enforcement
- User warnings
- Evidence generation

### Status

Mostly complete.

Remaining:

- Copilot compatibility improvements
- File upload scanning

---

# Layer 2: Windows Agent

## Purpose

Protect AI usage across Windows applications.

The Windows agent is the long-term answer for Microsoft-heavy environments because it does not depend on changing website interfaces.

### Coverage

- Clipboard activity
- Teams
- Outlook
- Word
- Edge sidebar
- Desktop applications
- Microsoft Copilot surfaces

### Functions

- Clipboard inspection
- Redaction
- Blocking
- Local policy enforcement
- Notifications
- Audit generation

### Future capabilities

- Health reporting
- RMM integration
- Enterprise deployment

### Status

Built.

Remaining:

- MSI installer
- Intune support
- Code signing
- Health endpoint

---

# Layer 3: IDE Security

## Purpose

Protect developers where sensitive information is created.

IDE protection is the highest-value developer security layer because it detects secrets before they reach:

- Clipboard
- Git repositories
- AI assistants
- External systems

## Supported IDEs

Initial:

- Visual Studio Code

Future:

- Visual Studio
- JetBrains IDEs

Including:

- IntelliJ
- Rider
- WebStorm
- PyCharm
- GoLand

## Features

- Hardcoded secret detection
- API key detection
- Credential detection
- Confidence scoring
- Security explanations
- Fix suggestions
- AI assistant context scanning

## Why IDE instead of file system monitoring

MaskIt will not build kernel drivers or file system filter drivers.

The IDE already knows:

- Active files
- Selected code
- User intent
- AI requests
- Project context

IDE integrations provide better accuracy without becoming an endpoint security vendor.

---

# Layer 4: Git and CI Security

## Purpose

Prevent sensitive information from entering development pipelines.

## Features

- Pre-commit scanning
- Repository scanning
- Pull request scanning
- CI enforcement
- Secret detection
- Developer feedback

## Status

GitHub Action exists.

Future:

- Pre-commit hooks
- Multi-platform CI support

---

# Layer 5: MCP and AI Agent Security

## Purpose

Protect autonomous AI workflows.

AI agents introduce new risks:

- Tool access
- File access
- Repository access
- Autonomous decisions

## Features

- MCP gateway
- Tool permissions
- Context filtering
- Agent permissions
- Approval workflows
- Agent activity audit trail

## Supported future targets

- Claude Code
- GitHub Copilot
- Cursor
- Windsurf
- OpenCode
- Cline

## Status

MCP scanner exists.

Gateway enforcement planned.

---

# Enterprise Integration Strategy

## Philosophy

MaskIt should not become another dashboard administrators must monitor.

Security teams already use:

- Microsoft Intune
- Microsoft Sentinel
- Splunk
- Elastic
- RMM platforms
- Identity providers
- Alerting platforms

MaskIt should integrate into existing workflows.

The principle:

> MaskIt provides local enforcement and security evidence while existing enterprise systems provide management, monitoring, and response.

---

# Enterprise Operability Foundation

## Windows Health Interface

Purpose:

Allow existing IT tools to monitor MaskIt.

Expose:

- Agent status
- Version
- Policy version
- Last heartbeat
- Rules loaded
- Detection statistics
- Service uptime

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

Compatible with:

NinjaOne

ConnectWise

Datto

Kaseya

Atera

N-able



---

SIEM Integration

MaskIt should export security evidence into existing security platforms.

Support:

JSON events

Common Event Format (CEF)

Syslog


Supported:

Microsoft Sentinel

Splunk

Elastic Security

IBM QRadar


Events include:

Device

User

Application

Finding category

Severity

Action taken

Policy applied

Timestamp


Events never include:

Prompts

Secrets

Clipboard contents

Files

Source code



---

Security Webhooks

Allow MaskIt events to trigger existing workflows.

Examples:

Microsoft Teams

Slack

PagerDuty

Opsgenie


Example:

{
 "event":"critical_finding",
 "device":"DESKTOP-001",
 "findingType":"API_KEY",
 "severity":"critical",
 "action":"blocked"
}


---

Roadmap

Phase 1: Production Foundation

Timeline

0 to 3 months

Goal

Make MaskIt reliable, installable, and ready for design partners.

Priorities

Microsoft Copilot Support

Fix textarea detection

Improve Microsoft AI host handling

Support M365 Copilot domains

Test Edge sidebar scenarios


Browser File Upload Protection

Protect:

CSV files

Excel files

Word documents

PDFs

Source code

Configuration files

Environment files


Flow:

User selects file
       ↓
Local scan
       ↓
Detection
       ↓
Policy decision
       ↓
Allow / Redact / Block
       ↓
Upload continues or stops

Windows Enterprise Deployment

Build:

Signed MSI installer

Silent installation

Intune package

Group Policy support

Auto-update



---

Phase 2: Developer Security Platform

Timeline

3 to 6 months

Goal

Protect developers at the point where sensitive information is created.

Features:

VS Code extension

Git pre-commit protection

Repository scanning

CI security checks

Detection explanations

False positive feedback loop



---

Phase 3: Enterprise Management and Governance

Timeline

6 to 12 months

Goal

Provide optional enterprise governance without collecting private data.

Features:

Device Management

Device inventory

Version tracking

Health status

Policy status


Policy Management

Central policy creation

Policy approval

Signed policy bundles

Rollback

Group assignment


Reporting

Provide:

Detection summaries

Risk categories

Security posture

Evidence reports


Never store:

Prompts

Secrets

Clipboard history

Private files



---

Phase 4: AI Workflow Protection

Timeline

12 to 18 months

Goal

Secure autonomous AI systems.

Features:

MCP Gateway

Tool permissions

Resource permissions

Context filtering

Approval workflows

Trust scoring


Agent Security

Agent identity

Permission boundaries

Repository controls

Command execution controls

Agent activity timeline



---

Phase 5: Enterprise Platform

After product adoption.

Features:

Organisation management

Device enrolment

SSO

Role-based access

Compliance reporting

SIEM integrations

Mandatory policies



---

Phase 6: MSP Platform

After enterprise success.

Features:

Multi-tenant management

Customer isolation

Per-client policies

Fleet reporting

RMM integrations

Licensing management


Integrations:

ConnectWise

Kaseya

Autotask

HaloPSA



---

Known Limitations

MaskIt will not monitor:

Native application typing without clipboard interaction

Terminal keyboard input

Voice input

Screen capture

AI systems outside supported integrations


These require invasive monitoring techniques that conflict with MaskIt's privacy principles.


---

Definition of Success

MaskIt succeeds when:

Developers install it easily

Security teams trust the evidence

Organisations secure AI usage without surveillance

Existing security investments are extended

AI adoption becomes safer

One policy protects browsers, IDEs, Git, CI, and agents



---

Long-Term Vision

Browser
 ↓
Clipboard
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

One detection engine.

One policy language.

One evidence model.

Everywhere AI work happens.