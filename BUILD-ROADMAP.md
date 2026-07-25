# Maskit — Master Build Roadmap

**Audit Date:** July 25, 2026
**Codebase Version:** 2.3.0
**Audit Scope:** Full production readiness review against PRD, FEATURES.md, BUILD.md, SECURITY.md

---

## Audit Summary

| Area | Status | Gap Count |
|------|--------|-----------|
| Shared Engine | ✅ Production Ready | 0 |
| Chrome Extension (core) | ✅ Production Ready | 0 |
| MCP Server (core) | ✅ Production Ready | 0 |
| Documentation | ✅ Complete | 0 |
| Testing | ⚠️ Needs hardening | 3 |
| Build/Release Pipeline | ❌ Missing | 4 |
| Security Hardening | ⚠️ Gaps exist | 3 |
| Monitoring/Observability | ❌ Missing | 2 |
| Distribution & Packaging | ⚠️ Gaps exist | 2 |
| Legal & Compliance | ❌ Missing | 3 |

**Total implementation packages:** 9

---

## Feature Inventory — Verification Against Documentation

### FEATURES.md Section 1: Browser Extension

| Feature | Documented | Implemented | Evidence |
|---------|-----------|-------------|----------|
| Email detection | ✅ | ✅ | engine/detector.js:40, test.js:36 |
| Phone detection (Kenyan) | ✅ | ✅ | engine/detector.js:41, test.js:41 |
| Card detection (Luhn) | ✅ | ✅ | engine/detector.js:42, engine/detector.js:118-141 |
| M-Pesa detection | ✅ | ✅ | engine/detector.js:43, test.js:51 |
| SSN detection | ✅ | ✅ | engine/detector.js:44, test.js:56 |
| IP address detection | ✅ | ✅ | engine/detector.js:45, test.js:117 |
| Passport detection | ✅ | ✅ | engine/detector.js:46, test.js:122 |
| IBAN detection | ✅ | ✅ | engine/detector.js:47, test.js:127 |
| API key detection (30+ patterns) | ✅ | ✅ | engine/detector.js:52-113 |
| Custom regex rules | ✅ | ✅ | engine/detector.js:191-200, 261-281 |
| Tagged redaction | ✅ | ✅ | engine/detector.js:296-298 |
| Stars redaction | ✅ | ✅ | engine/detector.js:291 |
| Custom redaction | ✅ | ✅ | engine/detector.js:292-294 |
| Paste interception | ✅ | ✅ | content.js:339-350 |
| Copy interception | ✅ | ✅ | content.js:352-372 |
| Typing scan (debounce) | ✅ | ✅ | content.js:398-531 |
| Rich editor support | ✅ | ✅ | editors.js |
| Global on/off | ✅ | ✅ | options.js, background.js |
| ON/PAUSED/OFF badge | ✅ | ✅ | background.js, content.js:535-541 |
| Traffic light widget | ✅ | ✅ | content.js:543-800 |
| Site allowlist/blocklist | ✅ | ✅ | engine/settings.js:90-106 |
| Per-site toggle | ✅ | ✅ | content.js:750-761 |
| Auto-resume pause | ✅ | ✅ | content.js:890-904 |
| Keyboard shortcuts | ✅ | ✅ | manifest.json:31-43, background.js |
| Pause banner with countdown | ✅ | ✅ | content.js:804-886 |
| Toolbar popup | ✅ | ✅ | popup.html, popup.js |
| Settings page | ✅ | ✅ | options.html, options.js |
| Data type toggles | ✅ | ✅ | options.js:1-20 |
| Custom rules UI | ✅ | ✅ | options.js |
| Redaction format selection | ✅ | ✅ | options.js |
| Import/export settings | ✅ | ✅ | options.js |
| Statistics tracking | ✅ | ✅ | background.js, content.js:48-58 |
| Toast notification | ✅ | ✅ | content.js:201-235 |
| Review dialog | ✅ | ✅ | content.js:239-316 |

### FEATURES.md Section 2: MCP Server

