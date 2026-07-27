# MaskIt

**Prevent accidental data leaks before sensitive text leaves your device.**

MaskIt is a local-first privacy layer for protecting sensitive information before it reaches AI tools. It detects, evaluates, and redacts secrets and personal data locally in the browser, MCP server, and Windows clipboard agent.

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-2.4.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-MV3-yellow)

> MaskIt processes content locally. It does not send scanned text or raw clipboard contents to a remote service.

## Architecture

MaskIt uses shared rule and policy contracts across three adapters:

```text
                         MaskIt Core contract
                       /          |          \\
              Browser extension  MCP server  Windows agent
```

The repository's `engine/` module is the JavaScript runtime used by the browser and MCP adapters. The `maskit-core/` directory contains versioned JSON rule and policy artifacts consumed by the Windows .NET adapter. Shared parity fixtures verify equivalent findings and redaction behaviour where the runtimes support them.

The contract covers:

- Detection rules and validators
- Policy actions: `allow`, `redact`, and `block`
- Severity weights and risk levels
- Redaction formats
- Custom rules
- Structured audit events

## Supported AI surfaces

### Browser extension

The Manifest V3 extension runs on these hosts only:

- `chatgpt.com`
- `chat.openai.com`
- `claude.ai`
- `gemini.google.com`
- `copilot.microsoft.com`
- `*.cursor.com`

It supports paste interception, optional copy and typing scans, review-before-redact, pause/resume, site controls, settings import/export, a status widget, and keyboard shortcuts.

### MCP server

The MCP server works with Claude Desktop and other MCP-capable clients. It exposes seven tools:

| Tool | Purpose |
|------|---------|
| `scan_text` | Detect sensitive data and return findings, policy decisions, and risk information |
| `redact_text` | Return locally redacted text and findings |
| `evaluate_policy` | Evaluate whether detected data is allowed, redacted, or blocked |
| `scan_response` | Scan an AI-generated response for sensitive data |
| `get_status` | Return engine and configuration status |
| `get_rules` | List active built-in and custom rules |
| `get_audit_log` | Read recent local audit events |

Setup:

```bash
cd mcp-server
npm install
```

Add the server to Claude Desktop's configuration:

```json
{
  "mcpServers": {
    "maskit": {
      "command": "node",
      "args": ["/absolute/path/to/MaskIt/mcp-server/server.js"]
    }
  }
}
```

### Windows agent

The .NET 8 Windows tray agent monitors the system clipboard and uses the `maskit-core/` rule and policy artifacts. It handles Windows-specific clipboard and foreground-window integration while the shared contract supplies detection, policy actions, risk scoring, redaction, and audit fields.

Build and run on Windows:

```powershell
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
```

Run the shared fixture parity smoke test:

```powershell
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release -- --parity
```

The Windows agent requires a Windows desktop session for clipboard monitoring. The parity command is the supported non-interactive validation path.

## Detection coverage

Built-in rules cover:

| Type | Examples | Default severity |
|------|----------|------------------|
| API keys and tokens | OpenAI, Anthropic, GitHub, AWS, Google, Stripe, Bearer, cloud provider tokens | Critical |
| Credit cards | Luhn-validated card numbers | Critical |
| SSNs | `123-45-6789` | Critical |
| Bank accounts | IBAN-like values | Critical |
| Passports | Alphanumeric passport values | High |
| IP addresses | IPv4 addresses | High |
| Email addresses | `name@example.com` | Medium |
| Phone numbers | Kenyan phone formats | Medium |
| M-Pesa codes | Mixed alphanumeric transaction codes | Low |
| Custom rules | Up to 15 validated regular expressions | Medium by default |

Policies can allow, redact, or block findings by data type and application context. Audit records contain metadata and hashed sensitive values, not raw matched content.

## Development and validation

Requirements:

- Node.js 18 or newer
- npm
- Chrome or another compatible browser for extension testing
- .NET 8 SDK on Windows for agent builds and parity tests

```bash
git clone https://github.com/designx-studio/MaskIt.git
cd MaskIt
npm install
npm test
npm run lint
npm run test:regex
npm run build
```

Useful test commands:

```bash
npm run test:engine
npm run test:extension
npm run test:mcp
npm run test:parity
```

CI also runs dependency audits, manifest validation, production packaging, a Windows .NET 8 build, and the Windows shared-fixture parity command. See `.github/workflows/ci.yml` for the authoritative pipeline.

## Security model and limitations

- Scanning and redaction are local operations.
- The extension requests storage and context-menu permissions plus explicit AI host permissions only.
- Audit logs avoid storing raw matched values.
- No analytics or telemetry is included.
- The browser adapter cannot protect text entered on hosts outside its declared AI host list.
- The Windows agent protects clipboard flows; it cannot inspect content that never reaches the clipboard.
- Detection is pattern-based and should not be treated as a guarantee that every secret or sensitive value will be found.

See [SECURITY.md](SECURITY.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [maskit-agent/README.md](maskit-agent/README.md) for implementation details.

## License

[MIT](LICENSE)