# Security Model

MaskIt is local-first: browser detection runs in the extension, MCP and CLI run in a local Node process, and the Windows agent runs locally.

## Implemented controls
- Per-app policies support `allow`, `redact`, and `block` through the existing engine policy APIs.
- Hash-chained local audit events use the canonical schema and do not store raw matched values.
- Configurable retention and local killswitch controls are available where documented by each adapter.
- Manifest V3 limits extension execution to declared local code and supported hosts.
- Regex safety validation is available through `npm run test:regex`; this is a validation tool, not a proof that every future rule is safe.
- The Phase 3 `PolicyManager` provides validated, fail-closed policy loading and hot reload for Node-based consumers. Browser and Windows-native consumers still require adapter-specific integration before a unified-policy claim is made.

## Boundaries and limitations
MaskIt does not support unmasking. Behaviour is Detect -> Redact/Block -> Audit. It is defense-in-depth, not a guarantee, full DLP product, or compliance certification. Review permissions, supported hosts, policy configuration, and false-positive/false-negative risk before production use.

Pilot materials: [docs/pilot/](pilot/) and [claims-evidence-matrix.md](claims-evidence-matrix.md).
