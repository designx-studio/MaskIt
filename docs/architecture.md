# Architecture

MaskIt shares detection rules, context, and policy concepts across local adapters. The adapters do not yet all consume one runtime policy loader.

## Core Components
- **Shared engine (`engine/` and `maskit-core/`)**: Rules, severity, context, redaction, audit-event construction, and Node-side policy management.
- **Browser extension**: Manifest V3 content scripts scan supported AI hosts and enforce extension settings locally.
- **MCP server**: Node.js exposes scan, redact, policy, response, rules, status, and audit tools to local AI clients.
- **CLI**: `mcp-server/cli.js` supports scan, scan-file, redact, and risk commands.
- **Windows agent**: .NET 8 monitors clipboard updates and uses shared rule artifacts; native policy parity requires Windows validation.
- **VS Code extension**: Provides diagnostics, status, quick-fix commands, clipboard scanning, and staged-file pre-commit scanning.

## Data boundary
Raw prompt, source, and clipboard content stay local to the adapter. The current Phase 3 `PolicyManager` is integrated into Node-based adapters through `engine/index.js`; browser and Windows-native policy loading remain separate adapter work. See [Security Model](security-model.md).
