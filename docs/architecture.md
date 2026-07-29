# Architecture

MaskIt shares detection and policy concepts across local adapters. All components are designed to be deployed and execute locally.

## Core Components
- **Unified Policy Engine (`maskit-core`)**: Provides the schemas, rules, and logic for risk scoring and policy evaluation. This ensures consistent detection across all clients.
- **Browser extension**: Manifest V3 content scripts scan supported AI hosts, intercepting input before submission.
- **MCP server**: Node.js implementation exposing scan, redact, policy, response, rules, status, and audit tools to local AI clients (like Claude Desktop).
- **CLI**: `mcp-server/cli.js` supports scan, scan-file, redact, and risk commands for terminal usage and CI integration.
- **Windows agent**: A .NET 8 service that monitors the OS clipboard for sensitive data and intercepts it before it can be pasted into targeted applications.
- **VS Code Extension**: Provides inline developer feedback, quick fixes, and git pre-commit hooks to catch secrets during the development lifecycle.

Raw prompt and clipboard content stays local to the adapter. See [Security Model](security-model.md).
