# MaskIt Pilot v0.1: Privacy Proof

## Procedure

1. Use a synthetic AWS credential fixture only.
2. Run `npm run test:pilot`.
3. Generate JSON, Markdown, CSV, and HTML outputs from the fixture.
4. Search every output for the synthetic credential value.
5. Confirm only rule name, source, action, risk, confidence, and timestamps appear.
6. Inspect the local audit file for the same metadata-only property.
7. Delete generated reports and local test fixtures after the demo.

## Guarantees tested

- Raw secrets are not present in canonical events.
- Raw secrets are not present in reports.
- Report HTML escapes metadata before rendering.
- Unknown information is labelled instead of invented.
- No external API is required to generate the report.

## Boundary

This proves the local report path. It does not independently prove absence of all network traffic on every operating system. Repeat with OS-level network monitoring for a formal security review.
