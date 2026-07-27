# MaskIt

Local-first privacy layer that prevents sensitive data from 
reaching AI tools. Detects credentials, PII, and financial 
data at the point of entry and redacts it before it leaves 
your device.

## Components

- **Browser extension** — Chrome/Edge, Manifest V3
- **MCP server** — Node.js, integrates with Claude Desktop and Cursor  
- **Windows agent** — .NET 8, system-wide clipboard protection (beta)
- **Detection engine** — shared JavaScript core

## Requirements

- Node.js 18 or higher
- .NET 8 SDK (Windows agent only)
- Chrome or Edge (browser extension)

## Setup

```bash
npm ci
npm test
```

MCP server:
```bash
cd mcp-server
npm ci
node server.js
```

Windows agent:
```bash
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj \
  --configuration Release
```

## What It Detects

API keys (30+ providers), email addresses, phone numbers, 
SSNs, credit cards, bank accounts, passport numbers, 
IP addresses, M-Pesa codes.

## Status

v2.4.0 — active development. Windows agent requires 
parity verification before production use.