# MaskIt security whitepaper (v2.4.0)

**Purpose:** Technical trust document for design partner security review.  
**Product:** Local AI context protection — not full DLP, not a certified compliance product.

---

## 1. Architecture

```
                    ┌─────────────────────────────────────┐
                    │     maskit-core (shared source)     │
                    │  rules/*.json  policy  audit schema │
                    └───────────────┬─────────────────────┘
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
   ┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
   │ Browser MV3   │      │ Node engine     │      │ Windows agent   │
   │ extension     │      │ CLI + MCP       │      │ (clipboard)     │
   │ content + SW  │      │ local process   │      │ tray + monitor  │
   └───────┬───────┘      └────────┬────────┘      └────────┬────────┘
           │                       │                        │
           └───────────────────────┼────────────────────────┘
                                   ▼
                    Canonical context events (schema 1.0)
                    Local storage only · no Maskit cloud
```

One rule source (`maskit-core/rules`) feeds browser (generated bundle), Node (`rule-loader`), and Windows (`RuleEngine`).

---

## 2. Data flow

| Step | What happens |
|------|----------------|
| 1. Capture | Text from paste/type/selection (browser), argv/files (CLI), tool args (MCP), or clipboard (Windows) |
| 2. Detect | Regex + validators (e.g. Luhn for cards) against shared rules |
| 3. Decide | Policy: allow / redact / block (per type and optional app context) |
| 4. Protect | Rewrite text or prevent submission/clipboard update |
| 5. Audit | Emit canonical event with **SHA-256 hash of matched value**, never the raw secret |

**What leaves the machine to Maskit?** Nothing for prompts or matches.  
**What may leave the machine otherwise?** Content that is **allowed** or never detected still goes to the **AI vendor** the user is using.

---

## 3. Threat model

### In scope (intended reductions)

- Accidental paste of API keys, tokens, cards, structured PII into **supported** AI web apps  
- Accidental clipboard copy of secrets into AI tools (Windows beta)  
- Local developer scripts leaking secrets into AI via CLI/MCP tooling  

### Out of scope (non-goals)

- Malware, phishing, secure browsing  
- Insider exfiltration via non-AI channels  
- Full network DLP / CASB  
- Guaranteeing detection of every secret format  
- Protecting AI apps outside the supported surface list  
- Centralized multi-tenant fleet control  

### Residual risk

- Novel or obfuscated secrets  
- Unsupported sites and native AI desktop apps (except clipboard on Windows)  
- Users pausing or disabling protection  
- Local audit log deletion by the user/admin  
- AI vendor retention of allowed content  

---

## 4. Audit security model

### Canonical event fields (schema 1.0)

`schemaVersion`, `eventId`, `timestamp`, `source`, `application`, `dataType`, `confidence`, `risk`, `policy`, `action`, `explanation`, optional `ruleId`, optional `matchedValueHash`, optional chain hash.

### Hashing

- Algorithm: **SHA-256** over the matched string as UTF-8  
- v2.4.0 canonical events use **unsalted** hashes (irreversible for practical recovery of high-entropy secrets; **not** a keyed HMAC)  
- Marketing must not claim “salted” unless implementation adds a salt/pepper  

### Local integrity

Browser and Windows append chain hashes linking events. This detects casual local tampering of the log file/storage sequence; it is not a remote WORM archive.

---

## 5. Local processing

| Component | Process location | Persistence |
|-----------|------------------|-------------|
| Browser | Extension process / content script | `chrome.storage.local` (settings, stats, audit) |
| CLI | Local Node | No required network |
| MCP | Local Node (stdio) | Config + audit under user Maskit config dir |
| Windows | Local WinExe | Config + audit under `%AppData%\Maskit` |

No Maskit-operated cloud inference or prompt relay.

---

## 6. Permissions (summary)

See [permissions matrix](evidence/permissions-matrix.md).

- Browser: storage, contextMenus, host permissions for listed AI sites only  
- Windows: clipboard monitoring in user session  
- CLI/MCP: only text the user/process supplies  

---

## 7. Verification

- Unit/parity/canonical tests: `npm test`, `npm run test:canonical-events`  
- Packages: `npm run test:release-artifacts`, `npm run test:clean-install`  
- Browser E2E: `npm run test:e2e:chromium`  
- Windows: `npm run test:windows-package`  
- Doc claim hygiene: `npm run test:docs`  

---

## 8. Related documents

- [Claims ↔ evidence matrix](../claims-evidence-matrix.md)  
- [Data handling statement](06-data-handling-statement.md)  
- [Pilot scope](pilot-scope.md)  
- [Security model](../security-model.md)  
