# FAQ

## Does Maskit send prompts to a cloud service?

No. Browser detection runs in the extension, MCP and CLI run in local Node.js, and the Windows agent runs locally. There is no Maskit cloud for prompts.

## Which browser sites are supported?

ChatGPT (`chatgpt.com`, `chat.openai.com`), Claude, Gemini, Microsoft Copilot, and Cursor host patterns listed in the extension manifest. MaskIt does **not** claim coverage of all AI apps.

## What happens to a detected value?

The active policy chooses **allow**, **redact**, or **block**. Audit records store metadata and an **irreversible SHA-256 hash** of the matched value—not the raw secret. (Schema also reserves warn/approval for later; they are not the primary user-visible actions.)

## Can I use Maskit with Claude Desktop or Cursor?

Yes. Download the MCP package from GitHub Releases, configure the client to launch the local server, and use tools such as `scan_text`, `redact_text`, and `evaluate_policy`.

## Is the Windows agent a signed MSI installer?

No. The release includes a **portable self-contained** `maskit-windows-agent.zip` (unsigned portable package unless a future release adds signing). Extract and run `publish\Maskit.Agent.exe`. It provides **clipboard** protection (beta), not full desktop DLP.

## How do I update Maskit?

Download the latest assets from GitHub Releases. Replace the browser package and re-load unpacked; replace CLI/MCP extract folders; replace the Windows extract folder and restart the agent. Export browser settings first if customized.

## How do I uninstall?

Remove the extension from the browser manager; remove MCP client config and extracted folders; exit and delete the Windows agent folder. Local config/audit under the user profile can be deleted if no longer needed.

## Does Maskit claim SOC 2, ISO 27001, or GDPR certification?

No. MaskIt is defense-in-depth software. Customers remain responsible for their compliance programs.

## Why is a download link unavailable?

Release assets are created when a version tag is pushed. If no release exists yet, ask the pilot contact for a package or see [development docs](development/) for contributor builds.
