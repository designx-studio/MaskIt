```md
# Maskit Official Product Roadmap

## Vision

Maskit controls sensitive context before it reaches AI systems, agents, tools, and workflows.

Maskit is not becoming a generic Data Loss Prevention (DLP) product, phishing protection tool, secure browser, AI assistant, or cloud proxy that captures every prompt.

Maskit is becoming an **AI Context Security Platform** built around one principle:

> Security decisions should happen at the point where sensitive context moves.

The future of work will involve humans, AI assistants, coding agents, autonomous workflows, Model Context Protocol (MCP) tools, repositories, files, and automated systems sharing information continuously.

Traditional security controls were designed around applications and networks. AI introduces a new security boundary: context.

Maskit provides a local-first security layer that understands:

- What information is being shared
- Where it is being sent
- Who or what is requesting it
- What policy applies
- What action should happen

The enforcement happens locally first.

Management, reporting, and governance can be added later without requiring raw business data or conversations to leave the organization.

---

# Product Philosophy

Maskit follows three security principles:

## 1. Local enforcement first

Sensitive information should be inspected and protected as close as possible to the user action.

Maskit should not require sending raw prompts, clipboard contents, files, or secrets to a cloud service.

The local engine remains responsible for:

- Detection
- Classification
- Policy evaluation
- Redaction
- Blocking
- Evidence generation

Cloud management should only handle:

- Policy distribution
- Device management
- Security posture
- Aggregated evidence

---

## 2. Solve the problems that are technically solvable

AI security conversations often combine multiple problems under one category.

Maskit separates them.

## Problem 1: Secrets and credentials

Examples:

- API keys
- Cloud credentials
- Private keys
- Database passwords
- Tokens

This is a deterministic problem.

High confidence detection is possible through:

- Pattern matching
- Secret formats
- Entropy analysis
- Known provider formats
- Validation checks

Maskit should provide strong protection here.

However, the long-term security goal is also making leaked credentials useless.

Organizations should still implement:

- Short-lived credentials
- Identity federation
- Secret vaults
- Automated rotation
- Least privilege access
- Push protection

Maskit protects the context boundary, but it should not pretend to replace mature identity security.

---

## Problem 2: Structured personal information

Examples:

- Credit card numbers
- Government identifiers
- Health identifiers
- Customer records

These are pattern-based security problems.

Maskit can provide:

- Detection
- Classification
- Redaction
- Policy enforcement
- Audit evidence

Confidence is generally good because the information has structure.

---

## Problem 3: Unstructured business context

Examples:

- Customer strategy
- Pricing negotiations
- Internal architecture
- Product roadmaps
- Confidential business discussions
- Customer-specific debugging information

This is the hardest category.

The industry frequently overpromises here.

Detection quality depends on:

- Data classification maturity
- Company policies
- Context awareness
- User behavior
- Business understanding

Maskit should approach this carefully.

The goal is not to claim perfect detection.

The goal is:

- Better context understanding
- Explainable risk signals
- Policy guidance
- User awareness
- Safer workflows

---

# Current Product Maturity

## Shipped Foundations

Maskit currently has:

- Browser extension for supported AI hosts
- Local detection engine
- Secret and API key detection
- Personal information detection
- Financial information detection
- Redaction engine
- Allow, redact, and block policy actions
- Local audit logging
- MCP server foundation
- Windows clipboard agent foundation
- CLI foundation
- Open source MIT distribution

---

# Current Weaknesses

## Product maturity gaps

- Production release distribution
- Upgrade confidence
- Cross-platform consistency
- Stable event contracts
- Policy synchronization
- Detection explanations
- False positive controls
- Enterprise deployment workflow

## Enterprise gaps

- Central policy management
- Device enrollment
- Fleet visibility
- File boundaries
- Repository boundaries
- MCP permissions
- Agent controls
- Reporting
- Identity integration

---

# Competitive Lessons

Maskit should learn from the market without becoming a copy of existing products.

## AI Governance Platforms

Lesson:

Enterprise buyers need:

- Visibility
- Policy
- Reporting
- Governance

Maskit should eventually support these.

However, governance should come after reliable local enforcement.

---

## AI Workflow Platforms

Lesson:

AI actions need:

- Permissions
- Approval
- Audit trails

Maskit should expand from protecting information into protecting AI actions.

---

## AI Compliance Platforms

Lesson:

Customers value:

- Structured findings
- Risk scores
- Evidence
- Reporting

Maskit should produce useful security evidence without collecting raw content.

---

## Developer AI Security Tools

Lesson:

Adoption happens when:

- Installation is simple
- No account is required initially
- Local execution works
- Technical proof is visible

Developer trust is Maskit's strongest entry point.

---

# Product Positioning

## Category

AI Context Security Platform

## Positioning Statement

Maskit is the local AI security layer that detects sensitive information, enforces policy, and governs AI context before humans or agents share, access, or execute work.

---

# Ideal Customer

## Initial Market

Engineering-led companies:

- 50 to 500 employees
- Heavy AI adoption
- Developers using AI coding tools
- Security-conscious teams
- Limited security staff

## Users

- Developers
- Platform engineers
- Security engineers
- IT administrators
- Engineering managers
- Compliance teams

## Buyers

- Chief Information Security Officer (CISO)
- VP Engineering
- IT Director
- Security Operations
- Privacy teams

---

# Core Advantage

Maskit creates one security boundary across:

- Browser AI usage
- Clipboard
- Command line
- Continuous Integration (CI)
- MCP tools
- Coding agents
- Files
- Repositories

The same policy engine decides:

- Detect
- Classify
- Allow
- Warn
- Redact
- Block
- Record evidence

---

# 18 Month Roadmap

# Phase 1: Production Foundation

## Timeline

0 to 3 months

## Goal

Make Maskit installable, trustworthy, and usable.

---

## Release automation

Problem:

Users cannot reliably install security software.

Build:

- Automated releases
- Versioning
- Checksums
- Package validation
- Upgrade process

Priority:

P0

---

## Installation experience

Goal:

A new user installs Maskit within minutes.

Deliver:

- Browser installation
- CLI installation
- MCP setup
- Windows setup
- Troubleshooting guides

Priority:

P0

---

## Detection improvements

Build:

- Detection benchmarks
- False positive tracking
- Test fixtures
- Confidence scoring

Priority:

P0

---

## Detection explanations

Every finding should explain:

- What was detected
- Why it matched
- Confidence level
- Recommended action

Priority:

P0

---

## Policy engine separation

Separate:

Detection

from

Decision

from

Action

Architecture:

```

