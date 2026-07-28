const detector = require('./detector');
const settings = require('./settings');
const context = require('./context');
const { ruleVersion } = require('./rule-loader');
function confidenceFor(finding) {
  if (finding.type === 'API_KEY') return 0.95;
  if (['CARD','SSN','BANK_ACCOUNT'].includes(finding.type)) return 0.9;
  if (finding.type.startsWith('CUSTOM:')) return 0.65;
  return 0.85;
}
function canonicalizeEvent(event, finding, decision, scanSettings) {
  const result = decision.action === 'allow' ? 'allow' : decision.action === 'block' ? 'block' : 'redact';
  return context.createContextEvent({
    eventId: event.id,
    timestamp: new Date(event.timestamp).toISOString(),
    source: scanSettings?._context?.source === 'mcp' ? 'mcp' : scanSettings?._context?.source === 'windows' ? 'windows' : scanSettings?._context?.source === 'browser' ? 'browser' : 'cli',
    application: scanSettings?._context?.app || scanSettings?._context?.domain || event.app || 'unknown',
    dataType: finding.type,
    confidence: confidenceFor(finding),
    risk: event.severity === 'critical' ? 'critical' : event.severity === 'high' ? 'high' : event.severity === 'medium' ? 'medium' : 'low',
    policy: { name: event.policyApplied || 'default', version: scanSettings?.policyVersion || '1', result },
    action: event.action === 'allowed' ? 'allowed' : event.action === 'blocked' ? 'blocked' : 'redacted',
    explanation: `${finding.ruleName || finding.type} matched in ${applicationName(scanSettings)}; policy result was ${result}.`,
    ruleId: finding.ruleName || finding.type,
    matchedValue: finding.value
  });
}
function applicationName(settings) { return settings?._context?.app || settings?._context?.domain || 'the active adapter'; }
function scanText(text, settings) {
  const result = detector.scanText(text, settings);
  const canonicalEvents = result.policyDecisions.map((decision, index) => canonicalizeEvent(result.events[index], decision.finding, decision, settings));
  return { ...result, events: canonicalEvents, ruleVersion: ruleVersion() };
}
function redactText(text, settings) { return detector.redactText(text, settings); }
function evaluatePolicy(text, settings) { const result = scanText(text, settings); return { allowed: !result.policyDecisions.some((d) => d.action === 'block'), findings: result.findings, allFindings: result.allFindings, policyDecisions: result.policyDecisions, riskScore: result.riskScore, riskLevel: result.riskLevel, blocked: result.policyDecisions.filter((d) => d.action === 'block').length, allowedByPolicy: result.policyDecisions.filter((d) => d.action === 'allow').length, redacted: result.policyDecisions.filter((d) => d.action === 'redact').length, reason: result.policyDecisions.length ? `Found ${result.allFindings.length} sensitive item(s)` : 'No sensitive data detected' }; }
function getStatus() { return { ...detector.getStatus(), ruleVersion: ruleVersion(), schemaVersion: context.SCHEMA_VERSION }; }
module.exports = { ...detector, ...settings, ...context, scanText, redactText, evaluatePolicy, getStatus };
