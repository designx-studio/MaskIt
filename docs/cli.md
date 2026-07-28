# CLI

Local scan and redact for scripts and CI. **Customers:** download `maskit-cli.tar.gz` from [GitHub Releases](https://github.com/designx-studio/MaskIt/releases/latest).

```bash
# From the extracted package root (contains cli.js):
node cli.js scan "email pilot-test@example.com"
node cli.js scan-file ./notes.txt
node cli.js redact "email hello@example.com"
node cli.js risk "customer@example.com"
node cli.js scan "email pilot-test@example.com" --json
```

Use `--json` for structured output including canonical audit events (hashes only). `scan-file` supports `--exit-on-risk`. Exit code `1` when findings exist is expected.

Contributor monorepo usage: `node mcp-server/cli.js …` from a source checkout — see [development/](development/).
