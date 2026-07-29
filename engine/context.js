const crypto = require('crypto');

const SCHEMA_VERSION = '1.0';
const SOURCE_VALUES = new Set(['browser', 'windows', 'cli', 'mcp', 'ci', 'gateway']);
const ACTIONS = new Set(['allowed', 'warned', 'redacted', 'blocked', 'approval_required']);
const RESULTS = new Set(['allow', 'warn', 'redact', 'block', 'require_approval']);
const RISKS = new Set(['low', 'medium', 'high', 'critical']);

function normalizeSource(source) {
  const raw = String(source || 'cli').toLowerCase();
  if (SOURCE_VALUES.has(raw)) return raw;
  if (raw.startsWith('browser')) return 'browser';
  if (raw.startsWith('windows')) return 'windows';
  if (raw.startsWith('mcp')) return 'mcp';
  if (raw.startsWith('cli')) return 'cli';
  if (raw.startsWith('ci')) return 'ci';
  if (raw.startsWith('gateway')) return 'gateway';
  if (['paste', 'copy', 'typing', 'selection'].includes(raw)) return 'browser';
  return 'cli';
}

function policyResultFromAction(action) {
  if (action === 'allow' || action === 'allowed') return 'allow';
  if (action === 'warn' || action === 'warned') return 'warn';
  if (action === 'block' || action === 'blocked') return 'block';
  if (action === 'require_approval' || action === 'approval_required') return 'require_approval';
  return 'redact';
}

function actionFromResult(result) {
  return ({
    allow: 'allowed',
    warn: 'warned',
    redact: 'redacted',
    block: 'blocked',
    require_approval: 'approval_required'
  })[result] || 'redacted';
}

function hashMatchedValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/**
 * Single canonical event builder for every Maskit adapter.
 * Never stores raw sensitive values — only irreversible hashes.
 */
function createContextEvent(input = {}) {
  const policyResult = RESULTS.has(input.policy?.result)
    ? input.policy.result
    : policyResultFromAction(input.action || input.policyResult || 'redact');
  const action = ACTIONS.has(input.action) ? input.action : actionFromResult(policyResult);
  const risk = RISKS.has(input.risk) ? input.risk : 'medium';
  const confidence = Math.max(0, Math.min(1, Number(input.confidence ?? 0.5)));

  const event = {
    schemaVersion: SCHEMA_VERSION,
    eventId: input.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: input.timestamp || new Date().toISOString(),
    source: normalizeSource(input.source),
    application: String(input.application || 'unknown'),
    user: input.user || null,
    device: input.device || null,
    dataType: String(input.dataType || 'unknown'),
    confidence,
    risk,
    policy: {
      name: String(input.policy?.name || 'default'),
      version: String(input.policy?.version || '1'),
      result: policyResult
    },
    action,
    explanation: String(input.explanation || 'Sensitive context matched a configured rule.')
  };

  if (input.ruleId) event.ruleId = String(input.ruleId);
  if (input.matchedValueHash) {
    event.matchedValueHash = String(input.matchedValueHash);
  } else if (input.matchedValue != null && input.matchedValue !== '') {
    event.matchedValueHash = hashMatchedValue(input.matchedValue);
  }
  if (input.chainHash) event.chainHash = String(input.chainHash);
  if (input.contentType) event.contentType = String(input.contentType);
  if (input.metadata) event.metadata = input.metadata;

  return event;
}

function validateContextEvent(event) {
  if (!event || event.schemaVersion !== SCHEMA_VERSION) {
    return { valid: false, errors: ['schemaVersion must be 1.0'] };
  }
  const errors = [];
  if (!SOURCE_VALUES.has(event.source)) errors.push('invalid source');
  if (!ACTIONS.has(event.action)) errors.push('invalid action');
  if (!RESULTS.has(event.policy?.result)) errors.push('invalid policy result');
  if (typeof event.confidence !== 'number' || event.confidence < 0 || event.confidence > 1) {
    errors.push('confidence must be between 0 and 1');
  }
  if (!RISKS.has(event.risk)) errors.push('invalid risk');
  if (!event.application) errors.push('application is required');
  if (!event.explanation) errors.push('explanation is required');
  if (!event.eventId) errors.push('eventId is required');
  if (!event.timestamp) errors.push('timestamp is required');
  if (!event.dataType) errors.push('dataType is required');
  if ('value' in event || 'matchedValue' in event) errors.push('raw sensitive value must not be stored');
  if ('unmaskToken' in event || 'unmaskedAt' in event || 'unmaskedDuration' in event) {
    errors.push('unmask fields are not part of the canonical schema');
  }
  if (event.contentType !== undefined && event.contentType !== null && typeof event.contentType !== 'string') {
    errors.push('contentType must be a string');
  }
  if (event.metadata !== undefined && event.metadata !== null && typeof event.metadata !== 'object') {
    errors.push('metadata must be an object');
  }
  return { valid: errors.length === 0, errors };
}

function confidenceForFinding(finding) {
  if (!finding) return 0.5;
  if (finding.type === 'API_KEY' || String(finding.ruleName || '').startsWith('API_KEY')) return 0.95;
  if (['CARD', 'SSN', 'BANK_ACCOUNT'].includes(finding.type)) return 0.9;
  if (String(finding.type || '').startsWith('CUSTOM:')) return 0.65;
  return 0.85;
}

function createEventFromFinding({ finding, decision, context = {}, riskScore = 0, settings = {} }) {
  const action = decision?.action || 'redact';
  const result = policyResultFromAction(action);
  const app = context.app || context.domain || context.application || 'unknown';
  const severity = finding?.severity || 'medium';
  return createContextEvent({
    source: context.source || 'cli',
    application: app,
    user: context.user || null,
    device: context.device || null,
    contentType: context.contentType || null,
    metadata: context.metadata || null,
    dataType: finding?.type || 'unknown',
    confidence: confidenceForFinding(finding),
    risk: RISKS.has(severity) ? severity : 'medium',
    policy: {
      name: context.policyName || settings.activePolicy || 'default',
      version: settings.policyVersion || '1',
      result
    },
    action: actionFromResult(result),
    explanation: `${finding?.ruleName || finding?.type || 'Rule'} matched in ${app}; policy result was ${result}.`,
    ruleId: finding?.ruleName || finding?.type,
    matchedValue: finding?.value
  });
}

module.exports = {
  SCHEMA_VERSION,
  SOURCE_VALUES,
  ACTIONS,
  RESULTS,
  createContextEvent,
  validateContextEvent,
  createEventFromFinding,
  confidenceForFinding,
  normalizeSource,
  hashMatchedValue
};
