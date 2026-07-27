# Security Model

## Local processing

Detection and redaction occur in the browser, MCP process, or Windows agent. The browser manifest declares storage, context menus, and explicit AI host permissions. No analytics or telemetry path is present in the reviewed runtime.

## Sensitive data lifecycle

Text enters through a paste, copy, typing, MCP argument, or Windows clipboard event. The adapter scans it locally. Actionable values are replaced before insertion, before MCP output, or before the Windows clipboard is rewritten. JavaScript audit events use hashed sensitive values through the engine settings helpers; Windows audit records omit raw matched values and add chain hashes.

## Permissions

Browser permissions are `storage` and `contextMenus`. Host permissions are ChatGPT, Claude, Gemini, Copilot, and Cursor patterns from `manifest.json`. Windows uses Win32 user32/kernel32 clipboard APIs and local filesystem access for configuration and logs.

## Custom rules

JavaScript custom rules are length-limited and checked against unsafe regex patterns. They are capped by `REGEX_LIMITS.maxCustomRules`. Windows rules are loaded from JSON artifacts and compiled as .NET regexes. Cross-runtime safety equivalence must be maintained when rule artifacts are changed.

## Threat model

MaskIt reduces accidental leakage through supported surfaces. It does not guarantee detection of every secret, cannot protect unsupported browser hosts, cannot inspect content that never reaches the Windows clipboard, and cannot control a remote AI service after sanitized text leaves the device.

## Security limitations

- Browser and Windows implementations are separate runtime adapters.
- The MCP HTTP server requires authenticated deployment configuration and should not be exposed publicly without network controls.
- Browser audit storage is local extension storage, while MCP and Windows use local files.
- The user can disable protection or pause scanning, so the UI must make inactive states visible.
