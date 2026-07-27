# Browser Compatibility Matrix

**Date:** July 26, 2026
**Version:** v2.4.0

---

## Feature Support Matrix

| Feature | Chrome | Edge | Opera | Firefox | Safari |
|---------|--------|------|-------|---------|--------|
| Manifest V3 | Yes | Yes | Yes | Yes (109+) | No (Phase 2) |
| Service Worker | Yes | Yes | Yes | Yes | No |
| Content Scripts | Yes | Yes | Yes | Yes | No |
| chrome.* API | Yes | Yes | Yes | Yes (alias) | No |
| browser.* API | N/A | N/A | N/A | Yes | No |
| storage.sync | Yes | Yes | Yes | Yes | No |
| storage.session | Yes | Yes | Yes | Yes | No |
| contextMenus | Yes | Yes | Yes | Yes | No |
| commands (shortcuts) | Yes | Yes | Yes | Yes | No |
| action (popup) | Yes | Yes | Yes | Yes | No |
| <all_urls> permission | Yes | Yes | Yes | Yes | No |
| all_frames: true | Yes | Yes | Yes | Yes | No |
| Shadow DOM (open) | Yes | Yes | Yes | Yes | No |
| document_start | Yes | Yes | Yes | Yes | No |

---

## API Differences

### Chrome / Edge / Opera (Chromium)
- Uses `chrome.*` namespace
- Service worker for background (`chrome.runtime`)
- `chrome.storage.sync` for settings sync
- `chrome.contextMenus` for right-click menu
- `chrome.commands` for keyboard shortcuts
- `chrome.action` for toolbar popup

### Firefox (Gecko)
- Uses `browser.*` namespace (but `chrome.*` works as alias)
- Service worker supported in MV3 (Firefox 109+)
- `browser_specific_settings.gecko.id` required for Firefox Add-on ID
- `browser_specific_settings.gecko.strict_min_version` set to 109.0
- `browser.storage.sync` syncs via Firefox Sync (requires Firefox account)
- Promises instead of callbacks (but chrome.* callback style works)

### Safari (Not Implemented)
- Requires Xcode conversion to Safari Web Extension
- Uses `browser.*` namespace
- No service worker (uses non-persistent background page)
- Different permission model
- Phase 2+ if demand exists

---

## Permission Differences

| Permission | Chrome | Edge | Opera | Firefox |
|-----------|--------|------|-------|---------|
| storage | Yes | Yes | Yes | Yes |
| contextMenus | Yes | Yes | Yes | Yes |
| <all_urls> | Yes | Yes | Yes | Yes |

**Note:** All browsers support the same permissions for this extension. No browser-specific permission differences exist.

---

## Build Differences

| Browser | Zip Name | Manifest Changes |
|---------|----------|-----------------|
| Chrome | maskit-chrome.zip | None (default manifest) |
| Edge | maskit-edge.zip | None (same as Chrome) |
| Opera | maskit-opera.zip | None (same as Chrome) |
| Firefox | maskit-firefox.zip | browser_specific_settings.gecko added |
| Legacy | maskit-extension.zip | None (default manifest) |

---

## Store Submission

| Store | URL | Review Time |
|-------|-----|-------------|
| Chrome Web Store | https://chrome.google.com/webstore/devconsole | 1-5 days |
| Microsoft Store | https://partner.microsoft.com/dashboard/microsoftedge | 1-3 days |
| Opera Add-ons | https://addons.opera.com/developers/addons | Instant-1 day |
| Mozilla AMO | https://addons.mozilla.org/developers/addon | 7-10 days |

---

## Known Issues

### Firefox
- `chrome.*` API works as alias for `browser.*` but may produce warnings in console
- `chrome.storage.session` may behave differently (clears on restart in all browsers)
- `document.execCommand(insertText)` may behave differently in contenteditable

### Edge
- Settings sync via Microsoft account (users appreciate this)
- Same Chromium engine as Chrome — no compatibility issues

### Opera
- Same Chromium engine as Chrome — no compatibility issues
- Smaller user base but easy submission process
