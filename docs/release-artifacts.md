# Release artifacts

Maskit publishes versioned packages through GitHub Releases. The website uses the `releases/latest/download` URLs so download links follow the newest release automatically.

## Published assets

- `maskit-chrome.zip`, `maskit-edge.zip`, `maskit-firefox.zip`, and `maskit-opera.zip`: browser extension packages.
- `maskit-windows-agent.zip`: portable Windows agent package containing the agent project and release build metadata.
- `maskit-mcp.tar.gz`: MCP server package with its runtime files and dependencies.
- `maskit-cli.tar.gz`: CLI package with the CLI entry point, shared engine, and configuration.

## Release process

1. Update the version in the relevant package manifests.
2. Run `npm ci`, `npm test`, `npm run test:regex`, and `npm run build`.
3. Push a semantic-version tag such as `v2.5.0`.
4. GitHub Actions runs tests, builds the extension and agent, packages the CLI and MCP server, verifies every asset, and creates the GitHub Release.

## Installing from a release

Use the download page for the latest links. Do not clone the repository or compile source code for normal installation. Component-specific configuration and uninstall instructions are in the linked guides.