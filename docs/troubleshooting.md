# Troubleshooting

## Browser extension does not load
Extract the browser ZIP before choosing Load unpacked. Select the extracted directory containing `manifest.json`. Check that the browser supports Manifest V3.

## The extension does not scan a page
Confirm the hostname matches one of the six manifest patterns, protection is enabled, the site is not blocked, and the relevant scan toggle is on.

## MCP server does not start
Use Node.js 18 or newer, run `npm ci` inside `mcp-server`, and configure the client with an absolute path to `mcp-server/server.js`.

## CLI reports a module error
Run `npm ci` from the repository root and use `node mcp-server/cli.js ...` from the repository root.

## Windows agent does not build
Use Windows with the .NET 8 SDK, restore the project, and build `maskit-agent/Maskit.Agent/Maskit.Agent.csproj` in Release mode.

## CI packaging fails
Check that `zip` and `tar` are available on the runner, all icon files exist, and the build is running from the repository root. The build script intentionally omits obsolete `ai-intercept.js`.