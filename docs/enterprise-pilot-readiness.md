# MaskIt enterprise pilot readiness review

**Scope:** product/commercial readiness for first customer pilots  
**Constraint:** no architecture redesign required as a prerequisite  
**Updated:** 2026-07-28 (post pilot-package delivery)  
**Product version:** 2.4.0  

**Overall verdict:** **Ready for a narrow, assisted design-partner pilot** with security-aware engineering teams.  
**Not ready** for unmanaged MSP multi-client fleet rollout or “enterprise platform” sales promises.

---

## Status since original review

| Area | Original (gaps) | Current (after pilot package work) |
|------|-----------------|-------------------------------------|
| Claim accuracy | Salted hashes, warn/approval marketing, stale FAQ/Windows | **Fixed** in website + docs; `npm run test:docs` gate |
| Claims matrix | Missing | **`docs/claims-evidence-matrix.md`** |
| Pilot docs | Missing admin/user/whitepaper/data handling | **`docs/pilot/01`–`06` + scope** |
| Evidence pack | Missing | **`docs/pilot/evidence/`** (rules, samples, verification, permissions) |
| Download-first install | Onboarding was clone-centric | **Onboarding / install / FAQ / Windows customer docs** updated; contrib in `docs/development/` |
| Windows package | Incomplete packaging story | Self-contained ZIP + clean-install verification |
| Doc consistency automation | None | **`scripts/verify-doc-consistency.js`** → `npm run test:docs` |

**Pilot entrypoint for customers:** [docs/pilot/README.md](pilot/README.md)

---

## Executive summary

| Dimension | Score (1–5) | One-line assessment |
|-----------|-------------|---------------------|
| Security claims honesty | **4.5** | Claims aligned for pilot; residual residual-risk communication required |
| Implementation depth | **3.5** | Shared rules + canonical audit real; enterprise controls still device-local |
| Deployment reliability | **3** | Documented download path; still no store/MSI/auto-update |
| MSP readiness | **1.5** | No multi-client model, fleet, or managed platform |
| Documentation (pilot) | **4** | Full design-partner package in `docs/pilot/` |
| Commercial packaging | **2** | Pilot scope/metrics defined in docs; no public pricing/SLA/demo env |

**Bottom line:** Use **browser (required) ± CLI/MCP ± Windows beta** under [pilot-scope.md](pilot/pilot-scope.md). Do **not** sell full enterprise/MSP fleet outcomes until Phase 3-style management exists.

---

## 1. Security claims vs implementation

### Supported claims (backed by code + matrix)

| Claim | Evidence |
|-------|----------|
| Local processing (no Maskit cloud for prompts) | Extension, Node MCP/CLI, Windows agent; [data handling](pilot/06-data-handling-statement.md) |
| Scoped browser surface | Manifest hosts only; [permissions matrix](pilot/evidence/permissions-matrix.md) |
| Detect → allow/redact/block → audit | Shared rules + policy; user-visible actions documented |
| No raw secrets in audit | `matchedValueHash` only; sample events in evidence |
| Hash-chained audit (browser / Windows) | Background + Windows `AuditLogger` |
| Irreversible SHA-256 hashes (not raw values) | Canonical path; **unsalted** in v2.4.0 (worded accurately) |
| Honest “not a guarantee” | Website security page + whitepaper |
| No SOC 2 / ISO / GDPR certification claims | Explicit non-claims + `test:docs` |
| MIT / inspectable source | LICENSE + GitHub |

Full table: [claims-evidence-matrix.md](claims-evidence-matrix.md).

### Remaining claim / trust residual (not P0 packaging gaps)

| Item | Status | Severity for pilot |
|------|--------|-------------------|
| Canonical hashes are **unsalted** SHA-256 | Documented accurately; not HMAC | Low if briefed; High if mis-sold as salted |
| Warn / require_approval | Schema only; marketing says reserved | Low if docs followed |
| “30+ secret formats” | 40 rules in [rule-catalog.md](pilot/evidence/rule-catalog.md) | Low |
| Unpacked browser extension | Documented risk acceptance | **High** for locked-down orgs |
| MIT only (no commercial DPA/MSA) | Process gap | Medium commercial |

### Evidence pack (delivered)

| Evidence | Location |
|----------|----------|
| Claims ↔ evidence | [claims-evidence-matrix.md](claims-evidence-matrix.md) |
| Rule catalog | [pilot/evidence/rule-catalog.md](pilot/evidence/rule-catalog.md) |
| Sample audit events (synthetic) | [pilot/evidence/sample-audit-events.json](pilot/evidence/sample-audit-events.json) |
| Verification summary | [pilot/evidence/verification-report.md](pilot/evidence/verification-report.md) |
| Permissions matrix | [pilot/evidence/permissions-matrix.md](pilot/evidence/permissions-matrix.md) |
| Security whitepaper | [pilot/05-security-whitepaper.md](pilot/05-security-whitepaper.md) |
| Data handling | [pilot/06-data-handling-statement.md](pilot/06-data-handling-statement.md) |

