# MaskIt onboarding (download-first)

Get from zero to local protection without compiling the repository.

**Design partners:** start with the [pilot package](pilot/README.md).

## 1. Choose your surface

- **Browser extension** (recommended): ChatGPT, Claude, Gemini, Copilot, Cursor hosts  
- **MCP server** (optional): Claude Desktop, Cursor, and other MCP clients  
- **CLI** (optional): scripts and CI  
- **Windows agent** (optional beta): system **clipboard** protection  

## 2. Download

Use the [download page](../website/download/index.html) or [latest GitHub Release](https://github.com/designx-studio/MaskIt/releases/latest).

You do **not** need `git clone` for normal use.

## 3. Install and verify

Follow the [pilot installation guide](pilot/02-installation-guide.md):

1. Install the browser ZIP (Load unpacked).  
2. Open a supported AI site and paste a synthetic email (`pilot-test@example.com`).  
3. Confirm masking and check the local audit log (metadata + hash only).  

Optional: Windows `--self-test`, CLI `scan --json`, MCP `scan_text`.

## 4. Configure

- Use **allow / redact / block** policies (see [admin guide](pilot/03-admin-guide.md)).  
- Start with review-before-redact if users are new to the product.  
- Keep killswitch off until you intentionally need it.  

## 5. Read next

- [Pilot overview](pilot/01-pilot-overview.md)  
- [User guide](pilot/04-user-guide.md)  
- [Security whitepaper](pilot/05-security-whitepaper.md)  
- [Claims ↔ evidence](claims-evidence-matrix.md)  

## Contributors only

Source build, tests, and packaging: [development/](development/).
