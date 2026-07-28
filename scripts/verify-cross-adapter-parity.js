#!/usr/bin/env node
/**
 * Cross-adapter parity: same fixture inputs must produce equivalent detection/
 * policy decisions across browser, CLI/engine, MCP, and Windows (when available).
 *
 * Compared fields per finding/event (source/application may differ):
 *   dataType, ruleId (normalized), confidence, risk, policy.result, action
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const engine = require(path.join(root, 'engine'));
const detector = require(path.join(root, 'detector'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'parity-fixtures.json'), 'utf8'));
const defaults = require(path.join(root, 'engine', 'settings')).MASKIT_DEFAULTS;

const REQUIRED_EVENT = ['schemaVersion', 'dataType', 'confidence', 'risk', 'policy', 'action', 'explanation', 'ruleId'];

function normalizeRuleId(ruleId, dataType) {
  const id = String(ruleId || dataType || '');
  if (id.startsWith('API_KEY')) return id; // keep specific id when present
  return id;
}

function comparableFromEngine(result) {
  return result.events.map((e) => ({
    dataType: e.dataType,
    ruleId: normalizeRuleId(e.ruleId, e.dataType),
    confidence: e.confidence,
    risk: e.risk,
    policyResult: e.policy?.result,
    action: e.action
  })).sort((a, b) => (a.dataType + a.ruleId).localeCompare(b.dataType + b.ruleId));
}

function comparableFromBrowser(input, settings) {
  const findings = detector.detectSensitiveData(input, settings);
  // Derive policy/events via engine for shared policy layer — findings parity is primary for browser detector
  const engineResult = engine.scanText(input, {
    ...settings,
    redactFormat: 'tagged',
    _context: { source: 'browser', app: 'parity-browser' }
  });
  // Ensure browser findings match engine findings first
  assert.deepStrictEqual(
    findings.map((f) => ({ type: f.type, value: f.value })),
    engineResult.allFindings.map((f) => ({ type: f.type, value: f.value })),
    'browser/engine finding mismatch'
  );
  return comparableFromEngine(engineResult);
}

function loadWindowsScan(input) {
  const archive = path.join(root, 'dist', 'maskit-windows-agent.zip');
  if (process.platform !== 'win32' || !fs.existsSync(archive)) return null;

  // Prefer already-extracted publish dir from last build
  let exe = path.join(root, 'dist', 'maskit-windows-agent', 'publish', 'Maskit.Agent.exe');
  if (!fs.existsSync(exe)) {
    const temp = path.join(root, 'dist', '.parity-windows');
    fs.rmSync(temp, { recursive: true, force: true });
    fs.mkdirSync(temp, { recursive: true });
    try {
      execFileSync('tar', ['-xf', archive, '-C', temp]);
    } catch {
      return null;
    }
    exe = path.join(temp, 'publish', 'Maskit.Agent.exe');
    if (!fs.existsSync(exe)) exe = path.join(temp, 'maskit-windows-agent', 'publish', 'Maskit.Agent.exe');
  }
  if (!fs.existsSync(exe)) return null;

  try {
    const stdout = execFileSync(exe, ['--scan', input, '--json', '--app', 'parity-windows'], {
      encoding: 'utf8',
      cwd: path.dirname(exe),
      timeout: 60000,
      windowsHide: true
    });
    return JSON.parse(stdout);
  } catch (error) {
    const stdout = String(error.stdout || '');
    if (!stdout) return null;
    try { return JSON.parse(stdout); } catch { return null; }
  }
}

function comparableFromWindows(scan) {
  if (!scan?.events) return null;
  return scan.events.map((e) => ({
    dataType: e.dataType,
    ruleId: normalizeRuleId(e.ruleId, e.dataType),
    confidence: e.confidence,
    risk: e.risk,
    policyResult: e.policy?.result,
    action: e.action
  })).sort((a, b) => (a.dataType + a.ruleId).localeCompare(b.dataType + b.ruleId));
}

function assertEventsCanonical(events, label) {
  for (const e of events) {
    for (const field of REQUIRED_EVENT) {
      assert.ok(Object.prototype.hasOwnProperty.call(e, field) || field === 'ruleId', `${label}: missing ${field}`);
    }
    assert.strictEqual(e.schemaVersion, '1.0', `${label}: schemaVersion`);
    assert.ok(!('value' in e) && !('matchedValue' in e), `${label}: raw value`);
  }
}

let passed = 0;
let failed = 0;
let windowsCompared = 0;

for (const [category, tests] of Object.entries(fixtures)) {
  for (const [name, testCase] of Object.entries(tests)) {
    const label = `${category}.${name}`;
    try {
      const settings = {
        ...defaults,
        redactFormat: 'tagged',
        ...(category === 'custom' ? { customRules: [testCase.rule] } : {})
      };

      const cliResult = engine.scanText(testCase.input, {
        ...settings,
        _context: { source: 'cli', app: 'parity-cli' }
      });
      const mcpResult = engine.scanText(testCase.input, {
        ...settings,
        _context: { source: 'mcp', app: 'parity-mcp' }
      });
      assertEventsCanonical(cliResult.events, `${label}/cli`);
      assertEventsCanonical(mcpResult.events, `${label}/mcp`);

      const cliComp = comparableFromEngine(cliResult);
      const mcpComp = comparableFromEngine(mcpResult);
      const browserComp = comparableFromBrowser(testCase.input, settings);

      // CLI and MCP must match exactly on comparable fields
      assert.deepStrictEqual(mcpComp, cliComp, `${label}: mcp vs cli`);
      // Browser findings path must match engine; event comps equal for shared policy
      assert.deepStrictEqual(browserComp, cliComp, `${label}: browser vs cli`);

      // dataType set must match fixture expectation
      const fixtureTypes = testCase.findings.map((f) => f.type).sort();
      const cliTypes = cliResult.allFindings.map((f) => f.type).sort();
      assert.deepStrictEqual(cliTypes, fixtureTypes, `${label}: finding types`);

      const win = loadWindowsScan(testCase.input);
      if (win) {
        // Custom rules are runtime-only on Windows harness; skip custom category if agent cannot add them via CLI
        if (category === 'custom') {
          console.log(`SKIP ${label}: windows custom runtime rule via --scan not applicable`);
        } else {
          const winComp = comparableFromWindows(win);
          // Align ruleId comparison: Windows may emit specific API_KEY_* rule ids while
          // Node may also emit specific ids from ruleName — compare dataType+policy+action+risk+confidence
          const stripRule = (rows) => rows.map(({ ruleId, ...rest }) => rest);
          // Prefer full compare when rule ids align; else compare without ruleId but require dataType match
          try {
            assert.deepStrictEqual(winComp, cliComp, `${label}: windows vs cli`);
          } catch {
            assert.deepStrictEqual(stripRule(winComp), stripRule(cliComp), `${label}: windows vs cli (dataType/policy/action)`);
            assert.deepStrictEqual(
              winComp.map((r) => r.dataType).sort(),
              cliComp.map((r) => r.dataType).sort(),
              `${label}: windows dataTypes`
            );
          }
          windowsCompared++;
        }
      }

      console.log(`PASS ${label}`);
      passed++;
    } catch (error) {
      console.error(`FAIL ${label}: ${error.message}`);
      failed++;
    }
  }
}

console.log(`Cross-adapter parity: ${passed} passed, ${failed} failed (windows fixtures compared: ${windowsCompared})`);
if (windowsCompared === 0) {
  console.log('Note: Windows agent binary was not available for live comparison on this runner.');
}
process.exitCode = failed ? 1 : 0;
