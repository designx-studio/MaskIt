# Development Setup

## Required software

- Git
- Node.js 18 or newer
- npm
- .NET 8 SDK on Windows for the agent
- A supported browser for extension loading

## Install

```bash
git clone https://github.com/designx-studio/MaskIt.git
cd MaskIt
git checkout feature/windows-agent-core
npm ci
cd mcp-server && npm ci && cd ..
```

## Browser development

Open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select the repository root. Test only hosts declared in `manifest.json`.

## MCP development

Run `node mcp-server/server.js` through an MCP client or use the test and integration scripts. Configuration is created under the OS-specific Maskit config directory.

## Windows development

```powershell
dotnet restore maskit-agent/Maskit.Agent/Maskit.Agent.csproj
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj -- --parity
```

## Packaging

```bash
npm run build
npm run build:chrome
npm run build:firefox
npm run build:edge
npm run build:opera
```

## Debugging

Use browser extension service-worker logs and page console output for browser issues, MCP stderr and local config/audit files for MCP issues, and Windows Event/console output plus the local audit file for agent issues. Keep captured logs free of raw sensitive values.
