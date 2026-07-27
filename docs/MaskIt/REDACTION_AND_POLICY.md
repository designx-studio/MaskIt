# Redaction and Policy

## Policy actions

The engine supports `allow`, `redact`, and `block`. Policies are selected from application or domain context, with a default policy fallback. Unknown or invalid actions fall back to `redact` in the JavaScript settings helper.

## Redaction

JavaScript supports tagged redaction such as `[EMAIL_REDACTED]`, stars (`***`), and a configured custom replacement. `scanText` returns original findings, policy decisions, actionable findings, redacted text, risk data, matched rules, and audit events.

The Windows adapter uses typed tags through `MaskitCoreService.RedactionFor`. The clipboard adapter replaces the clipboard only when the Core result changes the text.

## Browser controls

The extension supports enabled/disabled state, paste/copy/typing switches, review-before-redact, site allow/block lists, pause/resume with optional auto-resume, custom rules, severity settings, and a killswitch configuration.

## Blocking

In the JavaScript policy model, block decisions are represented in `policyDecisions` and the returned action is recorded as blocked. Implementations must keep the replacement representation aligned across runtimes; this is a current parity-sensitive area.
