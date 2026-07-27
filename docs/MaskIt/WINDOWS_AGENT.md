# Windows Agent

## Runtime

The Windows agent is a .NET 8 Windows Forms tray application. `Program.cs` loads `AgentConfig`, shared JSON rules, `PolicyEngine`, `MaskitCoreService`, `AuditLogger`, and `ForegroundDetector`, then starts `TrayApplication`.

## Clipboard monitoring

`ClipboardMonitor` registers a message-only Win32 window and listens for `WM_CLIPBOARDUPDATE`. It retries clipboard opening, reads Unicode text, skips empty or unchanged text, asks the foreground detector for context, and delegates scanning and decisions to `MaskitCoreService`.

When the Core result contains redaction, the adapter replaces the clipboard with Unicode text. It logs Core audit projections locally and reports a redaction event to the tray UI.

## Rule and policy loading

`RuleEngine` loads JSON files from the copied `maskit-core/rules` directory. `PolicyEngine` reads default and context policy JSON from `maskit-core/policy`. The project file copies JSON artifacts into the build output.

## Audit logging

`AuditLogger` stores JSONL events locally, rotates logs above its configured maximum, computes chain hashes, and exposes recent events to the tray UI. It must never receive raw sensitive values.

## Parity

`CoreParityTests` loads repository `parity-fixtures.json` and checks Windows findings, actions, risk score, risk level, and audit event presence. Run with `dotnet run -- --parity`. This is a required Windows-side validation command, not a substitute for actually executing it.
