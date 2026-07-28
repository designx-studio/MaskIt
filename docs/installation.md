# Installation

Use the [Download page](../website/download/index.html) or the latest GitHub Release assets. Normal users do not need to clone this repository.

## Browser extension

Download the package for Chrome, Edge, Firefox, or Opera. Open the browser's extensions manager, enable developer mode when required, choose **Load unpacked** or the browser's local extension installer, and select the extracted package directory. Open the Maskit settings page and confirm protection is enabled.

## Windows agent

Download `maskit-windows-agent.zip`, extract it, and follow [the Windows agent guide](windows-agent.md). The current distribution is portable; it is not an MSI installer.

## MCP server

Download `maskit-mcp.tar.gz`, extract it, run `npm ci` inside the extracted package, then configure your MCP client using the example in [the MCP guide](mcp-server.md).

## CLI

Download `maskit-cli.tar.gz`, extract it, run `npm ci` in the extracted directory, then use the commands in [the CLI guide](cli.md).

## Updating

Replace the installed package with the newest asset from the latest release. Export browser settings first if you need to preserve a custom configuration.

## Uninstall

Remove the browser extension from the browser's extensions manager. Delete the extracted MCP or CLI directory. Stop and remove the Windows agent process or scheduled entry if you created one. Local settings and logs are stored by the component and can be removed through its normal reset or uninstall flow.