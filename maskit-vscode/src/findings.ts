import * as vscode from 'vscode';
import { triggerScan, getActiveDiagnostics } from './diagnostics';
import { scanText } from './scanner';

export function scanCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No active text editor open.");
    return;
  }

  const findings = triggerScan(editor.document);
  if (findings.length === 0) {
    vscode.window.showInformationMessage("MaskIt: No sensitive credentials detected in this file.");
  } else {
    vscode.window.showWarningMessage(
      `MaskIt: Detected ${findings.length} sensitive credential(s) in this file.`
    );
  }
}

export function scanSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No active text editor open.");
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showInformationMessage("No text selected.");
    return;
  }

  const text = editor.document.getText(selection);
  const result = scanText(text, editor.document.languageId);

  if (result.findings.length === 0) {
    vscode.window.showInformationMessage("MaskIt: Selection is clean.");
  } else {
    const list = result.findings.map(f => `${f.type} (${f.severity})`).join(", ");
    vscode.window.showWarningMessage(
      `MaskIt Warning: Sensitive data found in selection: ${list}`
    );
  }
}

export function showFindings() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No active editor.");
    return;
  }

  const diagnostics = getActiveDiagnostics(editor.document);
  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage("No findings recorded for this file.");
    return;
  }

  const items = diagnostics.map(d => ({
    label: `${d.code} - ${d.message}`,
    description: `Line ${d.range.start.line + 1}`,
    diagnostic: d
  }));

  vscode.window.showQuickPick(items, { placeHolder: "Select a finding to inspect" }).then(selection => {
    if (selection) {
      // Focus on the selection in the editor
      editor.selection = new vscode.Selection(selection.diagnostic.range.start, selection.diagnostic.range.end);
      editor.revealRange(selection.diagnostic.range);
      explainFindingDetails(selection.diagnostic);
    }
  });
}

export function explainFinding() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No active editor.");
    return;
  }

  const diagnostics = getActiveDiagnostics(editor.document);
  if (diagnostics.length === 0) {
    vscode.window.showInformationMessage("No active findings in the current file.");
    return;
  }

  // Get diagnostic under cursor or show selection
  const cursor = editor.selection.active;
  const underCursor = diagnostics.find(d => d.range.contains(cursor));

  if (underCursor) {
    explainFindingDetails(underCursor);
  } else {
    // Show quick pick to select which one to explain
    const items = diagnostics.map(d => ({
      label: String(d.code),
      description: d.message,
      diagnostic: d
    }));

    vscode.window.showQuickPick(items, { placeHolder: "Select a finding to explain" }).then(selection => {
      if (selection) {
        explainFindingDetails(selection.diagnostic);
      }
    });
  }
}

function explainFindingDetails(diagnostic: vscode.Diagnostic) {
  const type = diagnostic.code;
  let reason = "This credential can expose cloud or application resources to external entities.";
  let recommendation = "Remove from AI context or replace with environment variable reference.";

  if (type === "AWS_ACCESS_KEY" || type === "AWS_SECRET") {
    reason = "This credential allows programmatic access to your AWS cloud infrastructure and accounts.";
    recommendation = "Move credential into local environment variables or retrieve it via AWS IAM Roles.";
  } else if (type === "GITHUB_TOKEN") {
    reason = "GitHub Personal Access Tokens grant access to repository source code, actions, and administrative settings.";
    recommendation = "Utilize secure credential helper backends, environment variables, or GitHub App OAuth flows.";
  } else if (type === "OPENAI_API_KEY" || type === "ANTHROPIC_API_KEY") {
    reason = "This key allows access and billing requests on generative AI endpoints.";
    recommendation = "Store securely in configuration managers or populate through local environment variables.";
  } else if (type === "SSH_KEY") {
    reason = "Private SSH keys grant full shell access to connected servers and repositories.";
    recommendation = "Use ssh-agent to forward identities securely; do not hardcode key files.";
  }

  vscode.window.showInformationMessage(
    `MaskIt Explanation [${type}]:\n\n` +
    `Risk:\nCritical\n\n` +
    `Reason:\n${reason}\n\n` +
    `Action:\n${recommendation}`,
    { modal: true }
  );
}
