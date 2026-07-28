# MaskIt

Local-first privacy layer that detects sensitive data before it reaches AI tools. Maskit processes content locally in the browser, MCP server, CLI, or Windows agent and redacts or blocks it before transmission.

## Components

- **Browser extension**: Chrome/Edge/Firefox/Opera Manifest V3 protection for supported AI sites
- **MCP server**: Node.js tools for Claude Desktop, Cursor, and other MCP clients
- **CLI and developer integrations**: scan text/files, redact, assess risk, GitHub Action, Express middleware, and integration templates
- **Windows agent**: .NET 8 beta clipboard protection using shared rules and policies
- **Shared detection engine**: JavaScript core with policy, risk, audit, and killswitch support

## Requirements

- Node.js 18 or higher
- .NET 8 SDK (Windows agent only)
- Chrome or Edge (browser extension)

## Setup

```bash
npm ci
npm test
```

MCP server:
```bash
cd mcp-server
npm ci
node server.js
```

Windows agent:
```bash
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj \
  --configuration Release
```

## Features

### Detection

- **PII**: EMAIL, PHONE, SSN, PASSPORT, and IP_ADDRESS
- **Financial**: CARD with Luhn validation, BANK_ACCOUNT/IBAN, and MPESA
- **Secrets**: 30+ provider patterns including OpenAI, Anthropic, AWS, GCP, Azure, GitHub, GitLab, Slack, Stripe, Twilio, SendGrid, Cloudflare, Auth0, Firebase, Docker Hub, and Terraform Cloud
- **Custom rules**: locally executed regex rules with length and unsafe-pattern checks

### Protection controls

- Per-app and per-context policies with `allow`, `redact`, and `block` actions
- Local structured audit log with hashed sensitive tokens, retention controls, chain hashes, and CSV export in the browser UI
- Admin killswitch with duration- or schedule-based restrictions and exemptions
- Audited temporary unmask flow
- Tagged, stars, and custom redaction formats

## Supported AI sites

The browser extension uses these exact host patterns:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`
- `https://gemini.google.com/*`
- `https://copilot.microsoft.com/*`
- `https://*.cursor.com/*`

## Integrations

### MCP server tools

`scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`, and `get_audit_log`.

### CLI

```bash
node mcp-server/cli.js scan "text"
node mcp-server/cli.js scan-file ./file.txt
node mcp-server/cli.js redact "text"
node mcp-server/cli.js risk "text"
```

### Developer integrations

- GitHub Action: `mcp-server/integrations/github-action.js` scans staged changes for secrets
- Express middleware: `mcp-server/integrations/express-middleware.js`
- Slack and Discord: `slack-bot.js` and `discord-bot.js` are integration templates; bring your own bot framework and credentials

## Windows agent

The Windows agent is beta, requires .NET 8, and protects clipboard content only when the optional local monitor is enabled. See [maskit-agent/README.md](maskit-agent/README.md).

## Status

v2.4.0 — active development. Risky custom-regex alternation patterns are rejected at rule-add time. The full `safe-regex` CI audit should still be run with `npm ci` and `npm run test:regex` before release.

## Privacy

Maskit is local-first and does not upload page content or clipboard text. See [privacy-policy.html](privacy-policy.html).

## License

Released under the [MIT License](LICENSE).
