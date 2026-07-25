# Contributing to Maskit

## Development Setup

1. Clone the repository
2. Load as unpacked extension in Chrome (`chrome://extensions` → Load unpacked)
3. Run `npm install`
4. Run `npm test`

## Project Structure

```
maskit-extension/
├── engine/          # Shared detection engine (Node.js)
├── mcp-server/      # MCP server for Claude Desktop
├── content.js       # Browser content script
├── background.js    # Service worker
├── popup.*          # Toolbar popup
├── options.*        # Settings page
└── test.js          # Browser extension tests
```

## Code Style

- No `eval()` or `Function()` constructor
- Use `const`/`let`, not `var`
- Strict equality (`===`)
- Content scripts must fail silently — never break host pages
- All detection patterns go in `engine/detector.js`

## Testing

```bash
npm test              # All suites (102+ tests)
node engine/test.js   # Engine only
node test.js          # Extension only
node mcp-server/test.js  # MCP server only
```

## Adding Detection Rules

1. Add pattern to `engine/detector.js` in `patterns` or `API_KEY_PATTERNS`
2. Add severity to `engine/settings.js` in `SEVERITY_DEFAULTS`
3. Add false-positive guard in `engine/detector.js` `validateFinding()`
4. Add tests in `engine/test.js`
5. Run `npm test`

## Pull Requests

1. Create a feature branch
2. Add tests for new functionality
3. Ensure all tests pass (`npm test`)
4. Update documentation if needed
5. Submit PR with clear description