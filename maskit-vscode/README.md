# MaskIt VS Code Extension v1

Extend MaskIt context security to protect credentials inside the VS Code editor before they reach generative AI workflows.

## Features

* **Real-time Diagnostics:** Warns on hardcoded secrets in open/saved source code using squiggly highlights.
* **Selection Scanning:** Run `MaskIt: Scan Selection` to audit highlighted text blocks.
* **Copy Interception:** Intercepts editor copy actions (best-effort) and flags sensitive credentials.
* **Manual Clipboard Scanning:** Run `MaskIt: Scan Clipboard Content` to verify your clipboard is clean.
* **Audit evidence trail:** Writes canonical evidence events to `audit.jsonl` (omitting secret values and source contents).

---

## Commands

* `MaskIt: Scan Current File` — Run diagnostic audit checks across the active editor file.
* `MaskIt: Scan Selection` — Run policy checks on the current text selection.
* `MaskIt: Show Findings` — List all active findings detected in the workspace.
* `MaskIt: Explain Finding` — Explain the security risk and mitigation strategy for a highlighted finding.
* `MaskIt: Scan Clipboard Content` — Read and verify local clipboard contents against rules.

---

## Secrets Detection Scope

Leverages the local `maskit-core` engine rules:
* AWS Access and Secret Keys
* GitHub Personal Access Tokens (PAT)
* OpenAI & Anthropic API keys
* Azure connection strings and tokens
* Private SSH keys
* Database connection strings

---

## Privacy & Security Architecture

1. **Local-first:** Context verification and scanning runs 100% locally on your machine. No source code or credentials leave the device.
2. **Audit logs:** The extension writes canonical evidence events to the shared local `audit.jsonl` log file.
3. **No raw secrets:** We hash findings and do not log file contents, secrets, or raw context messages.
