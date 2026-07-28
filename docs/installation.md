# Installation

## Browser extension

Run `npm ci && npm run build:chrome`, then load `dist/maskit-chrome.zip` as an unpacked extension after extracting it in Chrome or Edge.

## MCP server

```bash
cd mcp-server
npm ci
node server.js
```

## CLI

Use Node.js 18 or newer:

```bash
node mcp-server/cli.js scan "hello@example.com"
```

## Windows agent

Requires .NET 8 SDK and Windows:

```powershell
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
```
