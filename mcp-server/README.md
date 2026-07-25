# Maskit MCP Server

Local MCP server for Claude Desktop and MCP-capable IDEs. Uses the shared Maskit detection engine to scan and redact sensitive data before it leaves your device.

## Install

```bash
cd mcp-server
npm install
```

## Run tests

```bash
node test.js
```

## Claude Desktop setup

1. Open Claude Desktop settings
2. Edit `claude_desktop_config.json`
3. Add the Maskit server:

```json
{
  "mcpServers": {
    "maskit": {
      "command": "node",
      "args": ["C:/path/to/maskit-extension/mcp-server/server.js"]
    }
  }
}
```

4. Restart Claude Desktop
5. Claude will automatically discover the 6 Maskit tools

## Cursor / IDE setup

1. Open Cursor settings
2. Navigate to MCP servers
3. Add the Maskit server with the same config as above

## Tools

| Tool | Input | Output |
|------|-------|--------|
| `scan_text` | `{ text, app? }` | Findings, risk score, risk level, redacted text |
| `redact_text` | `{ text, format?, app? }` | Redacted text with findings |
| `evaluate_policy` | `{ text, app? }` | Allowed/denied with risk score |
| `get_status` | `{}` | Engine version, config path, rules count |
| `get_rules` | `{}` | Built-in and custom rules |
| `update_rules` | `{ customRules }` | Updated custom rules |

## Config

The server reads config from:
- **Windows:** `%APPDATA%\Maskit\config.json`
- **macOS:** `~/Library/Application Support/Maskit/config.json`
- **Linux:** `~/.config/maskit/config.json`

If no config file exists, defaults are used. Export shared config from the browser extension Settings page.

## Architecture

```
Claude Desktop / IDE
        |
        | (stdio JSON-RPC)
        |
  mcp-server/server.js
        |
        | (require)
        |
  engine/index.js  ←──  engine/detector.js + engine/settings.js
```

All detection runs locally. No data is sent to external servers.