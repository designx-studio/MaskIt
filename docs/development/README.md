# Development (contributors)

This folder is for people who **build MaskIt from source**.

**Design partner pilots should not start here.** Use [GitHub Releases](https://github.com/designx-studio/MaskIt/releases/latest) and [docs/pilot/](../pilot/).

## Prerequisites

- Node.js 18+
- For Windows agent builds: .NET 8 SDK on Windows
- Optional: Playwright for browser E2E

## Clone and test

```bash
git clone https://github.com/designx-studio/MaskIt.git
cd MaskIt
npm ci
npm test
npm run test:regex
npm run test:docs
```

## Build release artifacts

```bash
npm run build
# Windows agent alone:
npm run build:windows
```

Outputs land in `dist/` with `SHA256SUMS.txt`.

## Windows agent from source

```powershell
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj -- --parity
dotnet publish maskit-agent/Maskit.Agent/Maskit.Agent.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

Prefer `npm run build:windows` for the production ZIP layout.

## MCP from source

```bash
cd mcp-server
npm ci
node server.js
```

## Further reading

- [Developer guide](../developer-guide.md)
- [Architecture](../architecture.md)
- [Release process](../../RELEASE.md)
