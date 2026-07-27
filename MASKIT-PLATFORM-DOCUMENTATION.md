# Maskit Platform Documentation

Maskit is a local-first AI privacy protection layer. It detects and redacts sensitive information before it reaches AI web applications, AI assistants, desktop clients, developer tools, MCP integrations, and AI workflows.

## Supported browser hosts

The extension targets ChatGPT, Claude, Gemini, Copilot, and Cursor web surfaces. Host matches are defined in `manifest.json` and `settings.js`; the extension does not inject into all websites.

## Runtime components

- `engine/`: JavaScript core API for detection, redaction, policy, risk scoring, rules, and audit events.
- Root browser files: DOM and browser adapters.
- `mcp-server/`: MCP tools and local configuration adapter.
- `maskit-agent/`: Windows clipboard and foreground-application adapter.
- `maskit-core/`: versioned rule, policy, and audit data intended to become the runtime source.

## MCP tools

The server exposes `scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`, and `get_audit_log`.

## Privacy model

Scanning and redaction happen locally. Audit events retain metadata and hashed tokens rather than raw sensitive values. Custom expressions are validated for length and unsafe repetition before use.

## Scope boundary

Maskit is not an email privacy product. Gmail and email-composition integrations are intentionally unsupported. Documentation and implementation must not add email-specific host permissions or editor behavior.
