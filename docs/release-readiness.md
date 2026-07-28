# Maskit release readiness

Updated: July 28, 2026

## Current release surface

- Website: [Maskit V3](../website/index.html)
- Downloads: [download page](../website/download/index.html)
- Documentation: [docs index](index.html)
- Privacy: [privacy policy](../website/privacy-policy.html)
- Security: [security page](../website/security.html)
- Repository: [GitHub](https://github.com/designx-studio/MaskIt)
- Releases: [GitHub Releases](https://github.com/designx-studio/MaskIt/releases)

## Artifact paths

The release workflow builds and publishes:

- `dist/maskit-chrome.zip`
- `dist/maskit-firefox.zip`
- `dist/maskit-edge.zip`
- `dist/maskit-opera.zip`
- `dist/maskit-mcp.tar.gz`
- `dist/maskit-windows-agent-source.tar.gz`

The Windows artifact is a source and build-metadata package, not a signed installer.

## Verification commands

```bash
npm ci
npm test
npm run test:regex
npm run build
node mcp-server/test.js
node mcp-server/integration-test.js
node scripts/validate-manifests.js
```

Windows verification:

```powershell
dotnet restore maskit-agent/Maskit.Agent/Maskit.Agent.csproj
dotnet build maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release --no-restore
dotnet run --project maskit-agent/Maskit.Agent/Maskit.Agent.csproj --configuration Release --no-build -- --parity
```

## CI review

The `main` branch CI workflow covers Node 18, 20, and 22, regex safety, dependency audits, application tests, MCP tests, manifest validation, packaging, and Windows .NET 8 parity. The available repository connection exposes workflow definitions and commits, but not live GitHub Actions run logs. Triggered runs should be checked in the GitHub Actions tab after the latest push.

## Security gates

- Do not commit API tokens, local config, audit logs, or hash salts.
- Keep browser host permissions limited to the supported AI host patterns.
- Treat custom regexes as untrusted input and retain runtime safety limits.
- Review generated release artifacts before publishing.
- Label the Windows package as beta until a signed installer exists.

## Release decision

**Conditionally ready.** The repository contains the V3 website, docs, packaging fixes, and release workflow. Final public release requires a green GitHub Actions run and a manual browser-extension load test. The Windows artifact is not an installer and should be described as a source/build package.