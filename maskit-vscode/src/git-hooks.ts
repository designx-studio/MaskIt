import * as fs from 'fs';
import * as path from 'path';

export async function setupGitHooks(workspaceRoot: string): Promise<void> {
  const hooksDir = path.join(workspaceRoot, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');
  if (!fs.existsSync(hooksDir)) return;
  const marker = '# MaskIt managed pre-commit hook';
  if (fs.existsSync(hookPath) && fs.readFileSync(hookPath, 'utf8').includes(marker)) return;
  if (fs.existsSync(hookPath)) fs.copyFileSync(hookPath, `${hookPath}.maskit-original`);
  const repoRoot = workspaceRoot.replace(/\\/g, '/');
  const script = `#!/bin/sh\n${marker}\nset -eu\nROOT="${repoRoot}"\nFILES=$(git -C "$ROOT" diff --cached --name-only --diff-filter=ACMR)\n[ -z "$FILES" ] && exit 0\nnode - "$ROOT" <<'NODE'\nconst cp = require('child_process');\nconst fs = require('fs');\nconst path = require('path');\nconst root = process.argv[2];\nconst engine = require(path.join(root, 'engine'));\nconst files = cp.execFileSync('git', ['-C', root, 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' }).trim().split(/\\r?\\n/).filter(Boolean);\nlet blocked = 0;\nfor (const file of files) { const text = cp.execFileSync('git', ['-C', root, 'show', ':0:' + file], { encoding: 'utf8' }); const result = engine.evaluatePolicy(text, { _context: { source: 'git', application: 'pre-commit', file } }); const blocks = result.policyDecisions.filter(d => d.action === 'block'); if (blocks.length) { blocked += blocks.length; console.error('MaskIt blocked ' + file + ': ' + blocks.map(d => d.finding.ruleName).join(', ')); } }\nprocess.exit(blocked ? 1 : 0);\nNODE\nSTATUS=$?\nif [ -x "${hookPath}.maskit-original" ]; then "${hookPath}.maskit-original" || exit $?; fi\nexit $STATUS\n`;
  fs.writeFileSync(hookPath, script, { mode: 0o755 });
}
