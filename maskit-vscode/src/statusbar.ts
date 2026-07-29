import * as vscode from 'vscode';

export class MaskItStatusBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'maskit.showFindings';
        this.update(0);
        this.statusBarItem.show();
    }

    public update(findingCount: number): void {
        if (findingCount === 0) {
            this.statusBarItem.text = `$(shield) MaskIt Protected`;
            this.statusBarItem.tooltip = 'MaskIt is actively monitoring for secrets and sensitive data.';
            this.statusBarItem.backgroundColor = undefined;
        } else {
            this.statusBarItem.text = `$(warning) ${findingCount} Finding${findingCount > 1 ? 's' : ''} Detected`;
            this.statusBarItem.tooltip = 'MaskIt has detected potential sensitive data in the active file.';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
