# Maskit Architecture

## Purpose

Maskit protects sensitive information before it reaches AI tools. It operates locally across AI web applications, MCP clients, and Windows desktop workflows.

## Runtime layout

```text
engine/                    authoritative JavaScript core
  detector.js              detection, validation, scoring, redaction
  settings.js              configuration, policy, audit helpers
  index.js                 public core API

browser extension          DOM and browser adapter
mcp-server/                MCP transport and tool adapter
maskit-agent/              Windows clipboard and foreground-app adapter
maskit-core/               rule, policy, and audit data source
```

## Core contract

The core owns detection rules, validation, redaction, policy evaluation, risk scoring, rule management, and audit event creation. Adapters own only platform concerns: DOM events, MCP transport, or Windows clipboard/window APIs.

Core operations are `scanText`, `redactText`, `evaluatePolicy`, `getRules`, and `getStatus`. Findings include type, value, severity, and rule name. Scan results include findings, all findings, policy decisions, redacted text, risk score, risk level, and audit events.

## Browser flow

The Manifest V3 content script runs only on configured AI hosts. Paste, copy, typing, selection, and browser AI interception events are scanned locally. The service worker manages pause state, settings, statistics, and audit storage. No page content is sent to a network service.

## MCP flow

The MCP server validates tool input, applies app-specific configuration and killswitch rules, delegates detection and policy decisions to `engine/`, and returns JSON results. Tools are transport adapters, not a second detection engine.

## Windows flow

The Windows agent monitors clipboard changes, identifies the foreground application, applies policy, redacts or blocks content, and writes local audit events. Its rule and policy behavior must remain parity-tested against the JavaScript core until generated cross-language artifacts replace the remaining C# implementation.

## Security boundaries

- Host permissions are restricted to AI web applications.
- Detection and redaction are local.
- Raw sensitive values are not stored in audit events.
- Custom regexes are length- and complexity-validated.
- MCP inputs are validated before engine calls.
- Killswitch and app-specific policies are enforced before AI-facing operations.

## Known boundary

`maskit-core` is the intended language-independent data source. The current JavaScript core still contains compatibility definitions while the data-loading migration is completed. Do not add new rules to browser or agent adapters.
