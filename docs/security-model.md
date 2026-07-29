# Security Model

MaskIt is local-first: browser detection runs in the extension, MCP and CLI run in a local Node process, and the Windows agent runs locally.

## Controls
- **Unified Policy Engine**: All components (Browser, VS Code, CLI, Windows Agent) utilize a single JSON policy file, enabling centralized administration and consistent enforcement.
- **Actions**: Per-app policies support `allow`, `redact`, and `block` actions based on detected data types.
- **Audit**: Hash-chained local audit events (canonical schema only; irreversible SHA-256 value hashes, unsalted).
- **Killswitch**: Configurable local admin killswitch with duration or schedule limits.
- **Unmasking**: MaskIt does not support unmasking — behaviour is strictly Detect → Redact/Block → Audit.

## Threat Mitigations
- **ReDoS Prevention**: All regex rules are tested against ReDoS vulnerabilities using automated CI pipelines.
- **Manifest V3**: The browser extension utilizes Manifest V3, restricting remote code execution.

MaskIt is a defense-in-depth tool, not a guarantee and not a full DLP or compliance certification product. Review policies, permissions, and deployment configuration before production use. Supported browser hosts are limited to the patterns in the extension manifest.

Pilot materials: [docs/pilot/](pilot/) and [claims-evidence-matrix.md](claims-evidence-matrix.md).
