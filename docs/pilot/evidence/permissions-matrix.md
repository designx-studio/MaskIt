# Permissions and access matrix (v2.4.0)

## Browser extension

| Permission / capability | Purpose | Scope |
|-------------------------|---------|--------|
| `storage` | Settings, stats, audit log | Local only (`chrome.storage.local`) |
| `contextMenus` | “Scan & Redact Selection” | User-initiated |
| Host permissions | Inject content scripts | `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `*.cursor.com` only |
| Content scripts | Detect/redact in page editors | Same hosts, `document_start` |
| Service worker | Badge, audit persistence, config import/export | Extension process |
| Clipboard via paste events | Read paste payload on protected pages | Event-driven on supported hosts |

**Not requested:** `<all_urls>`, remote code, nativeMessaging (browser package), sync storage.

## Windows agent

| Capability | Purpose | Scope |
|------------|---------|--------|
| Clipboard listener | Detect sensitive clipboard text | Interactive user session |
| Clipboard replace | Apply redaction | When policy is not allow |
| Tray UI | Status, pause, open config, view recent audit | User desktop |
| File I/O | Config + audit JSONL under `%AppData%\Maskit` | Local profile |
| Packaged `maskit-core` | Rules and policy | Next to executable |

**Does not:** keylogging, screen capture, kernel drivers, network upload of clipboard content.

## CLI

| Access | Purpose |
|--------|---------|
| Process arguments / files the user opens | Scan and redact |
| Local filesystem (read input files) | `scan-file` |
| Optional config under user Maskit config dir | Settings |

No background service. No browser injection.

## MCP server

| Access | Purpose |
|--------|---------|
| Stdio tool calls from MCP client | scan/redact/evaluate/status |
| Local config + audit files | Persistence |
| Engine + `maskit-core` on disk | Detection |

The MCP client (e.g. Claude Desktop) may send tool arguments containing user text—MaskIt evaluates that text **locally**.

## Trust boundary summary

```
[User / AI web app / MCP client]
        │ text enters MaskIt adapter
        ▼
[Local MaskIt process]
        │ audit metadata + hashes only retained
        ▼
[AI vendor]  ← only if content allowed / undetected
```
