# Release Artifacts

Each tagged release is built by GitHub Actions. The workflow runs tests, regex safety checks, browser packaging, MCP and CLI packaging, Windows agent build/publish, artifact verification, SHA-256 checksum generation, and GitHub Release creation.

Expected assets:

- Chrome, Edge, Firefox, Opera, and generic extension ZIPs
- Windows agent ZIP
- MCP tarball
- CLI tarball
- `SHA256SUMS.txt`

Normal users install release artifacts. Contributors use the source setup in the root README.