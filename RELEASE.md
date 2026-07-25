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
The release workflow automatically creates a GitHub release with the zip artifact.

### 7. Chrome Web Store Submission
Follow CWS-SUBMISSION-CHECKLIST.md.

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