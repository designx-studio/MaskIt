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

## Common Rejection Reasons (How We Avoid Them)

1. **Broad permissions** — We use narrow host permissions (chatgpt.com, mail.google.com only)
2. **Network requests** — We make no network requests for content scanning
3. **Missing privacy policy** — We have privacy-policy.html
4. **Unclear single purpose** — We have a clear single-purpose description
5. **Obfuscated code** — We use readable, unminified source code