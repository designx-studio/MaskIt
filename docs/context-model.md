# Unified Context Model

Maskit v3.5 introduces a shared event vocabulary for browser, Windows, CLI, MCP, CI, and future gateway adapters.

Every decision carries:

- source and application
- optional user and device context
- detected data type
- confidence from 0 to 1
- risk level
- policy name, version, and result
- action taken
- human-readable explanation
- optional rule identifier and salted value hash

The canonical JSON Schema lives at `maskit-core/audit-schema/context-event.schema.json`. The runtime helper is `engine/context.js`.

Maskit does not treat all detections as equally accurate. Secrets and credentials are the highest-confidence category, structured data uses validators such as Luhn checks, and business context remains a classification and explanation problem rather than an overpromised detector.