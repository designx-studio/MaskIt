# MaskIt Known Scope Boundaries & Limitations

To maintain privacy and user trust, MaskIt intentionally avoids invasive surveillance technologies. The following boundaries outline what MaskIt does **not** do.

---

## Technical Scope Boundaries

1. **No Kernel Drivers / Ring 0 Hooking**:
   - MaskIt operates entirely in user-space (browser extensions, VS Code extensions, user-space Windows desktop agent). It does not install kernel filter drivers.
2. **No Keyboard Input Logging Outside Clipboard/Text Editors**:
   - Native application typing without clipboard interaction or supported web DOM textareas is not monitored.
3. **No Terminal Screen Capture or Voice Input**:
   - Terminal audio, voice input streams, and desktop video screen capture are outside MaskIt's protection scope.
4. **Unsupported AI Sites**:
   - Browser extension protection is active on supported domains (`chatgpt.com`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `cursor.com`). Generic unsupported web domains rely on the CLI/MCP layer.

---

## Features Deferred Post-Pilot

- Centralized cloud administration dashboard & tenant management
- Automatic remote secret rotation
- SIEM / Syslog streaming integration
- Multi-tenant Role-Based Access Control (RBAC)
