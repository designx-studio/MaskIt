# Maskit Windows Agent

System-wide AI clipboard protection for Windows. Uses the same `maskit-core` rules, policy defaults, and **canonical audit events (schema 1.0)** as the browser extension, CLI, and MCP server.

## Behaviour

- **Detect → Warn/Block/Mask → Audit** (no unmask)
- Rules load from packaged `maskit-core/rules` next to the executable (no repository path required)
- Audit events store **irreversible value hashes only** — never raw clipboard secrets
- Policy actions match shared defaults (`allow` / `redact` / `block`)

## Package layout (`maskit-windows-agent.zip`)

```
README.md
VERSION.json
parity-fixtures.json
publish/
  Maskit.Agent.exe          # self-contained win-x64
  maskit-core/
    rules/*.json
    policy/*.json
    audit-schema/*.json
  VERSION.json
  parity-fixtures.json
```

## Modes

```powershell
# Tray agent (default)
.\publish\Maskit.Agent.exe

# Headless scan (clean install / CI)
.\publish\Maskit.Agent.exe --scan "email test@example.com" --json

# Packaged rules + canonical event self-test
.\publish\Maskit.Agent.exe --self-test

# Shared fixture parity
.\publish\Maskit.Agent.exe --parity
```

## Build (developers)

Requires **.NET 8 SDK**.

```powershell
# From repository root
npm run build:windows
# → dist/maskit-windows-agent.zip

# Or full release set
npm run build
```

Direct publish:

```powershell
dotnet publish maskit-agent/Maskit.Agent/Maskit.Agent.csproj `
  -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true `
  -o dist/maskit-windows-agent/publish
```

## Verify package

```powershell
npm run test:windows-package
# Require artifact:
$env:MASKIT_REQUIRE_WINDOWS_ARTIFACT=1; npm run test:windows-package
```

## Limitations

- Clipboard interception depends on an interactive Windows desktop session
- Data that never reaches the clipboard is not visible to the agent
- No network upload of clipboard contents
