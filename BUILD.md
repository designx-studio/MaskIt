# Maskit Build & Deployment

## Production Deployment Checklist

### 1. Browser Extension (Chrome)
- [ ] Run `npm test` to ensure all 102 tests pass.
- [ ] Run `npm run build` to generate `dist/maskit-extension.zip`.
- [ ] Verify `manifest.json` permissions are minimal (`storage`, `chatgpt.com`, `mail.google.com`).
- [ ] Manual upload to Chrome Web Store for production.

### 2. Desktop MCP Server (Claude Desktop)
- [ ] Verify Node.js version (18+) on the host machine.
- [ ] Run `npm install` in `mcp-server/` directory.
- [ ] Configure `claude_desktop_config.json` with the absolute path to `server.js`.
- [ ] Verify MCP tool availability in Claude Desktop.
- [ ] Verify audit log path is writable by the current user.

### 3. Enterprise Deployment
- [ ] Perform regex safety validation (`npm run test:regex`).
- [ ] Audit configuration files for custom rules.
- [ ] Verify audit log integrity mechanism is active.