Still optional for stronger reviews: recorded demo video, signed pilot SOW, dedicated security@ mailbox SLA.

---

## 2. Enterprise deployment

### Installation workflow (today)

| Surface | How installed | Pilot-ready? | Enterprise-ready? |
|---------|---------------|--------------|-------------------|
| Browser | Download ZIP → Load unpacked | **Yes** (documented) | **Weak** — no Web Store / force-install package |
| Windows | Portable self-contained ZIP | **Yes** (beta, documented) | **Partial** — no MSI/Intune |
| MCP | Tar + Node + client config | **Yes** (optional) | Dev-style |
| CLI | Tar + Node | **Yes** (optional) | Dev-style |

Guides: [pilot/02-installation-guide.md](pilot/02-installation-guide.md), [installation.md](installation.md).

### Updates

- Manual replace from GitHub Releases; browser settings export supported.
- No auto-update, staged rollout, or tenant version pin.

### Permissions

Documented in [permissions-matrix.md](pilot/evidence/permissions-matrix.md).

| Surface | Reality |
|---------|---------|
| Browser | Tight host list + storage + contextMenus |
| Windows | Clipboard + tray; AppData config/audit |
| CLI/MCP | Only text the user/process supplies |

### Logging

| What exists | Gap for enterprise scale |
|-------------|--------------------------|
| Local audit + CSV export (browser) | No SIEM forwarder / central collector |
| Retention configurable (browser) | Not org-enforced; user can reset |
| Windows/MCP local files | Customer must manage exports |

### Admin controls (device-local)

**Present:** detection toggles, site list, per-context allow/redact/block, redaction format, pause, local killswitch, config import/export — see [admin guide](pilot/03-admin-guide.md).

**Still missing for true enterprise admin:**

- Org-wide policy push  
- RBAC (admin vs end user)  
- Signed/tamper-evident policy bundles  
- Centrally enforced killswitch  
- Mandatory settings users cannot disable  

---

## 3. MSP readiness

| Need | Status |
|------|--------|
| Multi-client tenancy | **None** |
| Per-client policy packs | Manual config import / file copy |
| Agent inventory / last-seen | **None** |
| Remote disable / killswitch | Local only |
| Multi-tenant audit review | Logs stay on endpoints |
| Billing / seats | **None** |
| Support workflow | mailto / pilot channel (process) |
| L1 runbooks | Pilot install + admin/user guides; not full MSP playbook |
| White-label | **None** |

**MSP conclusion unchanged:** MaskIt is a **tool MSPs can install per client**, not an MSP management platform. Do not sell fleet management.

---

## 4. Documentation

| Artifact | Status | Location |
|----------|--------|----------|
| Pilot overview | **Done** | [pilot/01-pilot-overview.md](pilot/01-pilot-overview.md) |
| Installation (download-first) | **Done** | [pilot/02-installation-guide.md](pilot/02-installation-guide.md) |
| Admin guide | **Done** | [pilot/03-admin-guide.md](pilot/03-admin-guide.md) |
| User guide | **Done** | [pilot/04-user-guide.md](pilot/04-user-guide.md) |
| Security whitepaper | **Done** | [pilot/05-security-whitepaper.md](pilot/05-security-whitepaper.md) |
| Data handling statement | **Done** | [pilot/06-data-handling-statement.md](pilot/06-data-handling-statement.md) |
| Pilot scope | **Done** | [pilot/pilot-scope.md](pilot/pilot-scope.md) |
| Claims matrix | **Done** | [claims-evidence-matrix.md](claims-evidence-matrix.md) |
| Evidence package | **Done** | [pilot/evidence/](pilot/evidence/) |
| Onboarding (download-first) | **Done** | [onboarding.md](onboarding.md) |
| FAQ (Windows package, non-claims) | **Done** | [faq.md](faq.md) |
| Contributor / clone / dotnet | **Moved** | [development/README.md](development/README.md) |
| Doc claim gate | **Done** | `npm run test:docs` |

**Residual doc debt (P1/P2):** screenshots in install guide, PDF export of whitepaper, known FP/FN appendix beyond rule catalog, formal MSP playbook.

---

## 5. Commercial readiness

| Area | Status |
|------|--------|
| Pricing | **None** published (intentional until design partners complete) |
| Packaging (seat/device) | **Undefined** commercially |
| Pilot terms | **Documented as recommendation** in [pilot-scope.md](pilot/pilot-scope.md) (30 days, metrics) |
| Demo environment | **None** hosted — use synthetic secrets + install guide / screenshare |
| Sales collateral | Website + pilot docs package |
| Legal | MIT + privacy page; **no** enterprise MSA/DPA template yet |
| Success metrics | **Defined as suggestions** in pilot-scope (agree in SOW) |

**Recommended pilot packaging (now documented):**

- 30-day design partner  
- Browser required; CLI/MCP optional; Windows optional beta  
- Success: install rate, synthetic secret checks, audit export review, FP tracking  
- Support: weekly check-in; not 24/7 SOC  

---

## Blockers before first pilot

