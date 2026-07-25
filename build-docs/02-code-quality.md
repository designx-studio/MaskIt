# Document 02: Code Quality & Linting

## Feature Overview

ESLint configuration to enforce consistent code style, catch bugs early, and prevent common security anti-patterns across the codebase.

## Current State

- No `.eslintrc` or `eslint.config.js` exists
- No linting scripts in package.json
- Code is manually reviewed only
- Mixed coding styles between browser scripts (globals, no modules) and engine (CommonJS)

## Missing Components

1. `.eslintrc.json` — ESLint configuration
2. `eslint.config.js` — Flat config format (ESLint 9+)
3. Lint scripts in `package.json`

## Files to Create

### `.eslintrc.json`

```json
{
  "env": {
    "browser": true,
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022
  },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "no-redeclare": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "no-caller": "error",
    "no-return-assign": "error",
    "eqeqeq": ["error", "always"],
    "no-var": "warn",
    "prefer-const": "warn",
    "no-throw-literal": "error"
  },
  "ignorePatterns": [
    "node_modules/",
    "dist/",
    "mcp-server/node_modules/",
    "website/"
  ]
}
```

## Files to Modify

### `package.json`

Add lint scripts:
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
```

## Security Requirements

- `no-eval` and `no-implied-eval` prevent code injection
- `no-new-func` prevents dynamic code execution
- `no-script-url` prevents javascript: URL usage

## Acceptance Criteria

- [ ] ESLint runs without errors on all source files
- [ ] Lint scripts available via `npm run lint`
- [ ] Critical security rules enabled (eval, func constructor)
- [ ] CI integration from Doc 01

## Dependencies

Doc 01 (Build Pipeline)

## Estimated Complexity

Small

## Production Readiness Checklist

- [ ] ESLint config created
- [ ] `npm run lint` passes
- [ ] Security rules enabled
- [ ] CI lint job configured