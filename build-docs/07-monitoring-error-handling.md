# Document 07: Monitoring & Error Handling

## Feature Overview

Add structured error logging, health check endpoint for the HTTP server, and graceful error recovery in the content script to prevent silent failures.

## Current State

- Content script uses `console.error` for some errors
- No structured error logging
- No health check endpoint in HTTP server
- Background script swallows errors silently (intentional for extension safety)
- No error recovery mechanism

## Missing Components

1. Health check endpoint in HTTP server
2. Structured error logging utility
3. Content script error reporting to background
4. Error count tracking in stats

## Files to Modify

### `mcp-server/http-server.js`

Add health check endpoint:

```javascript
// GET /health — health check
if (req.method === "GET" && parsedUrl.pathname === "/health") {
    sendJson(res, {
        status: "ok",
        version: engine.getStatus().version,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }, 200);
    return;
}
```

Add CORS headers for local development:
```javascript
function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
```

### `content.js`

Add error counting to stats:

```javascript
function recordError(errorType) {
    try {
        chrome.runtime.sendMessage({
            type: "RECORD_ERROR",
            errorType
        });
    } catch {
        // background unavailable
    }
}
```

Wrap critical operations:
```javascript
function handlePaste(event) {
    try {
        // ... existing logic ...
    } catch (err) {
        recordError("paste_handler");
    }
}
```

### `background.js`

Add error tracking:

```javascript
let errorCounts = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "RECORD_ERROR") {
        errorCounts[message.errorType] = (errorCounts[message.errorType] || 0) + 1;
        return;
    }
    // ... existing handlers ...
});
```

## Acceptance Criteria

- [ ] HTTP server responds to GET /health
- [ ] Content script errors are counted
- [ ] Background tracks error counts
- [ ] No unhandled exceptions in content script

## Dependencies

Doc 01 (Build Pipeline — for CI to catch regressions)

## Estimated Complexity

Medium

## Production Readiness Checklist

- [ ] Health check endpoint works
- [ ] Errors are logged, not swallowed
- [ ] Error counts available in stats