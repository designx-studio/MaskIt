# Maskit Security & Trust Model

Maskit's success depends on user trust. This document explains how the extension handles sensitive data and the safeguards in place for public release.

## Threat model

Maskit intercepts text at paste, copy, and typing time on supported sites. Users are trusting the extension with potentially sensitive content during those moments. The design assumes:

- All processing must stay local
- Permissions must be minimal
- Detected values must never be persisted or transmitted
- UI must not render untrusted strings as HTML

## Permissions (v2.2.0)

Maskit requests the narrowest host access needed for launch:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`
- `https://mail.google.com/*`

No broad `<all_urls>` access. Expand only with clear user benefit and store review justification.

## Data handling

| Data | Stored? | Where |
|------|---------|-------|
| Settings / toggles | Yes | `chrome.storage.sync` |
| Aggregate counters | Yes | `chrome.storage.local` |
| Matched sensitive text | **No** | Never stored |
| Clipboard logs | **No** | Never stored |
| Page URLs beyond hostname | **No** | Not stored |

Stats messages from content scripts send **counts by type only**, not matched values.

## Detection engine

- Regex-based detection with post-match validation (Luhn for cards, mixed alphanumeric rules for M-Pesa, etc.)
- Custom user regex is length-limited and screened for catastrophic backtracking patterns
- Scan input is capped at 50,000 characters per operation

**Important:** Maskit helps reduce accidental exposure. It does **not** guarantee that all sensitive data will be caught.

## UI safety

- Extension UI uses `textContent` for user-derived values (review dialog, custom rule list)
- Avoid `innerHTML` with detected or user-supplied strings

## Editor integration

Rich editors (ChatGPT, Gmail) use the Selection API first, with `execCommand` only as a fallback. Targeted span replacement is preferred over wiping entire editor documents.

## Clipboard transparency

Maskit only reads clipboard data during explicit paste/copy events. This should be clearly communicated in:

- Chrome Web Store listing
- In-extension popup
- Privacy policy

## Recommendations before wider release

1. Open-source the detector engine (`detector.js`, `sanitizer.js`, `settings.js`)
2. Add optional review-before-redact as default for enterprise users
3. Publish a permission expansion policy before adding new hosts
4. Run periodic regex false-positive audits with real support-team samples
5. Never add telemetry that includes content, URLs, or matched values

## MCP server

The MCP server (`mcp-server/`) runs locally and communicates via stdio (JSON-RPC). It uses the shared detection engine (`engine/`) for all scanning.

### Data flow

```
Claude Desktop / IDE → stdio → mcp-server/server.js → engine/index.js
```

- All detection runs locally on the user's machine
- No network requests are made by the MCP server
- No raw page content is stored or transmitted
- Config is read from a local JSON file at a well-known OS location

### Config file security

- Config is stored at `%APPDATA%\Maskit\config.json` (Windows), `~/Library/Application Support/Maskit/config.json` (macOS), or `~/.config/maskit/config.json` (Linux)
- Only local users with filesystem access can read/write the config
- The config contains settings (toggles, rules, severity) — never matched content

### Custom rules

- Custom regex rules are validated for safety (length limits, catastrophic backtracking protection)
- Rules are stored in the config file and executed locally
- The `update_rules` tool validates patterns before accepting them

### Recommendations for MCP server

1. Run the server as a non-root user
2. Restrict filesystem access to the config directory
3. Do not expose the stdio interface over the network
4. Monitor the config file for unexpected changes

## Reporting issues

Report security concerns through the Chrome Web Store support channel or your project's security contact.
