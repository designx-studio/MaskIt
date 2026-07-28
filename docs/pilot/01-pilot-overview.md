# MaskIt pilot overview

**Version:** 2.4.0  
**Audience:** Enterprise design partners evaluating MaskIt for AI context protection

## What MaskIt does

MaskIt is a **local-first** control that detects structured sensitive data (secrets, credentials, selected PII/financial patterns) and applies a policy action before that content is submitted or pasted into **supported** AI workflows.

Flow: **Detect → Classify → Decide (allow / redact / block) → Protect → Audit**

## Problem it solves

Teams paste credentials, customer identifiers, and internal data into AI chats and tools by accident. Traditional network DLP often never sees browser-typed content. MaskIt places a decision point **on the device**, at the moment of paste/type/clipboard/tool input.

## Supported surfaces

| Surface | Status | What it protects |
|---------|--------|------------------|
| **Browser extension** | Primary | ChatGPT, chat.openai.com, Claude, Gemini, Copilot, Cursor (manifest hosts) |
| **CLI** | Optional | Text/files in scripts and CI |
| **MCP server** | Optional | Tool calls for Claude Desktop, Cursor, and other MCP clients |
| **Windows agent** | Optional **beta** | **System clipboard** updates only |

## What success looks like

- Accidental secrets/PII are redacted or blocked on listed browser hosts
- Local audit events record type, action, policy, confidence, and a value **hash** (not the raw secret)
- Admins can export audit metadata and tune policy without sending prompts to a Maskit cloud

## Explicit limitations

- **Not full DLP.** Does not cover email, USB, screenshots, or all browsers/apps.
- **Not all AI apps.** Only listed host patterns and optional adapters.
- **Not compliance certification.** No SOC 2 / ISO 27001 / GDPR certification claim.
- **Not fleet management.** No central console, multi-tenancy, or remote killswitch.
- **Pattern detection** can miss novel formats and may false-positive.
- **Windows beta** cannot see data that never reaches the clipboard.
- **Browser install** is sideloaded (Load unpacked) unless your org uses an enterprise distribution path.
- Audit hashes are **irreversible SHA-256 of matched values** (not salted HMAC in v2.4.0).

## Next documents

1. [Installation guide](02-installation-guide.md)  
2. [Admin guide](03-admin-guide.md)  
3. [User guide](04-user-guide.md)  
4. [Security whitepaper](05-security-whitepaper.md)  
5. [Data handling statement](06-data-handling-statement.md)  
6. [Pilot scope](pilot-scope.md)  
7. [Claims ↔ evidence](../claims-evidence-matrix.md)  
