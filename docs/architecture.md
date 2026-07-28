# Architecture

Maskit shares detection and policy concepts across local adapters.

- Browser extension: Manifest V3 content scripts scan supported AI hosts.
- MCP server: Node.js exposes scan, redact, policy, response, rules, status, and audit tools.
- CLI: `mcp-server/cli.js` supports scan, scan-file, redact, and risk.
- Windows agent: .NET 8 monitors clipboard updates and uses the shared rule artifacts.

Raw prompt and clipboard content stays local to the adapter. See [Security Model](security-model.md).