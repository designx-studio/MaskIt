# Codebase Guide

## Repository structure

- `engine/`: JavaScript detection and policy engine.
- `maskit-core/`: JSON rule, policy, and audit schema artifacts for cross-runtime use.
- `mcp-server/`: MCP stdio server, config management, HTTP server, CLI, tests.
- `maskit-agent/Maskit.Agent/`: .NET 8 Windows tray application and clipboard adapter.
- Root `content.js`: browser event handling and UI adapter.
- Root `background.js`: service worker, settings, statistics, audit storage, commands.
- Root `settings.js`: browser-safe defaults and helpers.
- Root `detector.js` and `sanitizer.js`: browser runtime detection/redaction implementation.
- `manifest.json`: Manifest V3 permissions, hosts, scripts, actions, and commands.
- `scripts/`: build, packaging, version, regex, icon, and manifest validation scripts.
- `.github/workflows/`: CI and release workflows.
- `parity-fixtures.json`, `parity-test.js`: shared fixture and JavaScript parity runner.

## Entry points

- Browser: `manifest.json` -> `background.js` and `content.js`.
- MCP: `mcp-server/server.js`.
- Windows: `maskit-agent/Maskit.Agent/Program.cs`.
- JavaScript Core: `engine/index.js`.

## Runtime sequence

Browser paste and typing events are intercepted before insertion where possible. MCP calls are validated then routed to `engine.scanText`. Windows receives `WM_CLIPBOARDUPDATE`, reads Unicode clipboard data, calls `MaskitCoreService`, optionally replaces the clipboard, then logs events.

## Development workflow

Use Node.js 18+ and npm for JavaScript work. Use .NET 8 SDK on Windows for the agent. Make code changes, run focused tests, run the full suite, run packaging, then verify parity fixtures. Avoid editing generated archives directly.
