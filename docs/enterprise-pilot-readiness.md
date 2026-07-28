# MaskIt enterprise pilot readiness review

**Scope:** product/commercial readiness for first customer pilots  
**Constraint:** no architecture redesign required as a prerequisite  
**Date:** 2026-07-28  
**Overall verdict:** **technically credible local-first tool; not yet enterprise-pilot-ready as a managed security product.**  
Fit for **design-partner / technical pilot** with security-aware engineering teams; **not** ready for unmanaged MSP multi-client fleet rollout.

---

## Executive summary

| Dimension | Score (1–5) | One-line assessment |
|-----------|-------------|---------------------|
| Security claims honesty | **4** | Trust center is mostly careful; a few claim mismatches remain |
| Implementation depth | **3.5** | Shared rules + canonical audit are real; enterprise controls are device-local |
| Deployment reliability | **2.5** | Unpacked browser + portable ZIP; no store/MSI/auto-update |
| MSP readiness | **1.5** | No multi-client model, no fleet, no managed support path |
| Documentation (pilot) | **2.5** | Strong eng docs; weak admin/user/whitepaper packaging |
| Commercial packaging | **1.5** | No pricing, SLA, pilot kit, or demo environment |

**Bottom line:** You can run a **narrow, assisted pilot** (browser ± CLI/MCP, optional Windows beta) if you fix claim/doc inconsistencies and define pilot boundaries. You should **not** sell full “enterprise / MSP fleet” outcomes until management and deployment packaging exist (roadmap already says that is Phase 3).

---

## 1. Security claims vs implementation

### Supported claims (backed by code)

| Claim | Evidence |
|-------|----------|
| Local processing (no Maskit cloud for prompts) | Extension content scripts, Node MCP/CLI, Windows agent process locally; privacy policy states no upload to Maskit service |
| Scoped browser surface | Manifest host permissions limited to ChatGPT / Claude / Gemini / Copilot / Cursor patterns |
| Detect → policy → protect → audit | Shared rules, `allow`/`redact`/`block`, sanitizer/redaction, audit events |
| No raw secrets in audit events | Canonical events use `matchedValueHash` only; validators reject raw values |
| Hash-chained audit (browser / Windows) | Background + Windows `AuditLogger` chain hashes |
| Honest “not a guarantee” | Website security page + security model |
| No false SOC 2 / ISO / GDPR certification claims | Explicit on `website/security.html` |
| MIT / inspectable source | LICENSE + GitHub |

### Claims that need tightening or evidence

| Claim / surface | Issue | Severity |
|-----------------|-------|----------|
| **“Salted hashes”** (website security panel) | Canonical path uses **unsalted SHA-256** of the matched value (`engine/context.js`, Windows `HashValue`). Salt exists for other helpers (`hashSensitive`), not the canonical event hash | **High** (accuracy / trust) |
| **“Allow, warn, redact, block, or approval”** (marketing flow) | Schema supports `warn` / `require_approval`; **product UX mainly exposes allow/redact/block**. Policy guide already admits staged rollout | **Medium** |
| **“30+ secret formats”** | ~**40** rules total (~32 secrets + PII + financial). Roughly fair if worded carefully; needs a published rule inventory | **Low–Medium** |
| **“Before it reaches … AI”** | Browser covers listed hosts only; **not** all AI surfaces. Windows is **clipboard-only**, beta | **Medium** |
| **FAQ: Windows not a release binary** | FAQ still implies build-from-source / unsigned package narrative; product now has **self-contained `maskit-windows-agent.zip`** | **High** (docs lag) |
| **FAQ/install: MCP `npm ci` inside package** | Release MCP packaging may not match “run npm ci in package” for every layout; clean-install paths need one canonical story | **Medium** |
| **Extension not Web Store signed** | Enterprise browsers often block unpacked extensions without policy exceptions | **High** for enterprise deploy |
| **MIT alone** | Fine for OSS pilots; enterprises often need commercial support terms / DPA language even if product is local-first | **Medium** (commercial, not tech) |

### Evidence required for pilot trust reviews