### P0 — packaging (status after pilot work)

| # | Blocker | Status |
|---|---------|--------|
| 1 | Align security copy (salted hashes, warn/approval, scoped AI) | **Done** (website + docs + `test:docs`) |
| 2 | Single download-first install path | **Done** (`docs/pilot/02`, onboarding, FAQ, windows-agent) |
| 3 | Browser enterprise install story | **Documented** risk acceptance / policy exception — **not** store package |
| 4 | Pilot scope document | **Done** (`docs/pilot/pilot-scope.md`) |
| 5 | Evidence pack | **Done** (`docs/pilot/evidence/`) |

**Remaining P0 for a *locked-down* enterprise:** written customer risk acceptance if unpacked extensions are forbidden (process, not missing docs).

### P1 — first 2 weeks of pilot

| # | Item | Status |
|---|------|--------|
| 6 | Admin + user guides | **Done** |
| 7 | Baseline policy recommendations | **Done** (admin guide table; not a JSON export file) |
| 8 | Update/uninstall runbook | **Done** (installation guide) |
| 9 | Known FPs/FNs deep appendix | **Partial** (rule catalog; expand with field notes) |
| 10 | Support mailbox process / SLA | **Open** (process) |
| 11 | Windows beta labeling | **Done** in pilot docs / FAQ / windows-agent |

### P2 — scale / MSP (unchanged)

| # | Item |
|---|------|
| 12 | Store-signed or enterprise force-install browser package |
| 13 | MSI/MSIX + Intune |
| 14 | Auto-update |
| 15 | Central policy / inventory |
| 16 | SIEM export |
| 17 | Commercial license + pricing + DPA |
| 18 | Hosted demo tenant / recorded demo |

---

## Recommended next actions (post package)

1. **Agree pilot SOW** using [pilot-scope.md](pilot/pilot-scope.md) metrics.  
2. **Brief customer** on residual risk: unpacked extension, unsalted hashes, Windows clipboard beta, no fleet.  
3. **Optional:** export a baseline policy JSON from a golden machine for multi-seat import.  
4. **Optional:** record a 10-minute demo with synthetic secrets.  
5. **Do not** open MSP multi-tenant selling until inventory/management exists.  
6. Keep running `npm run test:docs` in CI if not already wired (script exists; add to CI job when convenient).

---

## Evidence / verification commands

```bash
npm test
npm run test:docs
npm run test:canonical-events
npm run test:cross-adapter-parity
npm run build
npm run test:release-artifacts
npm run test:clean-install
npm run test:e2e:chromium
# Windows:
npm run test:windows-package   # MASKIT_REQUIRE_WINDOWS_ARTIFACT=1 when required
```

See [verification-report.md](pilot/evidence/verification-report.md).

---

## Priority order (updated)

| Priority | Item | State |
|----------|------|--------|
| 1 | Claim accuracy pass | **Done** |
| 2 | Pilot scope + residual risk | **Done** (docs) |
| 3 | Download-first install guide | **Done** |
| 4 | Evidence pack | **Done** |
| 5 | Admin + user guides | **Done** |
| 6 | Baseline policy export file | Optional P1 |
| 7 | Support process / SLA | Open process |
| 8 | Browser distribution (store/enterprise) | P2 product |
| 9 | Windows MSI / signing | P2 product |
| 10 | Commercial terms / pricing | After 1–2 design partners |
| 11 | MSP multi-client tooling | After single-tenant success |

---

## Pilot recommendation (unchanged intent, package ready)

**Start first pilot as:**

- **Audience:** security-conscious engineering org (10–50 AI power users)  
- **Surfaces:** browser on listed hosts (primary); MCP/CLI optional; Windows **optional beta**  
- **Promise:** reduce *accidental* secret/PII pastes into **supported** AI web apps + local audit evidence  
- **Do not promise:** full DLP, all AI apps, fleet admin, compliance certification, zero false negatives  

**Materials to send:** [docs/pilot/README.md](pilot/README.md) + GitHub Release assets + `SHA256SUMS.txt`.

**Gate to enterprise GA (later):** store/enterprise browser distribution, signed Windows installer, auto-update, central or signed policy, SIEM export, commercial support tier.

---

## What is strong for a first design partner

- Local-first story that matches code  
- Shared rules + adapter parity  
- Canonical audit without raw secrets  
- Honest non-goals and claim gate (`test:docs`)  
- Complete download-first pilot documentation package  
- Multiple surfaces with one detection vocabulary  
- MIT + public source for technical buyers  

---

## Related documents

| Doc | Role |
|-----|------|
| [pilot/README.md](pilot/README.md) | Pilot package index |
| [claims-evidence-matrix.md](claims-evidence-matrix.md) | Claim accuracy |
| [pilot/pilot-scope.md](pilot/pilot-scope.md) | Mutual scope |
| [session-changes-2026-07-28.md](session-changes-2026-07-28.md) | Engineering change log |
| [development/README.md](development/README.md) | Contributor builds only |
| Website | `website/security.html`, `website/index.html` |
