# Maskit release process

## Versioning policy

Maskit uses Semantic Versioning: `MAJOR.MINOR.PATCH`. A major release may change behavior or configuration contracts, a minor release adds backward-compatible functionality, and a patch release fixes defects without changing the public contract.

## Release checklist

- Update the root and MCP package versions when applicable.
- Run `npm ci`.
- Run `npm test`.
- Run `npm run test:regex`.
- Run `npm run build` and verify all browser and MCP artifacts exist.
- Build the Windows agent with .NET 8.
- Check website links and documentation references.
- Commit to `main`.
- Create and push a `vMAJOR.MINOR.PATCH` tag.

## Release workflow

The workflow in `.github/workflows/release.yml` runs on every pushed `v*` tag. It installs Node 20 and .NET 8, runs tests, builds browser extensions, publishes a self-contained Windows `win-x64` agent, packages the MCP server and CLI, verifies each file, and creates a GitHub Release with generated notes.

## Expected artifacts

- `maskit-chrome.zip`
- `maskit-edge.zip`
- `maskit-firefox.zip`
- `maskit-opera.zip`
- `maskit-extension.zip`
- `maskit-windows-agent.zip`
- `maskit-mcp.tar.gz`
- `maskit-cli.tar.gz`

The website uses `https://github.com/designx-studio/MaskIt/releases/latest/download/<asset>` URLs for all downloads.

## Troubleshooting

If a release job fails, open the failed step in Actions. Packaging failures usually mean `npm run build` did not create a required extension or MCP artifact, the .NET SDK could not publish `win-x64`, or a filename in the verification loop differs from the build output. Fix the source on `main`, push the commit, then push a new patch tag. Do not upload source archives as substitutes for runnable release artifacts.