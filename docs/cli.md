# CLI

The CLI is local and requires Node.js 18+.

```bash
node mcp-server/cli.js scan "API key sk-abcdefghijklmnopqrstuvwxyz123456"
node mcp-server/cli.js scan-file ./notes.txt
node mcp-server/cli.js redact "email hello@example.com"
node mcp-server/cli.js risk "customer@example.com"
```

Use `--json` for structured output. `scan-file` also supports `--exit-on-risk`.