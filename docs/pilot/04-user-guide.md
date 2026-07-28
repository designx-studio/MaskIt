# Pilot user guide

Short guide for people using MaskIt day to day.

## What MaskIt is

MaskIt watches for sensitive patterns (API keys, cards, emails, and similar) when you work with **supported AI tools** and helps stop accidental pastes of secrets.

It runs **on your computer**. It does not send your prompts to a MaskIt cloud service.

## Where it works

- **Browser:** ChatGPT, Claude, Gemini, Microsoft Copilot, and Cursor websites (as listed by your admin).  
- **Optional:** command-line tools, MCP-connected assistants, Windows **clipboard** protection (beta).

If you use an AI site that is **not** on the list, MaskIt will not protect that page.

## What you will experience

### Masking / redaction

If you paste or type something that looks like a secret or personal identifier, MaskIt may replace it with stars or a tag such as `[EMAIL_REDACTED]` before it stays in the chat box.

**Example**

- You paste: `Call me at +254712345678`  
- You may see: `Call me at ***` (or a redaction tag)

### Block

For high-risk items (for example payment cards under a strict policy), MaskIt may **prevent** the content from being used and show a clear message.

### Review prompt

If your admin enabled “review before redact,” you may see a short confirmation dialog before redaction is applied. Confirm to continue; cancel to keep your original text (and responsibility).

### Pause

You can **pause** protection temporarily from the extension popup (for example when debugging with approved synthetic data). When paused, data can pass through unprotected. Pause may auto-resume after a short timer.

Only pause when you understand the risk.

## Warnings

- MaskIt is **help**, not a guarantee. Unusual secret formats may be missed.  
- Turning protection **OFF**, pausing, or using an unsupported site leaves you unprotected.  
- Your company AI policy still applies; MaskIt is one control layer.  
- Do not paste real production secrets into AI tools even if MaskIt is active.

## Status indicators

- Extension badge / traffic light: Active, Paused, or Off.  
- Popup shows whether the **current page** is protected.

## Privacy (simple)

- Detection happens locally.  
- Audit records store **what kind** of data was found and a **hash**, not the secret itself.  
- MaskIt does not upload page content to Maskit servers.

## Need help?

Contact your pilot admin or the MaskIt pilot support contact provided by DesignX.
