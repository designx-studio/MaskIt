# Windows agent (customer)

The Windows tray agent is **beta** and provides **system-wide clipboard protection**. It applies shared Maskit rules and policies, rewrites sensitive clipboard content, and records **local canonical audit events**.

It does **not** read keystrokes or screen content, and it cannot inspect data that never reaches the clipboard.

## Install (recommended)

1. Download `maskit-windows-agent.zip` from [GitHub Releases](https://github.com/designx-studio/MaskIt/releases/latest).  
2. Extract the archive.  
3. Run `publish\Maskit.Agent.exe`.  
4. Confirm the tray icon is active.  

```powershell
# Verification (from the publish folder)
.\Maskit.Agent.exe --self-test
.\Maskit.Agent.exe --scan "email pilot-test@example.com" --json
```

See the [pilot installation guide](pilot/02-installation-guide.md) for uninstall and checksum verification.

## What is packaged

- Self-contained `win-x64` executable  
- `maskit-core` rules and policy JSON next to the binary  
- No repository checkout required at runtime  

The package is portable and not an MSI. Signing is not guaranteed in v2.4.0.

## Contributor builds

Source build and publish details: [development/README.md](development/README.md).
