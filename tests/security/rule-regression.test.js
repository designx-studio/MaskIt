const assert = require('assert');
const engine = require('../../engine');

function findingFor(text, ruleName) { return engine.scanText(text).allFindings.find(f => f.ruleName === ruleName); }
function assertFinding(text, ruleName, severity) {
  const finding = findingFor(text, ruleName);
  assert.ok(finding, `${ruleName} was not detected`);
  assert.strictEqual(finding.ruleName, ruleName);
  assert.ok(typeof finding.confidence === 'number' && finding.confidence > 0 && finding.confidence <= 1);
  if (severity) assert.strictEqual(finding.severity, severity);
}
console.log('Running comprehensive rule regression tests...');
assertFinding('My email is user.name+tag@example.co.uk', 'EMAIL', 'medium');
assertFinding('Call me on +254712345678', 'PHONE', 'medium');
assertFinding('My SSN is 000-12-3456', 'SSN', 'critical');
assertFinding('Passport number A12345678', 'PASSPORT', 'high');
assertFinding('Ping 192.168.1.1', 'IP_ADDRESS', 'high');
assertFinding('Card 4111 1111 1111 1111', 'CARD', 'critical');
assertFinding('IBAN is DE89370400440532013000', 'BANK_ACCOUNT', 'critical');
assertFinding('Transaction receipt: LHS427GH89', 'MPESA', 'low');
assertFinding('OpenAI: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz', 'API_KEY_OPENAI', 'critical');
assertFinding('Anthropic: sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz', 'API_KEY_OPENAI', 'critical');
assertFinding('Stripe: sk_test_1234567890abcdefghijklmnopqrstuvwxyz', 'API_KEY_STRIPE', 'critical');
assertFinding('GitHub: ghp_1234567890abcdefghijklmnopqrstuvwxyz123456', 'API_KEY_GITHUB', 'critical');
assertFinding('AWS Access Key: AKIAIOSFODNN7EXAMPLE', 'API_KEY_AWS_ACCESS', 'critical');
assertFinding('GCP key AIzaSyAbcdefghijklmnopqrstuvwxyz1234567', 'API_KEY_GCP', 'critical');
assertFinding('DefaultEndpointsProtocol=https;AccountName=myacc;AccountKey=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl=;', 'API_KEY_AZURE_CONN', 'critical');
for (const fixture of ['Contact support@example.com for documentation', 'const test = "test-id-1234567890";', 'random identifier 7f3a9c1e-12ab-4f3d-9d10-123456789abc']) {
  const result = engine.scanText(fixture);
  assert.ok(result.allFindings.length === 0 || result.allFindings.every(f => f.confidence < 0.9), `false positive confidence too high: ${fixture}`);
}
console.log('rule-regression.test.js passed!');