1. **Data-flow diagram** per surface (browser / MCP / CLI / Windows): what is read, what is stored, where, retention.
2. **Threat model one-pager** signed off by eng: attacker, non-goals, residual risk (already partial on `security.html`).
3. **Rule catalog** (id, type, severity, example, known FPs).
4. **Sample audit events** (JSON) with proof of no raw values + optional chain verification script.
5. **Hash specification** (algorithm, salt or no salt, domain separation). Fix marketing if unsalted remains.
6. **Permissions matrix** (manifest hosts, storage, Windows capabilities).
7. **Build provenance**: release checksums + GitHub Actions attestations (pipeline already has attestation hooks).
8. **False-positive / false-negative notes** for payment cards, Kenyan phones, generic API patterns.

---

## 2. Enterprise deployment

### Installation workflow (today)

| Surface | How installed | Enterprise-ready? |
|---------|---------------|-------------------|
| Browser | Download ZIP → **Load unpacked** / developer mode | **Weak** — no Chrome Web Store / Edge Add-ons force-install package |
| Windows | Portable ZIP, self-contained exe | **Partial** — no MSI/MSIX, no Intune/GPO recipe |
| MCP | Tar extract + Node + client JSON config | **Dev-friendly**, not IT-standard |
| CLI | Tar extract + Node | Same |

**Gaps:** silent install, machine-wide policy, enrollment, health check, and non-admin user paths are undefined.

### Updates

- Manual: replace package / re-load extension.
- No auto-update channel, no staged rollout, no version pinning policy for tenants.
- Settings export exists for browser; upgrade of local audit/config is ad hoc.

### Permissions

| Surface | Permissions reality |
|---------|---------------------|
| Browser | Tight host list + `storage` + `contextMenus` — **good least privilege** for the product model |
| Windows | Clipboard + tray — **powerful** on endpoint; needs clear admin consent language |
| MCP/CLI | Full text access to whatever the user/tool feeds it — **by design**, must be in threat model |

### Logging

| What exists | Gap for enterprise |
|-------------|--------------------|
| Local audit (browser storage / MCP audit file / Windows `audit.jsonl`) | No SIEM forwarder, no central collector, no immutability beyond local chain hash |
| Retention (browser options) | Not org-enforced; user can reset log |
| Export CSV (browser options) | Not a compliance package (no signed export, no role separation) |

### Admin controls (device-local only)

**Present:** detection toggles, site allow/block list, per-context policies, redaction format, pause, killswitch (duration/schedule) in extension settings, config import/export.

**Missing for enterprise admin:**

- Org-wide policy push
- Role-based access (admin vs end user)
- Tamper-evident config (signed policy bundles — roadmap Phase 2/3)
- Killswitch that is **centrally enforced** (today it is local settings)
- Mandatory settings that users cannot disable

Windows killswitch can be set in code/policy engine but is not a mature admin console control.

---

## 3. MSP readiness

| Need | Status |
|------|--------|
| Multi-client tenancy | **None** — single-device local product |
| Per-client policy packs | Manual file copy / config import only |
| Agent inventory / last-seen | **None** |
| Remote disable / killswitch | **None** (local only) |
| Multi-tenant audit review | **None** — logs stay on endpoints |
| Billing / seats | **None** |
| Support workflow | **mailto** contact form only (`support@designx.co.ke`) |
| Troubleshooting runbooks for L1 | Partial eng troubleshooting; not MSP playbooks |
| White-label / client branding | **None** |

**MSP conclusion:** product is a **tool MSPs can recommend and install per client**, not an **MSP platform**. Selling “we manage Maskit for 50 clients” requires process and tooling that does not exist.

### Support workflow gaps

- No severity definitions / SLA
- No ticket system integration
- No known-issue register for pilots
- Docs still mix **clone-from-source** onboarding with **release download** install

---

## 4. Documentation

