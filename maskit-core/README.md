# maskit-core

Language-independent detection rules, policy definitions, and audit schema for Maskit.

**Single source of truth** consumed by all Maskit adapters:
- Browser extension (Chrome, Firefox, Edge, Opera)
- Windows agent (.NET 8 desktop app)
- MCP server (Claude Desktop, IDEs)
- CLI tools
- HTTP middleware

## Directory Structure

```
maskit-core/
├── rules/
│   ├── pii.json              # EMAIL, PHONE, SSN, PASSPORT, IP_ADDRESS
│   ├── secrets.json          # API_KEY patterns (30+ cloud providers)
│   ├── financial.json        # CARD, BANK_ACCOUNT, MPESA
│   └── custom.json           # User-defined rules (empty by default)
├── policy/
│   ├── defaults.json         # Default actions per data type + severity weights
│   └── contexts.json         # Per-app/context policy overrides
├── audit-schema/
│   └── event.json            # JSON Schema for audit events
└── README.md
```

## Rules Format

Each rule has:

```json
{
    "id": "API_KEY_OPENAI",
    "name": "OpenAI API keys",
    "pattern": "\\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\\b",
    "flags": "g",
    "type": "secrets",
    "severity": "critical",
    "validator": "api_key"
}
```

- `id` — Unique identifier
- `pattern` — Regex pattern (JavaScript syntax, portable to .NET/Python/etc.)
- `flags` — Regex flags (`g` global, `i` case-insensitive)
- `type` — Category (`pii`, `secrets`, `financial`)
- `severity` — `critical`, `high`, `medium`, `low`
- `validator` — False-positive guard (`luhn`, `passport`, `ip_address`, `mpesa`, `api_key`, `bank_account`, `none`)

## Policy Format

Default actions per data type:

```json
{
    "EMAIL": { "action": "redact", "format": "tagged" },
    "CARD": { "action": "block" },
    "SSN": { "action": "block" }
}
```

Context overrides for specific apps:

```json
{
    "chatgpt.com": {
        "EMAIL": { "action": "redact" },
        "API_KEY": { "action": "redact" }
    },
    "local-ai": {
        "EMAIL": { "action": "allow" },
        "API_KEY": { "action": "allow" }
    }
}
```

## Audit Event Schema

See `audit-schema/event.json` for the full JSON Schema.

Key fields: `id`, `timestamp`, `type`, `severity`, `source`, `app`, `action`, `riskScore`, `matchedRule`, `policyApplied`.

Windows agent adds `appContext` with `processName`, `aiDetected`, `aiConfidence`, `isLocal`.

## Adding New Rules

1. Add rule to appropriate file in `rules/`
2. Follow existing format (id, name, pattern, flags, type, severity, validator)
3. Test pattern in browser extension
4. Rules auto-available to all adapters on next load

## Versioning

All files share version `2.4.0`. Bump together when rules change.