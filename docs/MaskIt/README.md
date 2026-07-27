# MaskIt Technical Documentation

MaskIt is a local-first privacy layer that detects and transforms sensitive text before it reaches supported AI surfaces. The current repository contains three adapters: a Manifest V3 browser extension, a Node.js MCP server, and a .NET 8 Windows clipboard agent.

## Supported surfaces

- Browser: ChatGPT, Claude, Gemini, Copilot, and Cursor web hosts declared in `manifest.json`.
- MCP: Claude Desktop and MCP-capable clients through `mcp-server/server.js`.
- Windows: system clipboard monitoring through the Windows tray agent.

## Current implementation status

The JavaScript `engine/` module is the executable Core used by MCP. The browser package still includes root-level adapter-compatible detector and sanitizer files because Manifest V3 content scripts cannot directly load CommonJS modules. The Windows adapter loads `maskit-core/` JSON artifacts through its .NET rule and policy services. Parity tests exist, but full three-runtime parity requires Windows execution and remains a validation requirement.

## Quick start

```bash
npm ci
npm test
npm run lint
npm run test:regex
npm run build
```

For MCP:

```bash
cd mcp-server
npm ci
node server.js
```

For Windows:

```powershell
dotnet restore maskit-agent/Maskit.Agent/Maskit.Agent.csproj
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj -- --parity
```

## Documentation map

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md)
- [SECURITY_MODEL.md](SECURITY_MODEL.md)
- [DETECTION_ENGINE.md](DETECTION_ENGINE.md)
- [REDACTION_AND_POLICY.md](REDACTION_AND_POLICY.md)
- [MCP_SERVER.md](MCP_SERVER.md)
- [WINDOWS_AGENT.md](WINDOWS_AGENT.md)
- [TESTING_GUIDE.md](TESTING_GUIDE.md)
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)
- [CHANGELOG.md](CHANGELOG.md)