| Artifact | Exists? | Pilot quality |
|----------|---------|---------------|
| Admin guide | **No** dedicated guide | Need: install, policy baseline, killswitch, retention, export, update, uninstall |
| User guide | **No** end-user guide | Need: what Maskit does, pause, review dialog, when to expect blocks |
| Security whitepaper | Partial (`security.html` + short `security-model.md`) | Need PDF-grade: architecture, claims table, residual risk |
| Data handling statement | Partial privacy policy + privacy.md | Need formal DPA-friendly statement (even for local-only: what customer data touches the product) |
| Installation | `installation.md` | OK skeleton; outdated relative to Windows package story |
| Onboarding | `onboarding.md` | **Dev/source-centric** — bad first pilot path |
| Policy guide | `policy-guide.md` | Good direction; honest about warn/approval |
| Troubleshooting | `troubleshooting.md` | Eng-oriented; needs pilot L1 section |
| FAQ | `faq.md` | **Stale** on Windows packaging / updates |

**Docs contradiction risk for pilots:** website says “download release, no compile”; FAQ/onboarding/windows docs still push `dotnet build` / clone paths in places.

---

## 5. Commercial readiness

| Area | Status |
|------|--------|
| Pricing | **None** published |
| Packaging (SEAT / device / site) | **Undefined** |
| Pilot terms (duration, success metrics, support hours) | **Undefined** |
| Demo environment | **None** — prospects self-install or you screenshare |
| Sales collateral | Website + contact form only |
| Legal | MIT + short privacy page; no enterprise MSA/DPA template |
| Success metrics for pilot | Not defined |

**Reasonable pilot packaging (recommendation, not implemented):**

- 30-day design partner
- Surfaces: browser (required) + CLI/MCP optional + Windows optional beta
- Success: X accidental secret blocks, audit export review, false-positive rate bound
- Support: weekly check-in + Slack/email, no 24/7

---

## Blockers before first pilot

Prioritized for **first paying or formal design-partner pilot** (not for casual GitHub users).

### P0 — do not start formal pilot until fixed

| # | Blocker | Why |
|---|---------|-----|
| 1 | **Align security copy with implementation** (esp. “salted hashes”; warn/approval language) | Trust failure if security reviewer diffs marketing vs code |
| 2 | **Single canonical install path for pilots** (release ZIP only; fix FAQ / onboarding / windows.md) | Support chaos and failed installs |
| 3 | **Browser enterprise install story** (at least documented: force-install via policy *or* managed “developer mode exception” + risk acceptance) | Many orgs cannot load unpacked extensions |
| 4 | **Pilot scope document** (in/out of scope: hosts, Windows beta, no fleet, residual risk) | Prevents over-selling |
| 5 | **Evidence pack** (rule list, sample audits, checksums, data handling statement) | Security questionnaires will ask |

### P1 — should fix in first 2 weeks of pilot

| # | Item |
|---|------|
| 6 | Admin quickstart + user one-pager |
| 7 | Baseline policy pack (recommended defaults for external AI) |
| 8 | Update/uninstall runbook |
| 9 | Known FPs/FNs + how to disable a rule type |
| 10 | Support mailbox process (even if lightweight) |
| 11 | Windows agent labeled **beta** everywhere consistently; clipboard-only boundary |

### P2 — not required for first pilot, required for scale/MSP

| # | Item |
|---|------|
| 12 | Store-signed browser package or enterprise force-install package |
| 13 | MSI/MSIX + Intune |
| 14 | Auto-update |
| 15 | Central policy / inventory (roadmap Phase 3) |
| 16 | SIEM export |
| 17 | Commercial license + pricing + DPA |
| 18 | Demo tenant / recorded demo environment |

---

## Recommended fixes (no architecture change)

### Claims & evidence (P0)

1. Change website “salted hashes” → **“irreversible SHA-256 hashes of matched values (no raw secrets)”**, *or* add a real salt/pepper to the canonical hash and document it.
2. Change decision marketing to **“allow / redact / block (warn & approval in schema, staged)”**.
3. Publish a **Claims ↔ Evidence** table on Trust page (claim, component, test, link to schema).
4. Fix FAQ Windows packaging to match **self-contained release ZIP** + unsigned portable reality.
5. Keep “0 raw prompts to a Maskit cloud” — it is strong and defensible; pair with “customer’s AI vendor still receives whatever is not blocked.”

### Deployment (P0–P1)

