# v3.0.0 release-readiness checklist

Run this checklist before pushing the tag. The release monitor can be started with `npm run release:monitor -- v3.0.0`.

## Repository and tests

- [ ] `npm ci` completes without errors.
- [ ] `npm test` passes.
- [ ] `npm run test:regex` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run audit:website` passes.
- [ ] `npm run build` creates browser and MCP artifacts.
- [ ] Windows agent builds and parity checks pass on Windows CI.

## Distribution

- [ ] Chrome, Edge, Firefox, and Opera ZIPs are present.
- [ ] MCP package is present and contains runtime files.
- [ ] CLI package is present and contains the CLI entry point and engine.
- [ ] Windows ZIP contains the published self-contained executable.
- [ ] Release workflow filenames exactly match the generated files.
- [ ] Release notes explain installation, limitations, and known beta components.

## Website and documentation

- [ ] Homepage loads with no missing local assets.
- [ ] Download page links only to `releases/latest/download` assets.
- [ ] Every local `href` and `src` resolves.
- [ ] Browser, MCP, CLI, Windows, privacy, security, architecture, FAQ, troubleshooting, and roadmap docs exist.
- [ ] Website copy does not claim an MSI, hosted dashboard, or unsupported capability.
- [ ] Website audit passes in CI.

## Release command

```bash
npm ci
npm test
npm run test:regex
npm run lint
npm run audit:website
npm run build
git add .
git commit -m "release: prepare v3.0.0"
git tag v3.0.0
git push origin main --follow-tags
npm run release:monitor -- v3.0.0
```

## Monitoring success criteria

The monitor exits zero only when the GitHub Release is published and all expected assets exist: Chrome, Edge, Firefox, Opera, Windows agent, MCP server, and CLI packages. It prints each browser download URL for a final manual smoke test.