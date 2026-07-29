# MaskIt Pilot Privacy Guarantees

MaskIt is designed to process protected content locally. The pilot report and evidence loop store metadata about detections and actions, not the protected content itself.

## Reported guarantees

- No prompt content is included in AI Security Reports.
- No file or source-code content is included in AI Security Reports.
- No clipboard content is included in AI Security Reports.
- Raw secret values are excluded from canonical evidence and report outputs.
- Reports are generated offline from local evidence, policy state, inventory, and local health metadata.
- The report renderer escapes all user-controlled metadata before inserting it into HTML.

## What the report can establish

- A detection rule matched.
- Which local surface recorded the event.
- Which policy action was taken.
- Risk and confidence metadata.
- Which AI tools were recorded in the local inventory.

## What the report cannot establish

- Whether a detected credential was valid or active.
- Whether content was submitted outside observed surfaces.
- Whether an account was personal or enterprise-managed unless locally observable.
- The business meaning of arbitrary conversations.

## Pilot proof procedure

1. Use synthetic credentials and synthetic customer data only.
2. Trigger one detection in the selected endpoint surface.
3. Confirm the action shown to the user: allow, warn, redact, or block.
4. Generate `node mcp-server/cli.js report generate`.
5. Inspect JSON, Markdown, CSV, and HTML outputs.
6. Confirm the synthetic raw value is absent from every output.
7. Run `npm run test:report` and retain the output as pilot evidence.

MaskIt should not be marketed as a complete DLP or compliance product. These guarantees describe the current local pilot workflow and must be revalidated whenever a new adapter or persistence path is added.