6. **Pilot Install Guide** (PDF/MD): browser Chrome/Edge only first; 15 minutes; screenshots; success checklist.
7. Document **Group Policy / browser policy constraints** honestly if unpacked is required.
8. Provide **recommended baseline policy JSON** export for options import.
9. Windows: “extract → run exe → confirm tray → `--self-test`” as primary path; move `dotnet build` to contributor docs.

### MSP (P1 process, P2 product)

10. MSP playbook v0: per-client install checklist, per-client config export storage, incident “how to collect audit CSV,” no multi-tenant claim.
11. Do **not** sell agent management until inventory exists.

### Documentation (P0–P1)

12. Create four short pilot docs (can be thin):
    - Admin guide
    - User guide
    - Security whitepaper (expand security.html)
    - Data handling statement
13. Rewrite onboarding for **download-first**, not `git clone`.

### Commercial (P0 process)

14. Define pilot offer: duration, surfaces, success criteria, support channel, exit criteria.
15. Pricing **assumption** for internal use only until validated: e.g. design partner free / discounted; later seat-based for managed browser; Windows as add-on — **not publish until package solid**.
16. Demo: fixed 10-minute script + recorded video using synthetic secrets (no live customer data).

---

## Evidence required (checklist for sales/security review)

| Evidence | Status today | Owner action |
|----------|--------------|--------------|
| Local-only data flow diagram | Partial | Write + publish |
| Canonical event schema | **Yes** | Link in whitepaper |
| Rule catalog with versions | **In repo JSON** | Export human-readable |
| Parity / E2E results | **Yes in CI/local** | Attach to pilot packet |
| Release checksums / attestations | **Checksums yes; signing no** | Document how to verify |
| Sample redacted audit export | Generate from fixture run | Include in pack |
| Permissions & residual risk | Partial | Finalize |
| Incident response / disclosure | “report via repo/support” only | Add security@ contact + SLA intent |
| Customer success metrics | None | Define before pilot kickoff |

---

## Priority order (recommended sequence)

1. **Claim accuracy pass** (salted hash, approval/warn, FAQ/Windows docs)
2. **Pilot scope + residual risk one-pager** (signed by product)
3. **Download-first install guide + success checklist**
4. **Evidence pack** (rules, sample audits, checksums, data handling)
5. **Admin + user mini-guides**
6. **Baseline policy export** for external AI
7. **Support process** (mailbox, response time, known issues)
8. **Browser distribution plan** (store *or* documented enterprise exception)
9. **Windows beta packaging polish** (MSI later; for pilot portable is OK if labeled)
10. **Commercial terms** (pilot agreement; pricing after 1–2 design partners)
11. **MSP multi-client tooling** (only after single-tenant pilot success)

---

## Pilot recommendation

**Start first pilot as:**

- **Audience:** security-conscious engineering org (10–50 AI power users), not regulated MSP multi-tenant
- **Surfaces:** browser on listed AI hosts (primary); MCP/CLI for power users; Windows **optional beta**
- **Promise:** reduce *accidental* secret/PII pastes into known AI web apps + local audit evidence
- **Do not promise:** full DLP, all AI apps, fleet admin, compliance certification, zero false negatives

**Gate to “enterprise general availability” (later):** store/enterprise browser distribution, signed Windows installer, auto-update, central policy or at least signed policy bundles, SIEM export, commercial support tier.

---

## What is already strong for a first design partner

- Local-first story that matches code
- Shared rule source and improving adapter parity
- Canonical audit without raw secrets
- Honest non-goals on security page
- Multiple surfaces with one detection vocabulary
- MIT + public repo for technical buyers who want to inspect

Those are real advantages. The gap is **managed enterprise packaging and claim hygiene**, not absence of a product core.

---

## Related documents

- [Security model](security-model.md)
- [Privacy](privacy.md)
- [Policy guide](policy-guide.md)
- [Installation](installation.md)
- [Onboarding](onboarding.md)
- [Roadmap](roadmap.md)
- [Session changes 2026-07-28](session-changes-2026-07-28.md)
- Website: `website/security.html`, `website/index.html`
