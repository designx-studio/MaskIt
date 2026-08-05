# MaskIt Pilot Installation Guide

This guide provides step-by-step instructions for installing MaskIt across supported environments during the initial 5-participant pilot (2 developers, 2 small businesses, 1 IT/MSP evaluator).

---

## 1. Browser Extension (Developers & Small Businesses)

Supported Browsers: **Chrome, Edge, Firefox, Opera**

### Installation Steps
1. Download the latest `maskit-browser-extension.zip` release artifact.
2. Unpack the ZIP archive to a local folder (e.g. `C:\Tools\MaskIt-Extension`).
3. Open your browser's extension page:
   - Chrome / Edge: `chrome://extensions` or `edge://extensions` (Enable **Developer mode** toggle in top-right).
   - Firefox: `about:debugging#/runtime/this-firefox` -> **Load Temporary Add-on...**
4. Click **Load unpacked** and select the unpacked folder.
5. Confirm the MaskIt shield icon appears in your toolbar.

---

## 2. VS Code Extension (Developers)

### Installation Steps
1. Open VS Code.
2. Navigate to `maskit-vscode` directory or install via `.vsix` package:
   - Run `code --install-extension maskit-vscode-2.4.0.vsix`
3. Alternatively, open `maskit-vscode` in VS Code and press `F5` to run in Extension Development Host mode.
4. Verify status bar item `MaskIt: Active` appears.

---

## 3. Windows Clipboard Agent (IT/MSP Evaluator & Small Business Endpoints)

### Installation Steps
1. Extract `maskit-windows-agent.zip` into `C:\Program Files\MaskIt\`.
2. Run `Maskit.Agent.exe --register-startup` (or run executable directly).
3. The agent will silently monitor clipboard activity and enforce local redaction policies.

---

## 4. MCP Server & CLI (Developers & AI Workflows)

### Installation Steps
```bash
npm install -g @maskit/mcp-server
# Or run locally from source:
cd mcp-server
node cli.js scan "test string"
```
To connect to Claude Desktop or Cursor:
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "maskit": {
      "command": "node",
      "args": ["/path/to/maskit-extension/mcp-server/server.js"]
    }
  }
}
```

---

## 5. Verification Checklist (Target: < 10 Minutes Setup)
- [ ] Browser extension icon visible and active on AI sites (`chatgpt.com`, `claude.ai`).
- [ ] VS Code extension scanning active files.
- [ ] Audit log directory initialized at `%APPDATA%\Maskit\audit.jsonl` (Windows) or `~/.config/Maskit/audit.jsonl` (POSIX).
