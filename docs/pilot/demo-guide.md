# MaskIt Pilot Demonstration Guide

This guide walks pilot participants through running and validating the core local security workflow.

---

## 1. Automated Pilot Scenario Command

Run the automated test script in your workspace:

```bash
npm run pilot-demo
```

### Scenario Execution Flow
1. **Synthetic Paste**: A developer accidentally pastes AWS Credentials (`AKIA...`), GitHub Personal Access Token (`ghp_...`), and an RSA Private Key into an AI assistant context.
2. **Local Detection**: MaskIt detects all 3 sensitive credentials locally before transmission.
3. **Policy Decision**: Applies local policy (Block or Redact).
4. **Evidence Generation**: Produces canonical `1.0` evidence events with SHA-256 hashes of matched values.
5. **AI Security Report**: Generates a structured human-readable and machine-readable security report.
6. **Privacy Audit**: Verifies zero secret strings or source code are present in the output.

---

## 2. Interactive VS Code Pilot Walkthrough

1. Open VS Code with the MaskIt extension enabled.
2. Open a test file and paste a sample API key:
   ```javascript
   const apiKey = "AKIAIOSFODNN7EXAMPLE";
   ```
3. Observe the warning dialog:
   - Option **Remove Secret**: Automatically replaces the secret with `[REDACTED_API_KEY_AWS_ACCESS]`.
   - Option **Review**: Opens diagnostic line details and security explanations.
   - Option **Cancel**: Dismisses the warning.

---

## 3. Interactive Browser Extension Walkthrough

1. Open `https://chatgpt.com` or `https://claude.ai`.
2. Attempt to paste text containing `ghp_1234567890abcdefghijklmnopqrstuvwxyz1234`.
3. MaskIt intercepts the paste, redacts the token in-place to `[API_KEY_REDACTED]`, displays a warning toast explaining why the action was taken, and logs privacy-safe evidence.
