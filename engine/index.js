const detector = require('./detector');
const settings = require('./settings');
const context = require('./context');
const report = require('./report');
const { ruleVersion } = require('./rule-loader');

function scanText(text, scanSettings) {
  const result = detector.scanText(text, scanSettings);
  // Validate every event is canonical; re-build if a producer drifted
  const events = (result.events || []).map((event, index) => {
    const validation = context.validateContextEvent(event);
    if (validation.valid) return event;
    const decision = result.policyDecisions[index];
    return context.createEventFromFinding({
      finding: decision?.finding || { type: event.dataType || 'unknown', value: '' },
      decision: decision || { action: 'redact' },
      context: (scanSettings && scanSettings._context) || {},
      riskScore: result.riskScore,
      settings: scanSettings || {}
    });
  });
  return { ...result, events, ruleVersion: result.ruleVersion || ruleVersion() };
}

function redactText(text, scanSettings) {
  return detector.redactText(text, scanSettings);
}

function evaluatePolicy(text, scanSettings) {
  const result = scanText(text, scanSettings);
  return {
    allowed: !result.policyDecisions.some((d) => d.action === 'block'),
    findings: result.findings,
    allFindings: result.allFindings,
    policyDecisions: result.policyDecisions,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    blocked: result.policyDecisions.filter((d) => d.action === 'block').length,
    allowedByPolicy: result.policyDecisions.filter((d) => d.action === 'allow').length,
    redacted: result.policyDecisions.filter((d) => d.action === 'redact').length,
    reason: result.policyDecisions.length
      ? `Found ${result.allFindings.length} sensitive item(s)`
      : 'No sensitive data detected'
  };
}

function getStatus() {
  return {
    ...detector.getStatus(),
    ruleVersion: ruleVersion(),
    schemaVersion: context.SCHEMA_VERSION
  };
}

module.exports = {
  ...detector,
  ...settings,
  ...context,
  ...report,
  scanText,
  redactText,
  evaluatePolicy,
  getStatus
};

