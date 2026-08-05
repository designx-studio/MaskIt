const { SCHEMA_VERSION } = require('./context');

const REPORT_VERSION = '1.0';
const PRIVACY_STATEMENT = 'MaskIt local-first privacy statement: No raw prompts, source code, clipboard content, files, or secret values leave your local environment or are stored in security reports.';

/**
 * Generate a trusted, privacy-safe AI Security Report from a scan result.
 * 
 * Never includes: raw text, prompts, clipboard content, source code, files, or secret values.
 * 
 * Includes:
 * - What happened
 * - Where it happened
 * - What action was taken
 * - Why it was risky
 * - What is unknown
 * - Metadata: Report version, timestamp, source adapter, policy mode, evidence confidence, privacy statement
 */
function generateSecurityReport(scanResult = {}, contextOptions = {}) {
  const timestamp = new Date().toISOString();
  const sourceAdapter = contextOptions.source || scanResult._context?.source || 'cli';
  const application = contextOptions.app || contextOptions.application || scanResult._context?.application || 'unknown';
  const policyMode = contextOptions.policyName || scanResult.policyName || 'default';
  
  const allFindings = scanResult.allFindings || scanResult.findings || [];
  const events = scanResult.events || [];
  
  // Calculate average confidence across evidence events (or 1.0 if no findings)
  const confidenceSum = events.reduce((sum, e) => sum + (e.confidence ?? 0.85), 0);
  const evidenceConfidence = events.length > 0 ? Number((confidenceSum / events.length).toFixed(2)) : 1.0;

  const blockedCount = (scanResult.policyDecisions || []).filter(d => d.action === 'block').length;
  const redactedCount = (scanResult.policyDecisions || []).filter(d => d.action === 'redact').length;
  const warnedCount = (scanResult.policyDecisions || []).filter(d => d.action === 'warn').length;
  const allowedCount = (scanResult.policyDecisions || []).filter(d => d.action === 'allow').length;

  const primaryAction = blockedCount > 0 ? 'blocked' : (redactedCount > 0 ? 'redacted' : (warnedCount > 0 ? 'warned' : 'allowed'));

  // Group findings into risk summaries without exposing raw values or secret text
  const findingSummaries = allFindings.map((finding, idx) => {
    const event = events[idx] || {};
    return {
      ruleId: finding.ruleName || finding.type,
      dataType: finding.type,
      severity: finding.severity || 'medium',
      action: event.action || 'redacted',
      explanation: event.explanation || `${finding.type} matched configured privacy rules.`,
      matchedValueHash: event.matchedValueHash || null,
      confidence: event.confidence ?? 0.85
    };
  });

  const report = {
    reportVersion: REPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    timestamp,
    sourceAdapter,
    application,
    policyMode,
    evidenceConfidence,
    privacyStatement: PRIVACY_STATEMENT,
    
    // Core Report Sections
    whatHappened: {
      totalFindings: allFindings.length,
      riskLevel: scanResult.riskLevel || 'low',
      riskScore: scanResult.riskScore || 0,
      summary: allFindings.length > 0
        ? `Detected ${allFindings.length} sensitive item(s) (${scanResult.riskLevel || 'medium'} risk score: ${scanResult.riskScore || 0}).`
        : 'No sensitive data or credentials detected.'
    },

    whereItHappened: {
      sourceAdapter,
      application,
      contentType: contextOptions.contentType || scanResult._context?.contentType || 'text'
    },

    whatActionWasTaken: {
      primaryAction,
      counts: {
        blocked: blockedCount,
        redacted: redactedCount,
        warned: warnedCount,
        allowed: allowedCount
      }
    },

    whyItWasRisky: findingSummaries,

    whatIsUnknown: [
      'Content beyond submitted text boundaries was not inspected.',
      'Downstream AI model behavior and external processing context remain external.'
    ]
  };

  return report;
}

/**
 * Format a security report into a clean, human-readable text document.
 */
function formatSecurityReport(report) {
  const lines = [
    '==================================================',
    '             MASKIT AI SECURITY REPORT             ',
    '==================================================',
    `Report Version:     ${report.reportVersion}`,
    `Timestamp:          ${report.timestamp}`,
    `Source Adapter:     ${report.sourceAdapter}`,
    `Application:        ${report.application}`,
    `Policy Mode:        ${report.policyMode}`,
    `Evidence Confidence:${(report.evidenceConfidence * 100).toFixed(0)}%`,
    '--------------------------------------------------',
    '1. WHAT HAPPENED',
    `   ${report.whatHappened.summary}`,
    '',
    '2. WHERE IT HAPPENED',
    `   Adapter:         ${report.whereItHappened.sourceAdapter}`,
    `   Application:     ${report.whereItHappened.application}`,
    `   Content Type:    ${report.whereItHappened.contentType}`,
    '',
    '3. WHAT ACTION WAS TAKEN',
    `   Primary Action:  ${report.whatActionWasTaken.primaryAction.toUpperCase()}`,
    `   Breakdown:       Blocked=${report.whatActionWasTaken.counts.blocked}, Redacted=${report.whatActionWasTaken.counts.redacted}, Warned=${report.whatActionWasTaken.counts.warned}, Allowed=${report.whatActionWasTaken.counts.allowed}`,
    '',
    '4. WHY IT WAS RISKY',
  ];

  if (report.whyItWasRisky.length === 0) {
    lines.push('   No risk items recorded.');
  } else {
    report.whyItWasRisky.forEach((item, i) => {
      lines.push(`   [Finding ${i + 1}] Type: ${item.dataType} | Severity: ${item.severity} | Action: ${item.action}`);
      lines.push(`               Reason: ${item.explanation}`);
      if (item.matchedValueHash) {
        lines.push(`               Evidence Hash: ${item.matchedValueHash.slice(0, 16)}...`);
      }
    });
  }

  lines.push(
    '',
    '5. WHAT IS UNKNOWN',
    ...report.whatIsUnknown.map(u => `   - ${u}`),
    '',
    '--------------------------------------------------',
    'PRIVACY STATEMENT:',
    `   ${report.privacyStatement}`,
    '=================================================='
  );

  return lines.join('\n');
}

module.exports = {
  REPORT_VERSION,
  PRIVACY_STATEMENT,
  generateSecurityReport,
  formatSecurityReport
};
