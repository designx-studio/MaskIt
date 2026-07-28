# Windows Agent

The Windows tray agent is beta and requires .NET 8. It monitors clipboard update events, applies shared Maskit rules and policies, rewrites sensitive clipboard content, and records local audit events.

It does not read keystrokes or screen content, and it cannot inspect data that never reaches the clipboard.

```powershell
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj -- --parity
```