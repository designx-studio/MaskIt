const assert = require('assert');
const engine = require('../engine');
const { renderReportHtml } = require('../engine/report-generator');
const policy = { version: '2.0', mode: 'strict', actions: { aws_keys: 'block', github_tokens: 'redact', customer_data: 'allow' } };
engine.setLocalPolicy(policy);
try {
  const result = engine.scanText("const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456';");
  assert.ok(result.policyDecisions.some(d => d.action === 'redact'), 'GitHub token policy must redact');
  assert.ok(result.redactedText.includes('***') || result.redactedText.includes('REDACTED'), 'GitHub token must be sanitized');
  const secret = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456';
  const html = renderReportHtml({ generatedAt: new Date().toISOString(), policy, securityEvents: { total: 1 }, risk: { level: 'high', score: 25 }, evidence: { observed: ['GitHub token pattern detected'], unknown: ['Whether token is active'] } }, result.events);
  assert.ok(html.includes('GitHub'));
  assert.ok(!html.includes(secret));
  assert.ok(!html.includes('matchedValue'));
} finally { engine.setLocalPolicy(null); }
console.log('report-generation.test.js passed!');
