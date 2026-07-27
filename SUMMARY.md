# Maskit Security Hardening — Summary of Work Done

**Date:** July 26, 2026
**Version:** v2.4.0 (commit 809dd9d)
**Result:** 133 tests pass, 7 security fixes implemented, 2 documents created

---

## What Was Done

### 1. Comprehensive Codebase Review (CODEBASE_REVIEW.md)

Created a 997-line (65KB) markdown report reviewing the entire Maskit codebase. The report includes all 11 requested sections plus an AI Privacy Platform Assessment appendix:

- **Executive Summary** — Maskit is a local-first AI privacy layer with browser extension, MCP server, and Windows agent. Maturity: late alpha. Score: 6.5/10.
- **Architecture Review** — Shared-core multi-surface design. Problem: browser doesn't consume `engine/` at runtime.
- **Code Quality Review** — `content.js` is a 1,192-line God Object. Triple implementation of detection logic.
- **Security Review** — 12 issues with severity levels (1 Critical, 4 High, 5 Medium, 2 Low).
- **Product Architecture Review** — 20% SaaS-ready. Missing auth, multi-tenancy, billing, backend.
- **Scalability Review** — MCP server config I/O breaks at 1K users. No backend breaks at 100K.
- **Platform Expansion Review** — Recommends D) Hybrid architecture with Rust→WASM shared core.
- **Testing Review** — 133 tests exist but no tests for `content.js`, `background.js`, or security.
- **Dependency Review** — Zero runtime deps in browser. MCP SDK not pinned. No lockfile.
- **Recommended Roadmap** — Phase 1 (immediate fixes), Phase 2 (beta), Phase 3 (SaaS scale).
- **Final Assessment** — 6.5/10, 55% production-ready, 20% SaaS-ready.
- **AI Privacy Assessment** — Recommends hybrid architecture covering all AI surfaces.

### 2. Phase 0 Security Hardening (7 Critical Fixes)

Implemented all 7 critical security fixes identified in the review:

#### Fix #1: HTTP API Authentication (Critical)
- **File:** `mcp-server/http-server.js` (complete rewrite)
- **What:** Added Bearer token authentication, CORS restrictions (`Access-Control-Allow-Origin: null`), 1MB body size limit, 100 req/min rate limiting, security headers (`X-Content-Type-Options`, `X-Frame-Options`), path traversal prevention, input type validation.
- **File:** `mcp-server/config.js` — Added `getOrCreateApiToken()`, `getApiToken()`, `setApiToken()`.

#### Fix #2: Commit package-lock.json (Critical)
- **File:** `mcp-server/package.json` — Pinned `@modelcontextprotocol/sdk` from `^1.0.0` to exact `1.0.0`.
- **File:** `mcp-server/package-lock.json` — Generated and committed (93 packages).
- **File:** `.github/workflows/ci.yml` — Changed to `npm ci --ignore-scripts`.

#### Fix #3: Replace FNV-1a with SHA-256 (High)
- **File:** `engine/settings.js` — Replaced non-cryptographic FNV-1a hash with `crypto.createHash('sha256')`. Added per-installation random 32-byte salt generation. Added `hashSensitiveAsync()` for browser `crypto.subtle`. Updated `createAuditEvent()` to accept `saltProvider` parameter.
- **File:** `engine/test.js` — Updated test to expect 64 hex chars (SHA-256) instead of 16 (FNV-1a).

#### Fix #4: Validate Config Imports (High)
- **File:** `background.js` — Added `validateConfigImport()` function with whitelist of 24 allowed keys, type validation for `customRules` (validates regex via `validateCustomRegexPattern`), `siteList`, `siteListMode`, `redactFormat`, `killswitch`, `policies`, `severity`. Updated `IMPORT_CONFIG` handler to validate before writing, log to audit log, return errors.

#### Fix #5: Version Sync (Medium)
- **File:** `package.json` — Updated from `2.3.0` to `2.4.0`.
- **File:** `scripts/build.js` — Added version injection from `package.json` into `manifest.json` during build (single source of truth).

#### Fix #6: Replace innerHTML with textContent (Medium)
- **File:** `content.js` — Replaced 2 `innerHTML` usages in `showKillswitchModal()` and `showReviewDialog()` with `createElement` + `textContent`. Zero `innerHTML` remaining.

#### Fix #7: Body Size Limit (Medium)
- **File:** `mcp-server/http-server.js` — `parseBody()` enforces 1MB limit, destroys connection on overflow.

#### Fix #8: CI Hardening (High)
- **File:** `.github/workflows/ci.yml` — Added ESLint step (`npm run lint`), `npm audit --production` for root and MCP server, `npm ci --ignore-scripts` for MCP server.

### 3. Additional Documents

- **MASKIT_BUILD_GUIDE.md** (38KB) — Developer build guide with Phase 1-5 roadmap, acceptance criteria, and code guidance.

---

## Files Modified (11 total)

| File | Change |
|------|--------|
| `mcp-server/http-server.js` | Complete rewrite with auth/CORS/rate limiting/body size limit |
| `mcp-server/config.js` | Added API token and hash salt management |
| `mcp-server/package.json` | Pinned SDK version to 1.0.0 |
| `mcp-server/package-lock.json` | New lockfile (93 packages) |
| `engine/settings.js` | SHA-256 with per-installation salt, new exports |
| `engine/test.js` | Updated hash test for SHA-256 (64 chars) |
| `background.js` | Config import validation with schema whitelist |
| `content.js` | Replaced all innerHTML with textContent |
| `package.json` | Version synced to 2.4.0 |
| `scripts/build.js` | Version injection from package.json |
| `.github/workflows/ci.yml` | Added lint, audit, --ignore-scripts |

## Files Created (3 total)

| File | Size | Purpose |
|------|------|---------|
| `CODEBASE_REVIEW.md` | 65KB | Comprehensive codebase review (11 sections + appendix) |
| `MASKIT_BUILD_GUIDE.md` | 38KB | Developer build guide (Phase 1-5 roadmap) |
| `SUMMARY.md` | This file | Summary of all work done |

---

## Verification Results

- **Tests:** 133 passed, 0 failed (32 browser + 83 engine + 18 MCP server)
- **Build:** 3 browser zips built successfully (Chrome 4619KB, Edge 4619KB, Opera 17KB)
- **Content checks:** 23/23 pass for CODEBASE_REVIEW.md
- **innerHTML:** 0 occurrences in content.js
- **Versions:** package.json=2.4.0, manifest.json=2.4.0 (synced)
- **Lockfile:** mcp-server/package-lock.json committed with 93 packages