Context
|
Detection
|
Classification
|
Policy Decision
|
Action
|
Evidence

```

Priority:

P0

---

## Policy simulation

Before blocking:

Users should test:

- What would match
- What would happen
- What exceptions apply

Priority:

P0

---

## CLI and MCP onboarding

Developer experience should match modern developer tools:

- One command install
- Examples
- Quick tests
- Clear output

Priority:

P0

---

# Phase 2: AI Security Control Layer

## Timeline

3 to 6 months

## Goal

Move from detection into context security.

---

# Context classification

Maskit must understand:

- Data type
- Destination
- Application
- User
- Agent
- Risk

Priority:

P0

---

# Risk scoring

Provide:

- Explainable risk
- Severity
- Recommended action

Priority:

P1

---

# Signed policy bundles

Allow organizations to:

- Create policies
- Approve policies
- Distribute policies
- Roll back changes

Priority:

P0

---

# CI and developer protection

Add:

- Pre-commit scanning
- Repository scanning
- Secret detection
- AI workflow checks

Priority:

P0

---

# File protection

Protect:

- Documents
- Configuration files
- Local projects

Priority:

P1

---

# Repository protection

Protect:

- Source code
- Git history
- Proprietary projects

Priority:

P1

---

# MCP permissions

AI tools need controlled access.

Build:

- Tool permissions
- Resource permissions
- Approval requirements

Priority:

P1

---

# Phase 3: Enterprise Management

## Timeline

6 to 12 months

## Goal

Create a paid management platform.

---

Features:

- Organization accounts
- Device enrollment
- Central policy management
- Fleet visibility
- Security dashboard
- Evidence reporting
- User roles
- Single Sign-On (SSO)
- Security Information and Event Management (SIEM) export

---

# Cloud Management Principles

The cloud layer stores:

- Organization information
- Device status
- Policy versions
- Risk categories
- Security metadata

The cloud does not store:

- Raw prompts
- Clipboard contents
- Secrets
- Private files
- Conversations

Local enforcement continues when cloud services are unavailable.

---

# Phase 4: AI Agent Security Platform

## Timeline

12 to 18 months

## Goal

Protect autonomous AI workflows.

---

# MCP Security Gateway

Build:

- Tool inspection
- Permission control
- Policy enforcement
- Audit trail

---

# Agent Permissions

Agents should not automatically access:

- Every file
- Every repository
- Every tool

Build:

- Scope controls
- Permissions
- Approvals

---

# Repository and File Boundaries

AI coding agents require:

- Explicit access boundaries
- Sensitive file protection
- Change monitoring

---

# Agent Activity Timeline

Provide:

- Actions performed
- Tools called
- Data accessed
- Approvals granted

---

# Technical Architecture

```

