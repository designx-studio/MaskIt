# Maskit Core Contract

`engine/` is the current JavaScript authority for detection, redaction, policy evaluation, risk scoring, and audit event creation. Browser, MCP, and Windows integrations must treat these result shapes as the compatibility boundary while the remaining runtime duplication is removed.

## Required operations

- `scanText(text, settings)`
- `redactText(text, settings)`
- `evaluatePolicy(text, settings)`
- `getRules(settings)`
- `getStatus()`

## Required parity fields

Findings must include `type`, `value`, `severity`, and `ruleName`. Scan results must include `findings`, `allFindings`, `policyDecisions`, `redactedText`, `riskScore`, `riskLevel`, and `events`.

## Refactor rule

New detection rules and policy changes belong in the shared core first. Browser DOM handling stays in the extension adapter. MCP transport stays in `mcp-server`. Windows clipboard and foreground-window handling stays in `maskit-agent`. No surface may add a second detector for the same data type.

## Current limitation

The Windows agent and browser adapter still contain duplicated implementation. Cross-runtime parity tests and generated browser/C# rule artifacts are required before that duplication can be deleted safely.