| Feature | Documented | Implemented | Evidence |
|---------|-----------|-------------|----------|
| scan_text tool | ✅ | ✅ | mcp-server/server.js |
| redact_text tool | ✅ | ✅ | mcp-server/server.js |
| evaluate_policy tool | ✅ | ✅ | mcp-server/server.js |
| get_status tool | ✅ | ✅ | mcp-server/server.js |
| get_rules tool | ✅ | ✅ | mcp-server/server.js |
| update_rules tool | ✅ | ✅ | mcp-server/server.js |
| OS-specific config | ✅ | ✅ | mcp-server/config.js |
| Per-app overrides | ✅ | ✅ | mcp-server/config.js:60-85 |
| Claude Desktop setup | ✅ | ✅ | mcp-server/README.md, claude-desktop.json |

### FEATURES.md Section 3-6: v2 Items (Deferred)

| Feature | Documented | Implemented | Notes |
|---------|-----------|-------------|-------|
| HTTP server | ✅ | ✅ (exists) | mcp-server/http-server.js — v2 per PRD |
| CLI tool | ✅ | ✅ (exists) | mcp-server/cli.js — v2 per PRD |
| GitHub Action | ✅ | ✅ (exists) | mcp-server/integrations/ — v2 per PRD |
| Express middleware | ✅ | ✅ (exists) | mcp-server/integrations/ — v2 per PRD |
| Discord bot | ✅ | ✅ (exists) | mcp-server/integrations/ — v2 per PRD |
| Slack bot | ✅ | ✅ (exists) | mcp-server/integrations/ — v2 per PRD |

**Verdict:** All v1 features are implemented. All v2 items exist as code but are correctly excluded from v1 scope per PRD Section 6.

---

## Gap Analysis — Production Readiness

### Critical (Must fix before production)

1. **No CI/CD pipeline** — No GitHub Actions workflow for automated testing, linting, or release
2. **No LICENSE file** — Cannot distribute without a license
3. **No CHANGELOG.md** — No version history for users/developers

### High (Should fix before production)

4. **No ESLint configuration** — No automated code quality enforcement
5. **jsdom not installed** — DOM test in test.js is skipped (line 222-224)
6. **No CSP in manifest** — Missing Content Security Policy declaration
7. **HTTP server has no rate limiting** — Denial of service risk (v2 but code exists)

### Medium (Nice to have)

8. **No production build/minification** — Extension works unpacked but no minified build
9. **No Chrome Web Store submission automation** — Manual CWS upload only
10. **No error boundary in content script** — Uncaught errors could break page

### Low (Future improvement)

11. **No CHANGELOG generation** — Manual changelog updates
12. **No version bump script** — Manual version updates across files

---

## Implementation Documents

| Doc | Title | Complexity | Dependencies |
|-----|-------|------------|--------------|
| 01 | Build Pipeline & CI/CD | Medium | None |
| 02 | Code Quality & Linting | Small | Doc 01 |
| 03 | Testing Hardening | Medium | Doc 02 |
| 04 | Security Hardening | Medium | None |
| 05 | Distribution & Packaging | Medium | Doc 01, 02 |
| 06 | Legal & Compliance | Small | None |
| 07 | Monitoring & Error Handling | Medium | Doc 01 |
| 08 | Chrome Web Store Preparation | Medium | Doc 05, 06 |
| 09 | Release Process & Versioning | Small | Doc 01, 05, 08 |

---

## Dependency Graph

```
Doc 06 (Legal)          Doc 04 (Security)        Doc 01 (CI/CD)
    |                       |                       |
    v                       v                       v
Doc 05 (Distribution) <--- Doc 02 (Linting) <--- Doc 03 (Testing)
    |                                                   |
    v                                                   v
Doc 08 (CWS Prep)                              Doc 07 (Monitoring)
    |
    v
Doc 09 (Release Process)
```

**Execution Order:** 06 → 04 → 01 → 02 → 03 → 05 → 07 → 08 → 09