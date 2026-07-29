# MaskIt Enterprise Deployment

## Current status
MaskIt supports assisted pilot deployment from GitHub Release assets. It does not currently provide a supported Intune policy channel, enterprise browser force-install package, central policy service, or signed fleet-management control plane.

## Supported pilot workflow
- Browser: download the release ZIP and load it as an unpacked extension on approved hosts.
- Windows: use the documented portable/agent package where available; Windows MSI validation requires a Windows VM.
- MCP and CLI: install the local Node package and configure the client with an absolute executable path.
- Policies: use the adapter-supported local policy mechanisms. The Phase 3 Node `PolicyManager` reads `maskit-core/policy.json`, validates `allow`, `redact`, and `block`, falls back to a strict embedded default, and hot-reloads local changes.

## Not yet supported
- Intune or MDM deployment claims
- Policy URLs or remote policy distribution
- Organization-wide policy push or RBAC
- Signed policy bundles, auto-update, or central inventory
- Guaranteed MSI upgrade, service recovery, and uninstall behavior without Windows integration testing

Do not market these capabilities as available until the corresponding adapter, installer, and CI validation work exists. See `docs/enterprise-pilot-readiness.md` for the current pilot boundary.
