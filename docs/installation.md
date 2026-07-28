# Installation

Use the [Download page](../website/download/index.html) or the [latest GitHub Release](https://github.com/designx-studio/MaskIt/releases/latest). **Normal users do not need to clone this repository.**

For a full pilot checklist, use [pilot/02-installation-guide.md](pilot/02-installation-guide.md).

## Browser extension

1. Download the package for Chrome, Edge, Firefox, or Opera.  
2. Extract the ZIP.  
3. Open the browser extensions manager, enable developer mode when required.  
4. **Load unpacked** and select the folder containing `manifest.json`.  
5. Open Maskit settings and confirm protection is enabled.  

Supported AI hosts are limited to the patterns in the manifest (ChatGPT, Claude, Gemini, Copilot, Cursor).

## Windows agent (beta, clipboard)

1. Download `maskit-windows-agent.zip`.  
2. Extract and run `publish\Maskit.Agent.exe`.  
3. Verify with `--self-test` (see [windows-agent.md](windows-agent.md)).  

Portable package; not an MSI installer.

## MCP server

1. Download `maskit-mcp.tar.gz` and extract.  
2. Install Node.js 18+ if needed.  
3. Point your MCP client at the packaged server entry with absolute paths.  
4. See [mcp-server.md](mcp-server.md).  

## CLI

1. Download `maskit-cli.tar.gz` and extract.  
2. Run `node cli.js scan "…"` from the package (see [cli.md](cli.md)).  

## Updating

Replace packages from the newest release. Export browser settings first if customized.

## Uninstall

Remove the browser extension; delete extracted MCP/CLI/Windows folders; exit the tray agent. Local settings/logs live under browser storage or the user Maskit config directory.

## Contributors

Source builds: [development/](development/).
