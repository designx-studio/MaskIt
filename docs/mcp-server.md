# MCP Server

The Node.js MCP server runs **locally** (stdio). Supports Node.js 18+.

Tools: `scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`, and `get_audit_log`.

## Customers (download-first)

1. Download `maskit-mcp.tar.gz` from [GitHub Releases](https://github.com/designx-studio/MaskIt/releases/latest).  
2. Extract the archive.  
3. Configure Claude Desktop, Cursor, or another MCP client to launch the packaged server entry with an **absolute path**.  
4. Restart the client and call `get_status` / `scan_text`.  

See [pilot installation](pilot/02-installation-guide.md).

## Contributors (source)

```bash
cd mcp-server
npm ci
node server.js
```

Configure clients with `node /absolute/path/to/MaskIt/mcp-server/server.js`. More detail: [development/](development/).
