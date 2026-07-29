# MaskIt Developer Guide

## Five-minute path
1. Download the latest release asset; source builds are for contributors.
2. Load the browser extension or install the CLI/MCP package.
3. Scan synthetic test data only.
4. Review finding type, risk, policy action, and redacted output.
5. Validate custom rules with `npm run test:regex` before use.

## Contributor setup
Prerequisites: Node.js 18+, Git, and .NET 8 SDK for Windows-agent work.

```bash
npm ci
npm test
npm run test:regex
npm run build
```

The repository test command is Node-based and includes browser, MCP, parity, security, and adapter fixtures. Windows-only MSI and service validation requires a Windows VM and is intentionally skipped on other platforms.

## Integrations
- CLI: `node mcp-server/cli.js scan "synthetic@example.com"`
- MCP: run `node mcp-server/server.js` from the extracted package.
- Cursor and Claude Desktop: configure the local MCP command with an absolute path.
- VS Code: run `cd maskit-vscode && npm ci && npm run compile`, then launch the extension host.

MaskIt is local-first. Keep fixtures synthetic and never commit real credentials. The Phase 3 policy manager is consumed by Node adapters; browser and Windows policy parity remains an explicit validation item until their native loaders are wired.
