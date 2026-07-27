# MaskIt

**Prevent accidental data leaks before sensitive text leaves your device.**

MaskIt is a local-first privacy layer that detects and redacts sensitive data in real time. It works in ChatGPT, Claude, Gemini, Copilot, and Cursor — catching API keys, credit cards, SSNs, and more before they leave your device.

![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-102%20passing-brightgreen)
![Version](https://img.shields.io/badge/version-2.4.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-MV3-yellow)

---

## Architecture: MaskIt Core Unification

MaskIt uses a single, unified core engine (`MaskIt Core`) that provides detection and policy logic across all surfaces. This ensures that a credit card is detected and handled exactly the same way regardless of the interface:

```text
       MaskIt Core
           |
-----------------------------
|          |                |
Browser   MCP Server    Windows Agent
```

MaskIt Core is the single source of truth for:
- Detection rules
- Redaction logic
- Policy evaluation
- Risk scoring
- Rule management
- Audit event creation

---

## Why MaskIt?

Users paste customer data, API keys, secrets, and regulated information into AI tools without realizing the risk. Existing solutions are cloud-dependent, enterprise-only, or too broad.

**MaskIt solves this by:**
- Scanning text at paste, copy, and typing time
- Detecting sensitive patterns locally (no cloud processing)
- Redacting data before it leaves your device
- Being invisible when everything is safe

---

## Quick Start

### Chrome Extension

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select the root folder
5. Navigate to any supported AI host (ChatGPT, Claude, etc.) — MaskIt is active automatically

### Claude Desktop (MCP Server)

1. Install dependencies:
   ```bash
   cd mcp-server && npm install
   ```

2. Add to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "maskit": {
         "command": "node",
         "args": ["/path/to/MaskIt/mcp-server/server.js"]
       }
     }
   }
   ```

3. Restart Claude Desktop — 7 tools are automatically available

---

## Supported AI Platforms

The browser extension natively intercepts data on:
- `chatgpt.com`
- `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `copilot.microsoft.com`
- `*.cursor.com`

---

## What It Detects

| Type | Examples | Severity |
|------|----------|----------|
| **API Keys** | OpenAI `sk-...`, GitHub `ghp_...`, AWS `AKIA...`, Google `AIza...`, Stripe `sk_live_...`, Bearer tokens, and 30+ more | Critical |
| **Credit Cards** | `4111 1111 1111 1111` (Luhn validated) | Critical |
| **SSNs** | `123-45-6789` | Critical |
| **Bank Accounts (IBAN)** | `GB82WEST12345698765432` | Critical |
| **Passports** | `AB1234567` | High |
| **IP Addresses** | `192.168.1.1` | High |
| **Emails** | `john@example.com` | Medium |
| **Phone Numbers** | `+254712345678`, `0712345678` | Medium |
| **M-Pesa Codes** | `QKA12X9L4M` | Low |

Plus **custom regex rules** you define yourself (up to 15).

---

## MCP Server Tools

7 tools are available to Claude Desktop and MCP-capable apps:

| Tool | Description |
|------|-------------|
| `scan_text` | Scan text for sensitive data, returns findings + risk score |
| `redact_text` | Scan and redact, returns cleaned text |
| `evaluate_policy` | Evaluate text against policy, returns allowed/denied |
| `scan_response` | Scan an AI response for leaked secrets |
| `get_status` | Engine version, config path, rules count |
| `get_rules` | List all active rules with severity levels |
| `get_audit_log` | Get recent audit events |

---

## Development & Parity

To ensure parity across all surfaces, tests are run across the engine, browser extension, MCP server, and parity fixtures.

```bash
git clone https://github.com/designx-studio/MaskIt.git
cd MaskIt
npm install
npm test
```

Test Commands:
```bash
npm run test:engine      # Engine tests
npm run test:extension   # Browser extension tests
npm run test:mcp         # MCP server tests
npm run test:parity      # Cross-platform parity tests
```

---

## Security Model

MaskIt is built privacy-first:
- **Local-only processing** — No data leaves your device
- **No network requests** — Content scanning happens entirely in the browser
- **No sensitive data stored** — Audit logs store hashes, not raw data
- **Narrow permissions** — Only required AI hosts
- **No analytics or telemetry** — We don't track you

See [SECURITY.md](SECURITY.md) for the full threat model and data handling details.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 MaskIt Contributors