const crypto = require('crypto');
const SCHEMA_VERSION = '1.0';
const SOURCE_VALUES = new Set(['browser','windows','cli','mcp','ci','gateway']);
const ACTIONS = new Set(['allowed','warned','redacted','blocked','approval_required']);
const RESULTS = new Set(['allow','warn','redact','block','require_approval']);
function createContextEvent(input = {}) {
  const policyResult = input.policy?.result || 'redact';
  const action = input.action || ({allow:'allowed',warn:'warned',redact:'redacted',block:'blocked',require_approval:'approval_required'}[policyResult] || 'redacted');
  return {
    schemaVersion: SCHEMA_VERSION,
    eventId: input.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    timestamp: input.timestamp || new Date().toISOString(),
    source: SOURCE_VALUES.has(input.source) ? input.source : 'cli',
    application: String(input.application || 'unknown'),
    user: input.user || null,
    device: input.device || null,
    dataType: String(input.dataType || 'unknown'),
    confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 0.5))),
    risk: ['low','medium','high','critical'].includes(input.risk) ? input.risk : 'medium',
    policy: { name: String(input.policy?.name || 'default'), version: String(input.policy?.version || '1'), result: RESULTS.has(policyResult) ? policyResult : 'redact' },
    action: ACTIONS.has(action) ? action : 'redacted',
    explanation: String(input.explanation || 'Sensitive context matched a configured rule.'),
    ...(input.ruleId ? {ruleId:String(input.ruleId)} : {}),
    ...(input.matchedValue ? {matchedValueHash: crypto.createHash('sha256').update(String(input.matchedValue)).digest('hex')} : input.matchedValueHash ? {matchedValueHash:String(input.matchedValueHash)} : {})
  };
}
function validateContextEvent(event) {
  if (!event || event.schemaVersion !== SCHEMA_VERSION) return {valid:false, errors:['schemaVersion must be 1.0']};
  const errors=[]; if(!SOURCE_VALUES.has(event.source)) errors.push('invalid source'); if(!ACTIONS.has(event.action)) errors.push('invalid action'); if(!RESULTS.has(event.policy?.result)) errors.push('invalid policy result'); if(typeof event.confidence !== 'number' || event.confidence<0 || event.confidence>1) errors.push('confidence must be between 0 and 1'); if(!event.application) errors.push('application is required'); if(!event.explanation) errors.push('explanation is required'); return {valid:errors.length===0, errors};
}
module.exports={SCHEMA_VERSION,createContextEvent,validateContextEvent};