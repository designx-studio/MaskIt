# MCP Server

The Node.js MCP server runs locally and supports Node.js 18+.

Tools: `scan_text`, `redact_text`, `evaluate_policy`, `scan_response`, `get_status`, `get_rules`, and `get_audit_log`.

```bash
cd mcp-server
npm ci
node server.js
```

Configure Claude Desktop or Cursor to launch the server with their local MCP configuration and use the command `node /absolute/path/to/MaskIt/mcp-server/server.js`.