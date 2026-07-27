# Testing Guide

## JavaScript tests

```bash
npm test
npm run test:engine
npm run test:extension
npm run test:mcp
npm run test:parity
npm run test:regex
npm run lint
```

`npm test` runs root extension tests, engine tests, MCP tests, and the JavaScript parity runner. MCP integration handlers are in `mcp-server/integration-test.js`.

## Parity fixtures

`parity-fixtures.json` contains inputs and expected findings, redaction outputs, risk scores, risk levels, and policy actions. The JavaScript parity runner compares the engine and browser adapter outputs. The Windows parity runner reads the same fixture file on Windows.

## CI

`.github/workflows/ci.yml` runs Node 18, 20, and 22 jobs for lint, regex safety, dependency audit, tests, MCP integration, manifest validation, and packaging. A separate Windows job restores and builds the .NET 8 project and runs `--parity`.

## Failure triage

Start with the failed job log, reproduce locally on the same runtime, fix the root cause, rerun focused tests, then rerun the full suite and packaging. Do not bypass failed tests or change fixtures to hide behavior changes.
