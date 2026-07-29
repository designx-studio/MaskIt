# MaskIt Pilot v0.1: Ten-Minute Demo

## Goal

Prove one local loop: synthetic secret → detection → policy action → canonical metadata event → report → no raw secret in output.

## Run the demo

Use synthetic credentials only. From the repository root:

```bash
npm run test:pilot
node mcp-server/cli.js report generate ./events.json --output ./reports
```

Open `reports/ai-security-report.html` and confirm the report explains the source, rule, action, risk, known evidence, and unknowns.

The report directory must contain:

- `ai-security-report.json`
- `ai-security-report.md`
- `ai-security-report.csv`
- `ai-security-report.html`

## Expected result

The user should be able to say: “MaskIt detected a synthetic AWS credential, blocked it under policy, recorded metadata-only evidence, and generated a report without the credential.”

## Privacy check

Search every report output for the synthetic value. It must not appear. Reports must contain rule names and actions, never prompts, files, clipboard content, source code, or raw secrets.
