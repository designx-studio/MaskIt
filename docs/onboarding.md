# Maskit onboarding guide

Get from zero to a local protection layer in under ten minutes.

## 1. Choose your surface

- **Browser extension**: protect typing, paste, and copy in ChatGPT, chat.openai.com, Claude, Gemini, Copilot, and Cursor.
- **MCP server**: expose local scanning tools to Claude Desktop, Cursor, or another MCP client.
- **CLI**: scan text or files in scripts and CI.
- **Windows agent beta**: protect clipboard activity system-wide on Windows.

## 2. Install prerequisites

Node.js 18+ is required for the repository, MCP server, and CLI. The Windows agent additionally requires .NET 8 SDK and Windows. Browser packaging requires `zip` and `tar` on the build machine.

## 3. Install and test

```bash
git clone https://github.com/designx-studio/MaskIt.git
cd MaskIt
npm ci
npm test
npm run test:regex
```

## 4. Load the browser extension

Build the package:

```bash
npm run build:chrome
```

Extract `dist/maskit-chrome.zip`, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select the extracted folder. Open the extension settings page to choose detection toggles, redaction format, site rules, policies, retention, and pause behavior.

## 5. Start the MCP server

```bash
cd mcp-server
npm ci
node server.js
```

The server runs locally over stdio. Configure your MCP client to launch `node /absolute/path/to/MaskIt/mcp-server/server.js`. Available tools are `scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`, and `get_audit_log`.

## 6. Use the CLI

```bash
node mcp-server/cli.js scan "email teammate@example.com"
node mcp-server/cli.js scan-file ./notes.txt
node mcp-server/cli.js redact "send customer@example.com"
node mcp-server/cli.js risk "customer@example.com"
```

Add `--json` for machine-readable output. Use `--exit-on-risk` with `scan-file` in CI.

## 7. Run the Windows agent beta

```powershell
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj -- --parity
```

Start the tray application with clipboard monitoring enabled. It watches clipboard update events, applies the shared rules and policies, and writes local audit records. It does not inspect keystrokes or screen content.

## 8. Configure the security model

Use `allow`, `redact`, or `block` actions per data type and override them by app or context. Keep the killswitch disabled until you intentionally need a schedule or duration restriction. Set audit retention to match your operational policy. Never commit local config files, tokens, or salts.

## 9. Verify the first successful flow

Paste an email, a valid test card such as `4111 1111 1111 1111`, or a test API-key-shaped value into a supported AI host. Confirm that the browser replaces the match, the local counter increments, and the audit entry contains metadata rather than raw sensitive content.

## Next reads

- [Installation](installation.md)
- [Browser extension](browser-extension.md)
- [MCP server](mcp-server.md)
- [CLI](cli.md)
- [Windows agent](windows-agent.md)
- [Security model](security-model.md)
- [Privacy](privacy.md)
