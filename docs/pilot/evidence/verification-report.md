# Verification report (pilot evidence)

**Product:** MaskIt v2.4.0  
**Purpose:** Summarize automated verification used for design partner confidence.  
**Note:** Re-run commands on the release tag used for the pilot; fill dates/results at package time.

## Commands

```bash
npm ci
npm test
npm run test:regex
npm run test:canonical-events
npm run test:adapter-events
npm run test:cross-adapter-parity
npm run test:docs
npm run build
npm run test:release-artifacts
npm run test:clean-install
npm run check:browser-artifact
npm run test:e2e:chromium
# Windows host with SDK + package:
npm run test:windows-package   # set MASKIT_REQUIRE_WINDOWS_ARTIFACT=1 when required
```

## Suite summary

| Area | Command | What it proves |
|------|---------|----------------|
| Unit + parity | `npm test` | Browser surface, defaults sync, engine, MCP, shared fixtures |
| Regex safety | `npm run test:regex` | Shared rule patterns pass safe-regex checks |
| Canonical events | `npm run test:canonical-events` | Schema fields; no raw values |
| Adapter contract | `npm run test:adapter-events` | CLI/MCP/browser/windows context sources |
| Cross-adapter parity | `npm run test:cross-adapter-parity` | Same fixtures → comparable decisions |
| Doc claim hygiene | `npm run test:docs` | Blocks salted-hash/SOC2/ISO/all-AI-app claim regressions |
| Build | `npm run build` | Browser ZIPs, CLI/MCP tarballs, Windows ZIP when SDK present |
| Artifacts | `npm run test:release-artifacts` | Non-empty packages + SHA-256 |
| Clean install | `npm run test:clean-install` | CLI/MCP run outside monorepo |
| Browser package | `npm run check:browser-artifact` | MV3 + shared rules + context-event |
| Browser E2E | `npm run test:e2e:chromium` | Packaged extension detect/mask/popup (Chromium/Edge) |
| Windows package | `npm run test:windows-package` | Extract, `--self-test`, `--scan` canonical events |

## Release artifacts (expected)

- `maskit-chrome.zip`, `maskit-edge.zip`, `maskit-firefox.zip`, `maskit-opera.zip`, `maskit-extension.zip`
- `maskit-cli.tar.gz`, `maskit-mcp.tar.gz`
- `maskit-windows-agent.zip` (when built)
- `SHA256SUMS.txt`, `RELEASE-METADATA.json`

## Sample results (engineering host, 2026-07-28)

| Check | Result |
|-------|--------|
| `npm test` | Pass |
| Canonical / adapter events | Pass |
| Cross-adapter parity | Pass |
| Browser E2E (Edge full extension load) | Pass |
| Windows package + self-test + scan | Pass |
| Release artifacts including Windows | Pass |

Re-validate on the exact commit/tag shipped to the design partner.

## Sample audit evidence

See `sample-audit-events.json` (synthetic only).  
Rule inventory: `rule-catalog.md`.
