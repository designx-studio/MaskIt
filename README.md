# Maskit

**Protect sensitive information before it reaches AI tools.**

Maskit is a local-first AI privacy platform. It detects and redacts secrets, credentials, and sensitive identifiers before they reach browser AI chats, AI assistants, desktop clients, developer tools, MCP integrations, or AI workflows.

## Surfaces

- **Browser extension:** Manifest V3 protection for ChatGPT, Claude, Gemini, Copilot, and Cursor web surfaces.
- **MCP server:** `scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`, and `get_audit_log`.
- **Windows agent:** Clipboard and foreground-application protection for desktop AI workflows.
- **Shared core:** Detection, redaction, policy, risk scoring, and audit behavior are being consolidated under `engine/` and `maskit-core/`.

## Browser setup

1. Run `npm ci`.
2. Run `npm run build:chrome`.
3. Open `chrome://extensions` and enable Developer mode.
4. Load the unpacked extension from the generated Chrome package directory.

The extension is scoped to AI web applications. Gmail and email privacy workflows are not supported.

## MCP setup

```bash
cd mcp-server
npm ci
npm start
```

Configure your MCP client to launch `mcp-server/server.js` with Node.js 18 or newer.

## Detection

Maskit detects emails, phone numbers, payment cards, M-Pesa references, SSNs, API keys and tokens, IP addresses, passports, IBANs, and validated custom rules. Processing is local; raw sensitive values are not persisted in audit events.

## Development

```bash
npm ci
npm test
npm run lint
npm run test:regex
npm run build
```

The repository also contains a .NET Windows agent under `maskit-agent/`. Its build and parity coverage are tracked separately until the shared core contract is complete.

## License

MIT, Copyright (c) 2026 Maskit Contributors.
