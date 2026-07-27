# Maskit Windows Agent

The Windows tray agent provides system-wide AI clipboard protection. It uses the shared `maskit-core` JSON rule and policy artifacts copied into the build output by `Maskit.Agent.csproj`.

## Core alignment

The agent consumes the same source of truth as the browser and MCP adapters for:

- Detection rules and validators
- Policy actions (`allow`, `redact`, `block`)
- Severity weights and risk levels
- Tagged redaction format
- Structured audit event fields

`MaskitCoreService` is the adapter boundary for deterministic scan, policy, risk, and redaction results. Clipboard monitoring remains Windows-specific I/O; it does not own detection rules.

## Build and run

```powershell
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj
```

Run the shared fixture parity smoke test:

```powershell
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj -- --parity
```

The parity test reads the repository-level `parity-fixtures.json` and the copied `maskit-core` rules. It covers API keys, PII, cards, and custom rules and exits non-zero on drift.

## Audit and limitations

Audit events are local JSONL records with hashed sensitive values, timestamps, policy actions, risk scores, and chain hashes. Clipboard interception depends on the Windows desktop session and cannot inspect data that never reaches the clipboard. The agent does not send clipboard contents over the network.
