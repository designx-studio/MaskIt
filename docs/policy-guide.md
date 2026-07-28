# Policy Guide

Maskit separates detection from decision. A finding is classified, scored, then evaluated against a policy before any action is taken.

**User-visible actions today:** `allow`, `redact`, and `block`.

The canonical schema also reserves `warn` and `require_approval` for staged rollout. Do not market warn/approval as fully shipped product UX until exposed in settings and adapters.

## Safer rollout

1. Start with review enabled and redact policies for structured PII.
2. Block credentials, private keys, and payment cards in external AI applications.
3. Use app-specific overrides for trusted local models.
4. Export audit metadata, not raw matched values.
5. Version policy changes and test them against fixtures before release.

Policy simulation and rollback are planned capabilities. Until those surfaces ship, treat configuration changes as code-reviewed changes and preserve the previous config file.