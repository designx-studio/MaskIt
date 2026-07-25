# Document 01: Build Pipeline & CI/CD

## Feature Overview

Automated build pipeline that runs tests, linting, and produces release artifacts on every push and pull request. Replaces manual `npm test` with a gated CI pipeline.

## Current State

- `npm test` runs all 3 test suites (102 tests pass)
- `npm run build` creates `dist/maskit-extension.zip` via `scripts/build.js`
- No CI/CD configuration exists
- No automated checks on push/PR

## Missing Components

1. `.github/workflows/ci.yml` — GitHub Actions workflow
2. `.github/workflows/release.yml` — Release automation
3. `.gitignore` — Exclude node_modules, dist, logs

## Files to Create

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
      - run: cd mcp-server && npm ci
      - run: node mcp-server/test.js

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx eslint . --config .eslintrc.json
```

### `.github/workflows/release.yml`

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: softprops/action-gh-release@v2
        with:
          files: dist/maskit-extension.zip
```

### `.gitignore`

```
node_modules/
mcp-server/node_modules/
dist/
*.log
.DS_Store
Thumbs.db
```

## Files to Modify

None.

## Security Requirements

- CI runs in isolated GitHub Actions containers
- No secrets exposed in workflow logs
- Release artifacts are built from tagged commits only

## Acceptance Criteria

- [ ] Push to main triggers CI workflow
- [ ] PR triggers CI with test + lint jobs
- [ ] Tag push produces release artifact
- [ ] `.gitignore` excludes node_modules and dist

## Dependencies

None.

## Estimated Complexity

Medium

## Production Readiness Checklist

- [ ] CI workflow runs on every push
- [ ] Tests run across Node 18/20/22
- [ ] Release workflow produces zip artifact
- [ ] `.gitignore` is comprehensive