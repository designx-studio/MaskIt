# Detection Engine

## Detection pipeline

`engine/detector.js` scans bounded input using built-in regular expressions, validators, and custom rules. Findings contain a type, value, severity, and rule name. Duplicate type/value pairs are removed.

## Built-in types

- `EMAIL`: email address pattern.
- `PHONE`: Kenyan phone formats beginning with `+254` or `0`.
- `CARD`: 13 to 16 digit candidate with Luhn validation.
- `MPESA`: ten-character mixed alphanumeric transaction candidate with letter/digit checks.
- `SSN`: US Social Security number shape.
- `IP_ADDRESS`: IPv4 candidate with range and loopback checks.
- `PASSPORT`: one or two letters plus six to nine digits.
- `BANK_ACCOUNT`: IBAN-like alphanumeric values.
- `API_KEY`: provider and generic secret patterns, including OpenAI, Anthropic, GitHub, AWS, Google, Stripe, Bearer, cloud, CI, and service tokens.

## Custom rules

A custom rule contains an identifier or name, a regex pattern, and enabled state. JavaScript validates length, syntax, and selected catastrophic-backtracking patterns before compilation. The maximum is 15 custom rules and the maximum pattern length is 120 characters.

## Risk scoring

Severity weights are critical 50, high 25, medium 10, and low 5. Scores are capped at 100. Risk levels are low below 10, medium from 10, high from 25, and critical from 50.

## Cross-runtime artifacts

`maskit-core/rules/*.json` represents rules consumed by the Windows adapter. The JSON artifact schema carries id, name, pattern, flags, type, severity, and validator. Changes must be reflected in parity fixtures and validated on Windows.
