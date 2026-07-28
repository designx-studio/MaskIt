#!/usr/bin/env node
/**
 * Pilot claim hygiene: fail if customer/marketing docs reintroduce disallowed claims.
 * Scans website/ and docs/ (excludes historical reports that document past issues).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const roots = [
  path.join(root, 'website'),
  path.join(root, 'docs')
];

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.git',
  'MaskIt'
]);

// Historical / engineering notes may mention banned phrases when explaining removals
const SKIP_FILES = new Set([
  path.join(root, 'docs', 'production-readiness-report.md'),
  path.join(root, 'docs', 'stabilization-report.md'),
  path.join(root, 'docs', 'release-readiness.md'),
  path.join(root, 'docs', 'release-readiness-v3.md'),
  path.join(root, 'docs', 'session-changes-2026-07-28.md'),
  path.join(root, 'docs', 'enterprise-pilot-readiness.md'),
  path.join(root, 'docs', 'engineering-stabilization.md'),
  path.join(root, 'docs', 'claims-evidence-matrix.md'), // may quote banned claims as "do not claim"
  path.join(root, 'docs', 'pilot', '05-security-whitepaper.md'),
  path.join(root, 'docs', 'pilot', '01-pilot-overview.md'),
  path.join(root, 'docs', 'pilot', 'pilot-scope.md'),
  path.join(root, 'docs', 'pilot', '06-data-handling-statement.md'),
  path.join(root, 'docs', 'context-model.md') // documents unsalted explicitly
]);

const rules = [
  {
    id: 'salted-hash',
    re: /salted\s+hash/i,
    message: 'Use "irreversible SHA-256 hash" wording; canonical hashes are unsalted in v2.4.0'
  },
  {
    id: 'soc2-claim',
    re: /\bSOC\s*2\b(?![^.]*\b(not|no|without|does not|do not|never)\b)/i,
    // simpler: ban positive certification claims
    test(text) {
      if (!/\bSOC\s*2\b/i.test(text)) return false;
      // allow explicit non-claims
      if (/not\s+(a\s+)?SOC\s*2|no\s+SOC\s*2|does not claim SOC|without SOC|SOC 2 \/ ISO|SOC 2, ISO|not claimed|certification claim/i.test(text)) {
        return false;
      }
      // if file says "No" near SOC2
      if (/no\s+false\s+SOC|MaskIt does not claim SOC|not claim SOC 2/i.test(text)) return false;
      return /SOC\s*2\s+(certified|certification|compliant|attestation)/i.test(text)
        || /we are SOC\s*2/i.test(text);
    },
    message: 'Do not claim SOC 2 certification'
  },
  {
    id: 'iso-claim',
    re: /ISO\s*27001\s+(certified|certification|compliant)/i,
    message: 'Do not claim ISO 27001 certification'
  },
  {
    id: 'all-ai-apps',
    test(text) {
      if (!/\b(all|every)\s+AI\s+(apps?|applications?|tools?|sites?)\b/i.test(text)) return false;
      // Allow explicit non-claims / scoping language
      if (/not\s+(claim\s+)?coverage of all AI|does\s+\*\*not\*\*\s+claim coverage of all AI|not all AI|does not cover all AI|not\s+all\s+AI\s+apps/i.test(text)) {
        return false;
      }
      // Fail only positive universality claims
      return /\b(protects?|covers?|supports?|works with)\s+(all|every)\s+AI\b/i.test(text)
        || /\b(all|every)\s+AI\s+(apps?|applications?|tools?|sites?)\b/i.test(text)
          && !/not|never|except|limited|listed|supported/i.test(text);
    },
    message: 'Do not claim coverage of all AI apps; scope to supported surfaces'
  },
  {
    id: 'full-dlp',
    test(text) {
      if (!/\b(full|complete|enterprise)\s+DLP\b/i.test(text)) return false;
      // allow non-claims
      if (/not\s+(a\s+)?(claim of\s+)?(full|complete|generic)?\s*DLP|not becoming a generic Data Loss Prevention|not full enterprise DLP|Not full DLP|not a claim of full DLP|not full DLP/i.test(text)) {
        return false;
      }
      return /\b(is|provides?|offers?|delivers?)\s+(full|complete|enterprise)\s+DLP\b/i.test(text);
    },
    message: 'Do not claim full/complete enterprise DLP'
  }
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(md|html|txt)$/i.test(name)) out.push(full);
  }
  return out;
}

const files = roots.flatMap((r) => walk(r));
let failed = 0;
const findings = [];

for (const file of files) {
  if (SKIP_FILES.has(file)) continue;
  // skip evidence verification report templates that mention commands only
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of rules) {
    let hit = false;
    if (typeof rule.test === 'function') hit = rule.test(text);
    else hit = rule.re.test(text);
    if (hit) {
      // For regex-only rules re-check allowlist phrases
      if (rule.id === 'salted-hash' && /unsalted|not salted|do not claim.*salted|Replace "salted/i.test(text) && !/salted hashes instead/i.test(text)) {
        // still fail if positive marketing remains
        if (!/salted hash/i.test(text.replace(/unsalted[^.]*\./gi, '').replace(/not salted[^.]*\./gi, ''))) {
          continue;
        }
      }
      failed++;
      findings.push({ file: path.relative(root, file), rule: rule.id, message: rule.message });
    }
  }
}

if (findings.length) {
  console.error('Doc consistency failures:\n');
  for (const f of findings) {
    console.error(`  [${f.rule}] ${f.file}: ${f.message}`);
  }
  console.error(`\nFAIL: ${findings.length} issue(s).`);
  process.exit(1);
}

console.log(`PASS: Doc consistency checks OK (${files.length} files scanned).`);
process.exit(0);
