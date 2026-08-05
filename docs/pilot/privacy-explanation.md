# MaskIt Privacy & Evidence Architecture

MaskIt operates under a strict **local-first privacy model**. It ensures sensitive context is protected locally on user devices before reaching external AI providers or cloud networks.

---

## Core Privacy Guarantees

1. **Zero Cloud Uploads of Raw Data**:
   - MaskIt does not transmit prompts, source code, files, or clipboard contents to any external telemetry server or cloud host.
2. **Irreversible Evidence Hashing**:
   - Evidence events log metadata (data type, severity, timestamp, action taken, application) and an irreversible SHA-256 hash of matched values (`matchedValueHash`).
   - Raw secret values, tokens, and credentials are **never stored** in logs or reports.
3. **No Unmask Fields**:
   - Canonical evidence schema `1.0` strictly forbids unmasking tokens, unmasked durations, or raw secret retention.
4. **Explainable Findings**:
   - Findings provide transparent explanations of risk (e.g. "AWS Access Key matched in VS Code") without compromising sensitive values.

---

## Canonical Evidence Event Schema (v1.0)

```json
{
  "schemaVersion": "1.0",
  "eventId": "evt_1722270606_abc123",
  "timestamp": "2026-07-29T14:30:06.571Z",
  "source": "cli",
  "application": "pilot-demo-app",
  "user": null,
  "device": null,
  "dataType": "API_KEY",
  "confidence": 0.95,
  "risk": "critical",
  "policy": {
    "name": "default",
    "version": "1",
    "result": "redact"
  },
  "action": "redacted",
  "explanation": "API_KEY_AWS_ACCESS matched in pilot-demo; policy result was redact.",
  "ruleId": "API_KEY_AWS_ACCESS",
  "matchedValueHash": "1a5d44a2dca19669..."
}
```
