# Document 09: Release Process & Versioning

## Feature Overview

Standardized release process with semantic versioning, automated version bumping, and release tagging workflow.

## Current State

- Version 2.3.0 in manifest.json and package.json
- No release process documentation
- No automated version bumping
- No git tagging convention

## Missing Components

1. Release process documentation
2. Version bumping script (defined in Doc 05)
3. Git tagging convention
4. Release verification checklist

## Files to Create

### `RELEASE.md`

```markdown
# Release Process

## Versioning

Maskit uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes (new manifest version, API incompatibility)
- **MINOR**: New features (new detection types, new MCP tools, new UI)
- **PATCH**: Bug fixes, security patches, documentation updates

## Release Steps

### 1. Update Changelog
Edit CHANGELOG.md with new version entry.

### 2. Bump Version
```bash
node scripts/bump-version.js patch  # or minor, major
```
This updates:
- manifest.json
- package.json
- mcp-server/package.json

### 3. Run Full Test Suite
```bash
npm test
```
All 102+ tests must pass.

### 4. Create Production Build
```bash
npm run build
```
Verify dist/maskit-extension.zip is created.

### 5. Commit & Tag
```bash
git add -A
git commit -m "Release v2.4.0"
git tag v2.4.0
git push origin main --tags
```

### 6. Create GitHub Release
The release workflow (Doc 01) automatically creates a GitHub release with the zip artifact.

### 7. Chrome Web Store Submission
Follow CWS-SUBMISSION-CHECKLIST.md (Doc 08).

## Version Locations

| File | Field |
|------|-------|
| manifest.json | "version" |
| package.json | "version" |
| mcp-server/package.json | "version" |

All three must be updated together.

## Hotfix Process

For critical security fixes:
1. Create hotfix branch from release tag
2. Apply fix
3. Bump patch version
4. Test and release immediately
5. Cherry-pick to main if needed
```

## Files to Create

Already covered in Doc 05:
- `scripts/bump-version.js`

## Acceptance Criteria

- [ ] RELEASE.md documents the full process
- [ ] Version bump script works (tested with dry run)
- [ ] All 3 version files are kept in sync
- [ ] Git tagging convention is documented

## Dependencies

Doc 01 (Build Pipeline), Doc 05 (Distribution), Doc 08 (CWS Prep)

## Estimated Complexity

Small

## Production Readiness Checklist

- [ ] Release process documented
- [ ] Version bump script tested
- [ ] Git tagging works
- [ ] CWS submission checklist complete