Browser
Windows Agent
CLI
CI/CD
MCP Client
Agent Gateway

```
    |
```

Context Normalization

```
    |
```

Detection Engine

```
    |
```

Classification Engine

```
    |
```

Policy Decision Engine

```
    |
```

Action Enforcement

```
    |
```

Evidence System

```
    |
```

Optional Management Cloud

```

---

# Core APIs

```

scanContext(context, policy)

classifyContext(context)

evaluatePolicy(context, findings, policy)

transformContext(context, decision)

recordEvidence(event)

syncPolicyBundle(bundle)

reportDeviceState(state)

```

---

# Business Roadmap

## Stage 1

Developers and technical teams.

Free:

- Browser extension
- CLI
- MCP server
- Local engine
- Audit logs

Paid:

- Support
- Signed policies
- Team controls

---

## Stage 2

Engineering organizations.

Paid features:

- Policy management
- Device enrollment
- CI controls
- Audit reporting

---

## Stage 3

Enterprise security teams.

Paid features:

- SSO
- Roles
- Fleet management
- Agent governance
- SIEM integration

---

## Stage 4

Managed Service Provider (MSP) channel.

Build:

- Multi tenant management
- Customer assessments
- Managed deployment
- Security reports

Only after the core product is mature.

---

# Features Maskit Will Not Build

Maskit will avoid:

- Generic DLP replacement
- Secure browser replacement
- AI model hosting
- Cloud prompt proxy
- Consumer phishing protection
- Broad compliance certification claims
- Dashboard-first development

---

# First Ten Engineering Priorities

1. Ship verified v3 release.
2. Create stable context schema.
3. Create stable evidence schema.
4. Separate detection from policy.
5. Add explanations.
6. Add policy simulation.
7. Improve onboarding.
8. Add CI protection.
9. Add signed policies.
10. Prototype MCP security gateway.

---

# Definition of Maskit Success

Maskit v3 succeeds when:

- Users install without compiling.
- Downloads work.
- Browser, CLI, MCP, and Windows use the same security logic.
- Findings explain themselves.
- Policies can be tested before enforcement.
- Local data remains private.
- Release automation works.
- Documentation matches reality.
- Technical teams use it in production workflows.
- Organizations can adopt AI securely without sending raw business context to Maskit cloud services.

---

# Final Strategic Direction

Maskit should not attempt to solve every AI security problem.

The strongest opportunity is becoming the security layer between human intent, AI systems, and autonomous agents.

Start with deterministic protection:

Secrets.

Structured sensitive data.

Developer workflows.

Then expand carefully into:

Context classification.

Policy governance.

MCP security.

Agent permissions.

The winning product is not an AI DLP replacement.

It is the trusted control layer for AI-enabled work.
```
