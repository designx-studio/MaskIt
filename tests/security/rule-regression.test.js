const fs = require('fs');
const path = require('path');
const { Detector } = require('../../engine/detector');
const ruleLoader = require('../../engine/rule-loader');

describe('Security Hardening: Rule Regression', () => {
  let detector;

  beforeAll(() => {
    // Load default policies and rules
    const rules = ruleLoader.loadRules(path.join(__dirname, '../../maskit-core/rules'));
    detector = new Detector(rules);
  });

  test('detects AWS access keys', () => {
    const text = 'Here is my key: AKIAIOSFODNN7EXAMPLE';
    const result = detector.scan(text);
    expect(result.findings.some(f => f.type === 'aws_key')).toBe(true);
  });

  test('detects generic secrets', () => {
    const text = 'const secret = "sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"';
    const result = detector.scan(text);
    expect(result.findings.some(f => f.type === 'generic_secret')).toBe(true);
  });
  
  test('false positive reduction with context', () => {
      // "sk-1234" is technically matching some weak rules, but lack of context should drop confidence
      const text = 'The item code is sk-1234 for the new product.';
      const result = detector.scan(text);
      
      const secretFindings = result.findings.filter(f => f.type === 'generic_secret' || f.type === 'api_key');
      if (secretFindings.length > 0) {
          expect(secretFindings[0].confidence).toBeLessThan(0.8);
      } else {
          expect(secretFindings.length).toBe(0);
      }
  });
});
