# MaskIt

MaskIt is a local-first privacy layer that detects sensitive data before it reaches AI tools. It processes content locally in the browser, MCP server, CLI, or Windows agent and redacts or blocks it before transmission.

## Download first

Normal users should use the [public website](https://designx-studio.github.io/MaskIt/) and [download page](https://designx-studio.github.io/MaskIt/download/index.html). GitHub Releases are the distribution channel for browser extensions, the Windows agent, the MCP server, and the CLI. You do not need to clone or compile the repository to use a release.

## Components

- **Browser extension**: Chrome, Edge, Firefox, and Opera Manifest V3 protection for supported AI sites.
- **MCP server**: Node.js tools for Claude Desktop, Cursor, and compatible MCP clients.
- **CLI and developer integrations**: scan text/files, redact, assess risk, GitHub Action, Express middleware, and integration templates.
- **Windows agent**: .NET 8 clipboard protection with shared rules and policies.
- **Shared detection engine**: JavaScript core with policy, risk, audit, and killswitch support.

## Supported AI sites

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://claude.ai/*`
- `https://gemini.google.com/*`
- `https://copilot.microsoft.com/*`
- `https://*.cursor.com/*`

## Source setup

Source setup is for contributors and maintainers:

```bash
npm ci
npm test
npm run test:regex
npm run build
```

MCP server development:

```bash
cd mcp-server
npm ci
node server.js
```

Windows agent development requires the .NET 8 SDK:

```bash
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
```

## CLI examples

```bash
node mcp-server/cli.js scan "Email john@example.com"
node mcp-server/cli.js scan-file ./file.txt
node mcp-server/cli.js redact "API key sk-example-abcdefghijklmnopqrstuv"
node mcp-server/cli.js risk "customer@example.com"
```

## Documentation

- [Installation](docs/installation.md)
- [Browser extension](docs/browser-extension.md)
- [Windows agent](docs/windows-agent.md)
- [MCP server](docs/mcp-server.md)
- [CLI](docs/cli.md)
- [Architecture](docs/architecture.md)
- [Privacy](docs/privacy.md)
- [Security model](docs/security-model.md)
- [FAQ](docs/faq.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Release artifacts](docs/release-artifacts.md)

## Privacy and security

MaskIt is local-first and does not upload page content or clipboard text. See [Privacy](docs/privacy.md) and the [Security model](docs/security-model.md).

## License

Released under the [MIT License](LICENSE).
