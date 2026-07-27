# MCP Server

## Architecture

`mcp-server/server.js` is a thin MCP adapter over `engine/index.js`. It defines tool metadata, validates arguments, loads settings by application, calls the engine, persists events, and returns JSON text content.

## Tools

- `scan_text`: returns findings, all findings, policy decisions, redacted text, risk score/level, matched rules, and events.
- `redact_text`: runs the same Core scan with an optional tagged, stars, or custom format and returns the same response shape.
- `evaluate_policy`: returns the common Core response plus allowed, blocked, redacted, and allowed-by-policy counts.
- `scan_response`: scans an AI response and adds `hasFindings` and a risk-based recommendation.
- `get_status`: returns engine version, readiness, config path, enabled state, severities, and app overrides.
- `get_rules`: lists built-in and configured custom rules.
- `get_audit_log`: reads recent local JSONL events from the configured audit file.

## Validation and errors

Text arguments must be non-empty strings. Redaction format must be one of `tagged`, `stars`, or `custom`. Tool failures are returned as MCP error results containing a JSON error message.

## Configuration

Configuration is stored under `%APPDATA%/Maskit` on Windows, `~/Library/Application Support/Maskit` on macOS, and `~/.config/maskit` on Linux. Hash salts and optional HTTP API tokens are stored in that local config.

## Security boundary

The stdio server is local to the MCP client. The optional HTTP server must be treated as a network service and protected with its configured token and host-level access controls.
