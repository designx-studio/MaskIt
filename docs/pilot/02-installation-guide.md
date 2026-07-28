# Pilot installation guide

**Customer path:** Download → Install → Verify → Use  
Do **not** require `git clone` or source builds for pilot users.

Assets: [GitHub Releases (latest)](https://github.com/designx-studio/MaskIt/releases/latest) or the [download page](../../website/download/index.html).

---

## 1. Browser extension (required for most pilots)

### Download

- Chrome: `maskit-chrome.zip`  
- Edge: `maskit-edge.zip`  
- Firefox: `maskit-firefox.zip`  
- Opera: `maskit-opera.zip`  

Optional: verify the file against `SHA256SUMS.txt` from the same release.

### Install (Chrome / Edge)

1. Extract the ZIP to a permanent folder (not Downloads if your org cleans it).  
2. Open `chrome://extensions` or `edge://extensions`.  
3. Enable **Developer mode**.  
4. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.  
5. Pin MaskIt from the toolbar.  
6. Open **Options / Settings** and confirm protection is **ON**.

### Enterprise note

Many organizations restrict unpacked extensions. For pilots, document a **risk acceptance** or enterprise browser policy exception. Store distribution is not required for design partners but may be required for broad rollout later.

### Verify

1. Open a supported host (e.g. `https://chatgpt.com`).  
2. Paste a **synthetic** test string: `Contact pilot-test@example.com`.  
3. Confirm the email is masked/redacted (or blocked per policy) and that page content is not uploaded to Maskit.  
4. Open extension options → **Audit log** and confirm an event with type/metadata and **no raw email**.

### Uninstall

Remove MaskIt from the browser extensions manager. Optionally clear extension data when prompted.

---

## 2. Windows agent (optional beta)

### Download

- `maskit-windows-agent.zip` (self-contained `win-x64`)

### Install

1. Extract the ZIP.  
2. Open `publish\Maskit.Agent.exe` (tray agent).  
3. Confirm tray icon is active and protection is ON.  

No MSI is provided in v2.4.0. The package is portable and **not code-signed** as a store/MSI installer unless a future release adds signing.

### Verify

From `publish\` (Command Prompt or PowerShell):

```powershell
.\Maskit.Agent.exe --self-test
.\Maskit.Agent.exe --scan "email pilot-test@example.com" --json
```

Expect: `SELFTEST PASS` and JSON events with `schemaVersion: "1.0"`, `source: "windows"`, and `matchedValueHash` only.

Clipboard check: copy a synthetic API-key-shaped string while an AI app is focused; confirm clipboard is redacted when policy requires it.

### Uninstall

1. Exit the tray agent.  
2. Delete the extracted folder.  
3. Optional: remove `%AppData%\Maskit\` (config + local audit).

---

## 3. CLI (optional)

### Download

- `maskit-cli.tar.gz`

### Install

```bash
# Extract, then from the package root that contains cli.js:
node cli.js scan "email pilot-test@example.com" --json
```

(On Windows, use `tar -xzf maskit-cli.tar.gz` then run with full path to `node`.)

### Verify

Exit code `1` when findings exist is expected. JSON output must include canonical `events` without raw secrets.

### Uninstall

Delete the extracted directory.

---

## 4. MCP server (optional)

### Download

- `maskit-mcp.tar.gz`

### Install

1. Extract the archive.  
2. Ensure Node.js 18+ is installed.  
3. Configure your MCP client to run the packaged server entry (see [MCP guide](../mcp-server.md) for client JSON examples). Prefer absolute paths to the extracted package.  
4. Restart the MCP client.

### Verify

Call `scan_text` or `get_status` from the client. Confirm findings and events are returned locally.

### Uninstall

Remove the MCP client config entry and delete the extracted directory. Optional: remove the Maskit config directory under the user profile.

---

## 5. Updating

1. Export browser settings if customized (Options → export).  
2. Download the newest release assets.  
3. Replace packages and re-load the extension / restart the agent.  
4. Re-run verification steps above.

---

## Success checklist

- [ ] Extension loads and shows Active on a supported AI host  
- [ ] Synthetic PII/secret is redacted or blocked  
- [ ] Audit log shows metadata + hash only  
- [ ] (Optional) Windows `--self-test` passes  
- [ ] (Optional) CLI/MCP scan returns findings without raw secret storage  
