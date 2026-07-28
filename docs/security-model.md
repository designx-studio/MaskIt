# Security Model

Maskit is local-first: browser detection runs in the extension, MCP and CLI run in a local Node process, and the Windows agent runs locally.

Controls include per-app policies with `allow`, `redact`, and `block`; hash-chained local audit events; configurable retention; an admin killswitch with duration or schedule; and audited temporary unmasking.

Maskit is a defense-in-depth tool, not a guarantee. Review policies, permissions, and deployment configuration before production use.