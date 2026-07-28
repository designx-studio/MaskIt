# Data handling statement (MaskIt v2.4.0)

For design partner security and privacy questionnaires.  
**This is not a certification claim** (not SOC 2 / ISO 27001 / GDPR certification).

## 1. What MaskIt reads

| Surface | Data read |
|---------|-----------|
| Browser | Text the user types, pastes, copies, or selects in **supported AI host pages** (and related editable fields on those pages) |
| CLI | Text and file contents the user passes as arguments |
| MCP | Tool input strings supplied by the MCP client |
| Windows agent | Clipboard Unicode text when the clipboard updates |

MaskIt does **not** intentionally scrape the full desktop, keystrokes outside its adapters, or network traffic.

## 2. What is stored

| Data | Stored? | Where |
|------|---------|--------|
| Raw page content / raw clipboard body | **No** (processed in memory for detection) | — |
| Raw matched secret values in audit | **No** | — |
| Settings & policies | Yes | Browser `chrome.storage.local`; MCP/CLI config under user Maskit config dir; Windows `%AppData%\Maskit` |
| Stats counters | Yes (browser) | Local storage |
| Audit metadata (type, action, app, confidence, policy, timestamps, value **hash**) | Yes | Local only |
| Chain hash of audit events | Yes (browser/Windows) | Local only |

## 3. What leaves the machine

| Destination | Content |
|-------------|---------|
| **Maskit cloud / Maskit servers** | **None** for prompts, clipboard text, or matched values (product has no such service path) |
| **AI vendor** (ChatGPT, Claude, etc.) | Whatever content is **allowed** or never detected—subject to that vendor’s terms |
| **Customer SIEM / email / tickets** | Only if the customer **exports** audit CSV/JSONL themselves |

## 4. Retention

| Component | Default | Control |
|-----------|---------|---------|
| Browser audit | 30 days (configurable 1–365) | Options → retention; user/admin can reset log |
| Windows audit file | Local file until rotated/deleted | File system + max size rotation |
| MCP audit log | Local file with size rotation | Config directory |

There is no Maskit-side long-term retention of customer content.

## 5. Hashing

Canonical audit events include `matchedValueHash`: **SHA-256** of the matched string. In v2.4.0 this hash is **not salted**. It prevents storing the raw secret while still allowing correlation of identical matches. It is not a substitute for enterprise key management.

## 6. Customer responsibilities

1. Install only from official GitHub Releases and verify checksums when required.  
2. Configure policy for **external AI** risk appetite.  
3. Educate users: pause/off disables protection.  
4. Manage exported audit files under the customer’s own data policies.  
5. Accept residual risk of false negatives/positives and unsupported surfaces.  
6. Handle browser enterprise distribution (unpacked extension may need policy exception).  
7. Treat Windows agent as **clipboard beta**, not full endpoint DLP.

## 7. Subprocessors

MaskIt does not engage cloud subprocessors for prompt analysis. Third parties involved only if the customer uses third-party AI services (outside MaskIt’s control).

## 8. Contact

Pilot security questions: use the DesignX pilot contact channel provided at engagement start (website inquiries currently open a mail client to `support@designx.co.ke`).
