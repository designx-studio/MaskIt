# Troubleshooting

## Browser extension does not load
Extract the browser ZIP before choosing Load unpacked. Select the extracted directory containing `manifest.json`. Check that the browser supports Manifest V3.

## The extension does not scan a page
Confirm the hostname matches one of the six manifest patterns, protection is enabled, the site is not blocked, and the relevant scan toggle is on.

## MCP server does not start
Use Node.js 18 or newer, run `npm ci` inside `mcp-server`, and configure the client with an absolute path to `mcp-server/server.js`.

## CLI reports a module error
Run `npm ci` from the repository root and use `node mcp-server/cli.js ...` from the repository root.

## Windows agent does not start (customers)
Download `maskit-windows-agent.zip` from GitHub Releases, extract it, and run `publish\Maskit.Agent.exe`. Verify with `--self-test`. The agent only sees **clipboard** text.

## Windows agent does not build (contributors)
Use Windows with the .NET 8 SDK. See [development/README.md](development/README.md) or `npm run build:windows`.

## CI packaging fails
Check that packaging tools are available on the runner, all icon files exist, and the build is running from the repository root.

## Pilot documentation
Customer install and scope: [pilot/](pilot/).