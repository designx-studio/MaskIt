# Maskit Agent — Windows

System-wide AI clipboard protection for Windows.

**"Maskit protects every AI application on your Windows device, not just browser AI."**

## What It Does

1. **Monitors clipboard** — scans every copied text for sensitive data
2. **Detects AI context** — knows which app you're pasting into (Copilot, ChatGPT, Word, Ollama, etc.)
3. **Applies policy** — redacts, blocks, or allows based on destination app
4. **Logs everything** — structured audit trail, same schema as browser extension

## Architecture

```
Maskit Agent (Windows user session)
├── Clipboard Monitor      # Watches clipboard changes
├── Rule Engine            # Loads rules from maskit-core/
├── Policy Engine          # Context-aware decisions
├── Foreground Detector    # Identifies AI apps
├── Audit Logger           # Structured event logging
└── System Tray UI         # Green/amber/red icon
```

## AI App Detection

| Process | App | AI Detected | Confidence | Local |
|---------|-----|-------------|------------|-------|
| Microsoft.Copilot.exe | Windows Copilot | ✅ | 1.0 | No |
| ChatGPT.exe | ChatGPT Desktop | ✅ | 1.0 | No |
| claude-desktop.exe | Claude Desktop | ✅ | 1.0 | No |
| ollama.exe | Ollama | ✅ | 1.0 | Yes |
| WINWORD.EXE | Microsoft Word | ✅ | 0.7 | No |
| EXCEL.EXE | Microsoft Excel | ✅ | 0.7 | No |
| Code.exe | VS Code | ✅ | 0.5 | No |

## Policy Examples

Same data, different destination:

- **Customer email → Ollama (local)** → Allow, audit only
- **Customer email → Word Copilot** → Redact PII
- **Customer email → ChatGPT Desktop** → Block entirely

## Build

```bash
# Requires .NET 8 SDK
cd maskit-agent/Maskit.Agent
dotnet build
dotnet run
```

## Config

Config at `%APPDATA%/Maskit/config.json`:

```json
{
  "enabled": true,
  "clipboardMonitoring": true,
  "notifications": true,
  "clipboardCheckIntervalMs": 500
}
```

## System Tray

- **Green dot** — Protection active
- **Amber dot** — Redaction performed (3s)
- **Red dot** — Paused

Right-click menu:
- Protection: ON / OFF
- View audit log (last 10 events)
- Open config file
- Exit

## Rules

Loaded from `maskit-core/rules/` — same rules as browser extension and MCP server.

30+ API key patterns, PII detection, financial data detection, all with false-positive guards.

## Audit Events

Same schema as browser extension:

```json
{
  "id": "evt_1690000000000_abc123",
  "timestamp": 1690000000000,
  "type": "API_KEY_OPENAI",
  "severity": "critical",
  "source": "clipboard",
  "app": "ChatGPT Desktop",
  "action": "redacted",
  "riskScore": 50,
  "appContext": {
    "processName": "ChatGPT Desktop",
    "aiDetected": true,
    "aiConfidence": 1.0,
    "isLocal": false
  }
}