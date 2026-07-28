# Claims ↔ Evidence Matrix (MaskIt v2.4.0)

Customer-facing claims must match implementation. This matrix is the pilot source of truth.

| Claim | Implementation evidence | Verification test | Limitations |
|-------|-------------------------|-------------------|-------------|
| MaskIt processes sensitive content **locally** (no MaskIt cloud for prompts) | Browser content scripts; Node MCP/CLI; Windows agent. No remote upload API for page/clipboard text | `docs/privacy.md`; privacy policy; code review of extension/MCP/agent | The **customer’s AI vendor** still receives anything not blocked/redacted |
| **0 raw prompts** sent to a Maskit-hosted service | No Maskit backend; local storage only | Architecture + privacy docs | Not a claim about OpenAI/Anthropic/Google retention |
| Browser protects **listed AI hosts only** | `manifest.json` host_permissions / content_scripts matches | `npm test` (manifest assertions); manual load on chatgpt.com | Not all AI websites or desktop apps |
| Detection uses **shared rules** from `maskit-core/rules` | `engine/rule-loader.js`, `browser-rules.js` generator, Windows `RuleEngine` | `npm test` parity; `npm run test:cross-adapter-parity` | Pattern detectors miss novel formats; FPs possible |
| Policy actions **allow / redact / block** are user-visible | Browser options policies; defaults in `maskit-core/policy`; engine `getPolicyAction` | Manual options UI; `engine/test.js` policy tests | **Warn** and **require_approval** exist in schema only—not primary product UX |
| Audit events are **canonical schema 1.0** | `engine/context.js`, browser `context-event.js`, Windows `CoreAuditEvent` | `npm run test:canonical-events`; `test:adapter-events` | Chain hash is local integrity aid, not WORM SIEM |
| Audit stores **irreversible SHA-256 hashes**, not raw secrets | `matchedValueHash` only; validators reject `value`/`matchedValue` | `npm run test:canonical-events`; sample events in pilot evidence | Canonical hash is **unsalted** SHA-256 of the matched string (not a keyed HMAC) |
| Hash-chained audit on browser and Windows | Background service worker; Windows `AuditLogger` | Manual audit append; Windows package tests | User can reset/delete local logs |
| Windows agent is **clipboard protection** | `ClipboardMonitor.cs` | `npm run test:windows-package`; `--self-test` | Beta; no keystroke/screen capture; data never on clipboard is invisible |
| Defense-in-depth, **not a guarantee** | Stated on website security page and security-model | N/A (positioning) | False negatives and novel secret shapes remain |
| **No SOC 2 / ISO 27001 / GDPR certification** claimed | Explicit non-claim on `website/security.html` | `npm run test:docs` | Customers may still need their own compliance programs |
| Release packages install without compiling source | `npm run build` artifacts; download page | `npm run test:release-artifacts`; `test:clean-install` | Browser still requires sideload/developer mode until store distribution |
| MIT licensed / source inspectable | `LICENSE`; public GitHub | N/A | Commercial support/DPA not included in OSS alone |

## Explicit non-claims

MaskIt **does not** claim:

- Full enterprise DLP coverage
- Protection of all AI applications
- Compliance certification (SOC 2, ISO 27001, GDPR certification)
- Central fleet management or multi-tenant MSP control
- SIEM integration out of the box
- Zero false positives / false negatives
- Signed Windows MSI or browser store listing (unless a specific release adds them)

## Related pilot docs

- [Pilot overview](pilot/01-pilot-overview.md)
- [Pilot scope](pilot/pilot-scope.md)
- [Security whitepaper](pilot/05-security-whitepaper.md)
- [Evidence package](pilot/evidence/)
