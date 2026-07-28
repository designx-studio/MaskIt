# Engineering Stabilization Status

The stabilization plan is the scope gate for this release line.

## Completed in production completion pass

- Shared rule runtime: Node/MCP/CLI load `maskit-core/rules` via `engine/rule-loader.js`; browser consumes generated `browser-rules.js` from the same sources; Windows agent loads the same JSON files.
- Canonical context events only: `engine/context.js` / browser `context-event.js` are the sole event builders. Raw values are never stored.
- Incomplete unmask UI, code paths, and public claims removed. v1 behaviour is Detect → Warn/Block/Mask → Audit.
- Packaged Chromium E2E (`npm run test:e2e:chromium`) loads the built extension, exercises detection/masking/audit/popup, and writes failure logs under `dist/e2e-failures/`.
- Release packaging produces browser ZIPs, CLI/MCP tarballs, `SHA256SUMS.txt`, and `RELEASE-METADATA.json`.

## Residual environment notes

- Artifact signing still requires a configured signing identity; checksums are not signatures.
- Windows agent package build requires the .NET 8 SDK on the build host.
