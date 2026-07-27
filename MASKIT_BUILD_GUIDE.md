# Maskit Build Guide

## Requirements

- Node.js 18, 20, or 22
- npm
- zip and tar on Linux/macOS
- .NET 8 SDK for the Windows agent

## Validate

```bash
npm ci
npm run lint
npm run test:regex
npm test
node scripts/validate-manifests.js
```

For the MCP server:

```bash
cd mcp-server
npm ci --ignore-scripts
npm test
```

For the Windows agent:

```bash
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
```

## Package

```bash
npm run build
```

The build creates separate Chrome, Firefox, Edge, Opera, legacy extension, and MCP archives under `dist/`. Browser packages contain only the extension adapter and browser core files. The MCP archive contains the MCP server, JavaScript engine, and core contract.

## Release

Tagged releases run tests, build browser and MCP artifacts, compile the Windows agent, and publish the browser zips plus the MCP archive. Windows installers are not produced yet.

## Security checks

Run regex safety validation and dependency audits before release. Do not add broad host permissions or network-based content scanning. Verify that manifest matches remain limited to supported AI hosts.
