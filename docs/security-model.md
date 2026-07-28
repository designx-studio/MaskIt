# Security Model

Maskit is local-first: browser detection runs in the extension, MCP and CLI run in a local Node process, and the Windows agent runs locally.

Controls include per-app policies with `allow`, `redact`, and `block`; hash-chained local audit events (canonical schema only; irreversible SHA-256 value hashes, unsalted in v2.4.0); configurable retention; and a local admin killswitch with duration or schedule. MaskIt does not support unmasking — behaviour is Detect → Redact/Block → Audit.

Maskit is a defense-in-depth tool, not a guarantee and not a full DLP or compliance certification product. Review policies, permissions, and deployment configuration before production use. Supported browser hosts are limited to the patterns in the extension manifest.

Pilot materials: [docs/pilot/](pilot/) and [claims-evidence-matrix.md](claims-evidence-matrix.md).