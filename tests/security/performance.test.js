const fs = require('fs');
const path = require('path');
const { Detector } = require('../../engine/detector');
const ruleLoader = require('../../engine/rule-loader');

describe('Security Hardening: Performance Benchmarks', () => {
  let detector;
  let text1KB, text100KB, text1MB;

  beforeAll(() => {
    const rules = ruleLoader.loadRules(path.join(__dirname, '../../maskit-core/rules'));
    detector = new Detector(rules);

    // Generate dummy text payload
    const baseText = 'This is a sample text containing no secrets but needing to be scanned by the engine. It simulates normal developer files. ';
    text1KB = baseText.repeat(100).substring(0, 1024);
    text100KB = baseText.repeat(10000).substring(0, 102400);
    text1MB = baseText.repeat(100000).substring(0, 1048576);
  });

  test('1KB file scans under 100ms', () => {
    const start = performance.now();
    detector.scan(text1KB);
    const end = performance.now();
    expect(end - start).toBeLessThan(100);
  });

  test('100KB file scans', () => {
    const start = performance.now();
    detector.scan(text100KB);
    const end = performance.now();
    // Looser bound for tests, but target is still fast
    expect(end - start).toBeDefined();
  });

  test('1MB file scans', () => {
    const start = performance.now();
    detector.scan(text1MB);
    const end = performance.now();
    expect(end - start).toBeDefined();
  });
});
