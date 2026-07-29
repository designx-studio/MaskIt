# MaskIt Agent Enterprise Installer & Deployment Guide

This directory contains the WiX-based MSI installer configuration and automation build pipeline.

## Build Requirements

* **WiX Toolset (v3 or v4):** If not present, the `build-msi.ps1` script will automatically install WiX v4 globally via `dotnet tool install`.
* **.NET 8 SDK / Desktop SDK**

To build the MSI installer:
```powershell
powershell -File .\installer\build-msi.ps1
```

The resulting installer is saved at `dist\MaskIt.Agent.msi`.

---

## Code Signing (Task 3)

To produce a signed production build, set the environment variables before running the build script:

```powershell
$env:SIGNING_ENABLED="true"
$env:CERTIFICATE_PATH="C:\path\to\your\cert.pfx"
$env:CERTIFICATE_PASSWORD="your-strong-password"

powershell -File .\installer\build-msi.ps1
```

### Key SignTool Requirements:
* SignTool is typically installed with the Windows SDK (`C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64\signtool.exe`).
* Ensure `signtool` is added to your PATH or copy it to your build directory.

---

## Deployment Commands (Silent / Automated)

### Silent Installation
To deploy silently on endpoints via Intune, Microsoft Endpoint Manager, or RMM tools:
```powershell
msiexec /i MaskIt.Agent.msi /quiet /qn /norestart
```
* Registers and starts the Windows Service `MaskItAgent` to run under the `LocalSystem` account.
* Registers the interactive tray agent to run automatically on user login (`HKLM\Software\Microsoft\Windows\CurrentVersion\Run`).

### Silent Uninstallation
```powershell
msiexec /x MaskIt.Agent.msi /quiet /qn /norestart
```
* Stops and deletes the `MaskItAgent` service.
* Removes files, configuration, and unregisters startup entries cleanly.

---

## Operational Health Monitoring

IT administrators and RMM tools can monitor the active state of the MaskIt agent locally using the loopback health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8088/health
```

### Sample Response:
```json
{
  "status": "active",
  "version": "2.4.0",
  "policyVersion": "default",
  "lastSync": "2026-07-29T08:00:00Z",
  "rulesLoaded": 40,
  "uptime": 3600
}
```

* Binding is restricted to `127.0.0.1`. Requests originating from outside loopback or external interfaces will be refused automatically.
* operational metadata only is returned; no clipboard history, prompts, or sensitive variables are logged or exposed.
