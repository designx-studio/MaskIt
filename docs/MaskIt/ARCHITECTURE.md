# Architecture

## System view

```text
Browser content scripts -> browser adapter logic -> local detection/policy -> DOM redaction
MCP request -> mcp-server/server.js -> engine/index.js -> response + local audit file
Windows clipboard -> ClipboardMonitor -> MaskitCoreService -> RuleEngine/PolicyEngine -> clipboard + AuditLogger
```

## Components

### JavaScript engine

`engine/index.js` exports the public engine API. `engine/detector.js` contains pattern matching, validators, risk scoring, policy application, redaction, and event creation. `engine/settings.js` contains defaults, policy helpers, regex limits, site helpers, and audit hashing.

### Browser extension

`manifest.json` injects `settings.js`, `detector.js`, `sanitizer.js`, `editors.js`, and `content.js` on declared AI hosts. `content.js` receives paste, copy, before-input, input, keyup, composition, focus, pause, and context-menu events. It changes DOM values locally and sends statistics and audit events to `background.js`.

### MCP server

`mcp-server/server.js` validates tool arguments, loads configuration, calls the JavaScript engine, persists returned events to the local audit file, and serializes responses for MCP. `mcp-server/config.js` manages OS-specific configuration, overrides, API tokens, and hash salts.

### Windows agent

`Program.cs` loads configuration, rule artifacts, policy artifacts, and the foreground detector. `MaskitCoreService` performs the adapter-level scan, policy decision, risk score, redaction, and audit event projection. `ClipboardMonitor` owns Win32 clipboard I/O and delegates content decisions to the service. `AuditLogger` writes structured local JSONL records with chain hashes.

## Data flow

1. A surface receives text.
2. The adapter creates source and application context.
3. The engine or Core adapter detects findings.
4. Validators reject false positives where configured.
5. Risk score and risk level are calculated.
6. Policy actions are selected: `allow`, `redact`, or `block`.
7. Actionable findings are redacted locally.
8. Audit metadata is emitted without raw matched values in the JavaScript engine.

## Important boundary

The repository has a shared contract and shared artifacts, but browser and Windows cannot currently import the JavaScript CommonJS engine directly. The browser uses equivalent script files and Windows uses .NET readers for JSON artifacts. This is the main remaining convergence risk.
