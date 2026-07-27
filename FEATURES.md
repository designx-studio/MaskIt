# Maskit Feature Documentation

## Regex Safety Validation

The platform implements defense-in-depth against Regular Expression Denial of Service (ReDoS) attacks. Every custom regex pattern submitted through `update_rules` or `validateCustomRegexPattern` is validated against safety thresholds before deployment.

### Validation Layers

1. **Catastrophic Backtracking Detection**
   - The engine rejects patterns known to cause exponential time complexity.
   - Test cases: `(a+)+`, `a{1,}` patterns are rejected during `validateCustomRegexPattern`.

2. **Regex Execution Limits**
   - Defined in `engine/settings.js` as `REGEX_LIMITS`.
   - Maximum execution time enforced during validation.
   - Timeout-based rejection for patterns that exceed safe execution.

3. **Pattern Complexity Scoring**
   - Nested quantifiers are flagged.
   - Overlapping alternation branches are checked.

### Testing

```bash
npm run test:regex
```

This command runs the ReDoS safety suite integrated into CI/CD via `.github/workflows/ci.yml`.

## Built-in Patterns

The engine includes 20 regex patterns covering:
- 9 data types (API_KEY, CARD, SSN, BANK_ACCOUNT, PASSPORT, IP_ADDRESS, EMAIL, PHONE, MPESA)
- 30+ cloud provider key patterns