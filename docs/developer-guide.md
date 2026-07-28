# Developer Guide

## Five-minute path

1. Download the latest release asset, no source build required.
2. Load the browser extension or install the CLI/MCP package.
3. Scan a known-safe test string containing an example email and a fake token.
4. Review the finding type, risk, policy action, and redacted output.
5. Add one custom rule only after validating it against the regex safety limits.

## Integrations

- CLI: `node mcp-server/cli.js scan "text"`
- MCP: run `node mcp-server/server.js` from the extracted package.
- Cursor and Claude Desktop: configure the local MCP command using an absolute path.
- GitHub and CI: use the CLI or the release workflow checks, never upload raw prompt data to a third-party scanner by default.

Maskit is local-first. Keep test fixtures synthetic and never commit real credentials.