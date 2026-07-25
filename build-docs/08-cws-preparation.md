# Document 08: Chrome Web Store Preparation

## Feature Overview

Prepare all assets and documentation required for Chrome Web Store submission, including store listing copy, screenshots, and submission checklist.

## Current State

- `privacy-policy.html` exists
- `manifest.json` has CWS-required fields
- `scripts/build.js` creates submission zip
- No store listing copy
- No screenshots
- No submission checklist

## Missing Components

1. Store listing description
2. Screenshot requirements documentation
3. CWS submission checklist

## Files to Create

### `CWS-LISTING.md`

```markdown
# Chrome Web Store Listing — Maskit

## Extension Name
Maskit — Privacy Shield for AI Chat & Email

## Short Description (132 chars max)
Prevent accidental data leaks. Scans and redacts sensitive data before it leaves your device in ChatGPT, Gmail, and Claude Desktop.

## Detailed Description
Maskit is a local-first privacy layer that stops sensitive text from leaving your device.

**How it works:**
When you paste, copy, or type sensitive information into ChatGPT or Gmail, Maskit detects it and redacts it before submission. Your data never leaves your device.

**What it detects:**
- Email addresses
- Phone numbers
- Credit card numbers (with Luhn validation)
- Social Security numbers (SSNs)
- API keys (OpenAI, GitHub, AWS, Google, Stripe, and 30+ more)
- Passport numbers
- Bank account numbers (IBAN)
- M-Pesa transaction codes
- Custom patterns you define

**Key features:**
- Paste, copy, and typing interception
- Review-before-redact confirmation dialog
- Traffic light status indicator (green/amber/red)
- Site allowlist and blocklist
- Temporary pause with auto-resume
- Keyboard shortcuts (Alt+Shift+M to toggle)
- Custom regex rules (up to 15)
- Three redaction formats (tagged, stars, custom)
- 100% local processing — no data sent to any server

**Privacy:**
- All processing happens locally in your browser
- No network requests for content scanning
- No sensitive data is stored or transmitted
- Only works on ChatGPT and Gmail (minimal permissions)

**Permissions:**
- storage: Save your settings and statistics
- Host access: chatgpt.com, mail.google.com (for content script injection only)

## Category
Productivity

## Language
English

## Screenshots Required
1. Popup showing protection status (1280x800)
2. Settings page with toggles (1280x800)
3. Review-before-redact dialog (1280x800)
4. Traffic light widget on ChatGPT (1280x800)

## Single Purpose Description
Maskit scans text at paste, copy, and typing time on ChatGPT and Gmail, detecting and redacting sensitive data (emails, phone numbers, API keys, credit cards, SSNs) before it leaves the user's device.
```

### `CWS-SUBMISSION-CHECKLIST.md`

```markdown
# Chrome Web Store Submission Checklist

## Pre-Submission

- [ ] All 102 tests pass (`npm test`)
- [ ] Production build created (`npm run build`)
- [ ] Manifest validated (manifest_version 3)
- [ ] No broad host permissions (only chatgpt.com, mail.google.com)
- [ ] No network permission requested
- [ ] No clipboard permission requested
- [ ] privacy-policy.html is complete and accurate
- [ ] Store listing copy is written (CWS-LISTING.md)
- [ ] Screenshots are captured (4 required, 1280x800)

## CWS Developer Dashboard

- [ ] Create new item in Chrome Web Store Developer Dashboard
- [ ] Upload zip from dist/maskit-extension.zip
- [ ] Fill in extension name, description, category
- [ ] Upload screenshots
- [ ] Set visibility (public or unlisted for testing)
- [ ] Submit for review

## Post-Submission

- [ ] Monitor review status (typically 1-3 business days)
- [ ] Respond to any review feedback
- [ ] Test published version from CWS
- [ ] Update website with CWS link

## Review Common Rejection Reasons

1. **Broad permissions** — We use narrow host permissions ✅
2. **Network requests** — We make no network requests ✅
3. **Missing privacy policy** — We have privacy-policy.html ✅
4. **Unclear single purpose** — We have a clear description ✅
5. **Obfuscated code** — We use readable source code ✅
```

## Acceptance Criteria

- [ ] CWS-LISTING.md contains complete store listing
- [ ] CWS-SUBMISSION-CHECKLIST.md is complete
- [ ] Screenshots are captured and referenced

## Dependencies

Doc 05 (Distribution — produces the zip), Doc 06 (Legal — LICENSE must exist)

## Estimated Complexity

Medium

## Production Readiness Checklist

- [ ] Store listing copy ready
- [ ] Screenshots captured
- [ ] Submission checklist complete