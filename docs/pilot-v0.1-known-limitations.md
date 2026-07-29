# MaskIt Pilot v0.1: Known Limitations

- The pilot report is single-machine and offline. It is not an MSP dashboard.
- AI inventory is supplied as local metadata; automatic discovery across every browser, desktop app, MCP server, CLI, and VS Code extension is not complete.
- The report proves observed local events only. It cannot determine whether a credential is active or whether content was submitted outside observed surfaces.
- Browser protection is limited to hosts declared in the extension manifest.
- Windows MSI, service recovery, and clean-machine lifecycle behavior require Windows validation.
- Policy parity must be verified per adapter before claiming one universal runtime policy.
- Risk is a prioritization aid, not a compliance grade or guarantee.
- No cloud backend, tenant management, RBAC, SIEM integration, automatic credential rotation, or incident-ticket integration is included.
- Use synthetic test data during the pilot.
