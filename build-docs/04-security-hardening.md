# Document 04: Security Hardening

## Feature Overview

Add Content Security Policy to the extension manifest, error boundaries to the content script, and input validation to the HTTP server. These are security best practices required for Chrome Web Store review and production safety.

## Current State

- No CSP declared in manifest.json
- Content script has no top-level error boundary
- HTTP server (v2) has no rate limiting or input size validation
- SECURITY.md documents the trust model but code lacks some hardening

## Missing Components

1. Content Security Policy in manifest.json
2. Error boundary wrapper in content.js
3. Rate limiting in http-server.js
4. Input size validation in http-server.js

## Files to Modify

### `manifest.json`

Add CSP directive:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

Note: `'unsafe-inline'` is required because content.js creates inline styles for the traffic light widget and toast notifications. This is acceptable because the extension controls all style content and no user-supplied strings are injected as styles.

### `content.js`

Wrap the entire file in a try/catch at the top level to prevent uncaught errors from breaking the page:

```javascript
// Top of content.js — add error boundary
try {
  // ... existing code ...
} catch (err) {
  // Fail silently — never break the host page
  console.error("Maskit content script error:", err.message);
}
```

Also wrap individual event handlers with defensive checks:
- `handlePaste` — already has null checks ✅
- `handleCopy` — already has null checks ✅
- `handleBeforeInput` — already has null checks ✅
- `showReviewDialog` — should wrap DOM operations in try/catch

### `mcp-server/http-server.js`

Add rate limiting and input size validation:

```javascript
const MAX_BODY_SIZE = 100000; // 100KB max request body

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error("Request body too large"));
                return;
            }
            body += chunk;
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error("Invalid JSON: " + err.message));
            }
        });
        req.on("error", reject);
    });
}
```

Add rate limiting middleware:
```javascript
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

function checkRateLimit(ip) {
    const now = Date.now();
    const record = requestCounts.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + RATE_LIMIT_WINDOW;
    }
    record.count++;
    requestCounts.set(ip, record);
    return record.count <= RATE_LIMIT_MAX;
}
```

## Security Requirements

- CSP prevents injection of external scripts
- Error boundary prevents host page breakage
- Rate limiting prevents abuse of local HTTP server
- Input size limit prevents memory exhaustion

## Acceptance Criteria

- [ ] manifest.json includes CSP directive
- [ ] Content script wraps in error boundary
- [ ] HTTP server rejects requests over 100KB
- [ ] HTTP server enforces rate limit (100 req/min)

## Dependencies

None (can be done independently).

## Estimated Complexity

Medium

## Production Readiness Checklist

- [ ] CSP added to manifest
- [ ] Content script fails silently
- [ ] HTTP server has rate limiting
- [ ] HTTP server validates input size