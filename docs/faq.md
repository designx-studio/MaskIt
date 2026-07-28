# FAQ

## Does Maskit send prompts to a cloud service?
No. Browser detection runs in the extension, MCP and CLI run in local Node.js, and the Windows agent runs locally.

## Which browser sites are supported?
ChatGPT, chat.openai.com, Claude, Gemini, Copilot, and Cursor host patterns listed in the manifest.

## What happens to a detected value?
The active policy chooses allow, redact, or block. Browser audit records store metadata and hashed tokens, not raw matched values.

## Can I use Maskit with Claude Desktop or Cursor?
Yes. Configure either client to launch the local MCP server and use its seven tools.

## Is the Windows agent a signed installer?
No. The current release workflow publishes a source and build-metadata package. Build it on Windows with .NET 8.

## How do I update Maskit?
For the extension, download the latest browser ZIP from GitHub Releases and load the updated extracted folder. For MCP and CLI, replace the package and reinstall dependencies. For the Windows agent, download the latest package and rebuild or replace the local build.

## How do I uninstall?
Remove the unpacked extension from browser extensions, stop and delete the MCP configuration entry, remove the CLI package, or stop and uninstall the Windows agent build. Local config and audit files can be removed from the paths documented by each adapter.

## Why is a download link unavailable?
Release assets are created by GitHub Actions when a version tag is pushed. If no release exists, use the local build instructions until the first tag is published.