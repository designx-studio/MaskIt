const detector = require('./detector');
const settings = require('./settings');
const context = require('./context');
const { ruleVersion } = require('./rule-loader');
const { PolicyManager } = require('../maskit-core/policy-manager');
const policyManager = new PolicyManager();
function withManagedPolicy(scanSettings) { settings.setLocalPolicy(policyManager.getPolicy()); return { ...(scanSettings || {}) }; }
function scanText(text, scanSettings) { const managedSettings = withManagedPolicy(scanSettings); const result = detector.scanText(text, managedSettings); const events = (result.events || []).map((event, index) => { const validation = context.validateContextEvent(event); if (validation.valid) return event; const decision = result.policyDecisions[index]; return context.createEventFromFinding({ finding: decision?.finding || { type: event.dataType || 'unknown', value: '' }, decision: decision || { action: 'redact' }, context: (managedSettings && managedSettings._context) || {}, riskScore: result.riskScore, settings: managedSettings }); }); return { ...result, events, ruleVersion: result.ruleVersion || ruleVersion(), policyVersion: policyManager.getVersion() }; }
function redactText(text, scanSettings) { return detector.redactText(text, withManagedPolicy(scanSettings)); }
function evaluatePolicy(text, scanSettings) { const result = scanText(text, scanSettings); return { allowed: !result.policyDecisions.some((d) => d.action === 'block'), findings: result.findings, allFindings: result.allFindings, policyDecisions: result.policyDecisions, riskScore: result.riskScore, riskLevel: result.riskLevel, blocked: result.policyDecisions.filter((d) => d.action === 'block').length, allowedByPolicy: result.policyDecisions.filter((d) => d.action === 'allow').length, redacted: result.policyDecisions.filter((d) => d.action === 'redact').length, reason: result.policyDecisions.length ? `Found ${result.allFindings.length} sensitive item(s)` : 'No sensitive data detected' }; }
function getStatus() { return { ...detector.getStatus(), ruleVersion: ruleVersion(), schemaVersion: context.SCHEMA_VERSION, policyVersion: policyManager.getVersion() }; }
module.exports = { ...detector, ...settings, ...context, scanText, redactText, evaluatePolicy, getStatus, policyManager };
