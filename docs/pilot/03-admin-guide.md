# Pilot admin guide

For security/engineering admins configuring MaskIt during a design partner pilot.

## 1. Surfaces to enable

| Priority | Surface | Notes |
|----------|---------|--------|
| Required | Browser extension | Primary value for chat-based AI |
| Optional | CLI / MCP | Power users and automation |
| Optional | Windows agent | Clipboard only; label as **beta** |

## 2. Recommended defaults (external AI)

Use **redact** for structured PII and **block** for high-risk credentials/cards when talking to external AI web apps.

Suggested starting point (aligns with shared defaults in `maskit-core/policy/defaults.json`):

| Data type | Recommended action |
|-----------|--------------------|
| EMAIL, PHONE, IP_ADDRESS, PASSPORT, MPESA | redact |
| API_KEY | redact or block (prefer **block** for strict pilots) |
| CARD, SSN, BANK_ACCOUNT | **block** |

Browser: Options → **Policies** → edit **Default** and app-specific contexts (e.g. chatgpt.com, claude.ai).

Also enable:

- Protection **ON**
- Scan **paste** and **typing** (copy optional)
- **Review before redact** for the first week of pilot (reduces surprise), then tighten
- Site list: **all** supported hosts, or allowlist if your org restricts AI sites

## 3. Settings map (browser)

| Area | Purpose |
|------|---------|
| Detection toggles | Enable/disable EMAIL, API_KEY, CARD, etc. |
| Redaction format | stars / tagged / custom |
| Site list | allowlist / blocklist hostnames |
| Policies | per-context allow/redact/block |
| Killswitch | temporary org-style lockout (local setting, not cloud-enforced) |
| Audit retention | 1–365 days (default 30) |
| Pause auto-resume | Temporary bypass with timer |

Import/export configuration from Options when rolling out the same baseline to multiple pilot machines.

## 4. Exporting audit logs

### Browser

1. Open MaskIt Options → **Audit log**.  
2. Filter by type/action if needed.  
3. **Export CSV** for review.  
4. Confirm exported rows contain metadata and hashes—not raw secrets.

### Windows

Audit JSONL under `%AppData%\Maskit\` (typically `audit.jsonl`). Copy files for pilot review; do not commit to source control.

### MCP

Local audit log path under the Maskit config directory (platform-specific; see MCP config). Use `get_audit_log` tool for recent events.

## 5. Killswitch

Local admin control: enable with message, optional duration or schedule. When active, AI tool use can be blocked in the browser adapter.

**Pilot note:** Killswitch is **device-local**. It is not a central fleet command.

## 6. Troubleshooting

| Symptom | Checks |
|---------|--------|
| Extension does nothing | Host match? Protection ON? Site not blocklisted? Pause off? |
| Too many false positives | Disable noisy types (e.g. MPESA, IP) or adjust policy to allow |
| User cannot install | Org blocks unpacked extensions → need policy exception |
| Windows does not redact | Clipboard path only; app must put text on clipboard; run `--self-test` |
| Audit empty | Confirm an action occurred; retention not zero; log not reset |

More engineering detail: [troubleshooting](../troubleshooting.md).

## 7. Update and uninstall

See [Installation guide](02-installation-guide.md). Always export config before major upgrades.

## 8. What not to promise

- Org-wide remote policy push  
- SIEM integration out of the box  
- SOC 2 / ISO certification from MaskIt  
- Coverage of every AI product  
