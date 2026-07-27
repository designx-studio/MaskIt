# AI Store Preparation

## Scope verification

- Confirm Manifest V3.
- Confirm host permissions are limited to ChatGPT, Claude, Gemini, Copilot, and Cursor web surfaces.
- Confirm no `<all_urls>` permission.
- Confirm no tabs, webRequest, cookies, or remote-code permissions.
- Confirm content scanning is local and no raw page content is transmitted.

## Functional verification

- Test paste, copy, typing, selection scanning, review mode, pause/resume, and custom rules on each supported AI host.
- Test rich contenteditable editors and iframe protection where supported.
- Verify the popup and options page expose only AI-host scope.

## Release checks

- Run `npm ci`, `npm test`, `npm run lint`, regex safety validation, manifest validation, and `npm run build`.
- Verify Chrome, Firefox, Edge, Opera, legacy, and MCP artifacts exist.
- Confirm version consistency between package.json, manifest.json, MCP package, and release tag.
