# Security Model

Maskit is local-first: browser detection runs in the extension, MCP and CLI run in a local Node process, and the Windows agent runs locally.

Controls include per-app policies with `allow`, `redact`, and `block`; hash-chained local audit events (canonical schema only, irreversible value hashes); configurable retention; and an admin killswitch with duration or schedule. MaskIt v1 does not support unmasking — behaviour is Detect → Warn/Block/Mask → Audit.

Maskit is a defense-in-depth tool, not a guarantee. Review policies, permissions, and deployment configuration before production use.