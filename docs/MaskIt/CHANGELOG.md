# Technical Changelog

## Current convergence phase

- Added a shared JavaScript engine API for detection, validators, risk scoring, policy decisions, redaction, and audit event creation.
- Added `maskit-core` JSON rule, policy, and audit schema artifacts for cross-runtime consumption.
- Wired MCP tools to the engine and standardized response fields and local audit persistence.
- Added Windows `MaskitCoreService` and routed clipboard decisions through it.
- Added Windows retry handling for clipboard opening and explicit failure handling for clipboard replacement.
- Added shared parity fixtures covering secrets, tokens, PII, cards, multiple findings, large input, custom rules, actions, risk, and audit metadata.
- Added Windows parity execution through `--parity`.
- Narrowed browser host permissions to ChatGPT, Claude, Gemini, Copilot, and Cursor.
- Removed the obsolete all-site interception script from the extension package.

## Current limitations

- The browser content-script runtime still ships browser-compatible detector and sanitizer adapters because it cannot directly import the Node CommonJS engine.
- Windows parity must be executed on Windows with the .NET 8 SDK.
- Repository historical documentation may require separate review when it describes prior product scope; this package documents implementation observed in the current branch.
