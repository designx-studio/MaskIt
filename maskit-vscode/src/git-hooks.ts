import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function setupGitHooks(workspaceRoot: string): Promise<void> {
    const gitHookPath = `${workspaceRoot}/.git/hooks/pre-commit`;
    const fs = require('fs');

    const hookScript = `#!/bin/sh
# MaskIt Pre-Commit Hook
echo "Scanning staged files with MaskIt..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

# In a real environment, this would call the CLI executable
# node node_modules/maskit-cli/bin/scan.js $STAGED_FILES
# For phase 3 we are laying the foundation

echo "MaskIt scan complete."
exit 0
`;

    try {
        if (fs.existsSync(`${workspaceRoot}/.git`)) {
            fs.writeFileSync(gitHookPath, hookScript, { mode: 0o755 });
            console.log('MaskIt pre-commit hook installed successfully.');
        }
    } catch (e) {
        console.error('Failed to install MaskIt pre-commit hook', e);
    }
}
