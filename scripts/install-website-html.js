#!/usr/bin/env node
/**
 * Install provided full-page HTML into website/index.html and apply pilot claim hygiene.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const promptPath = process.argv[2];
if (!promptPath || !fs.existsSync(promptPath)) {
  console.error('Usage: node scripts/install-website-html.js <prompt-or-html-file>');
  process.exit(1);
}

let t = fs.readFileSync(promptPath, 'utf8');
const start = t.indexOf('<!DOCTYPE html>');
const end = t.lastIndexOf('</html>');
if (start < 0 || end < 0) throw new Error('HTML document not found in source file');
let html = t.slice(start, end + '</html>'.length);

// --- Pilot claim alignment (v2.4.0) ---
html = html.replace(/salted hashes?/gi, 'irreversible SHA-256 hashes');
html = html.replace(/salted hash token/gi, 'irreversible SHA-256 hash');
html = html.replace(/Apply allow, warn, redact, block, or approval policy/gi, 'Apply allow, redact, or block policy');
html = html.replace(/allow, warn, redact, block, or approval/gi, 'allow, redact, or block');
html = html.replace(
  /Protect sensitive information before it reaches AI systems/gi,
  'Protect sensitive information on supported AI surfaces before it is sent or pasted'
);
html = html.replace(
  /before it reaches AI systems/gi,
  'before it reaches supported AI surfaces'
);
html = html.replace(
  /security layer between humans, AI assistants, AI agents, and company data/gi,
  'local security layer for supported AI surfaces, agents, and company data'
);

// Prefer Inter if Dorsis webfonts are not present
html = html.replace(/'Dorsis', 'Inter'/g, "'Inter', 'Dorsis'");
html = html.replace(/"Dorsis", "Inter"/g, '"Inter", "Dorsis"');

// Favicon
if (!/rel=["']icon["']/.test(html)) {
  html = html.replace('</title>', '</title>\n  <link rel="icon" href="favicon.svg" type="image/svg+xml">');
}

// Product links
html = html.replace(/href="#download"/g, 'href="download/index.html"');
html = html.replace(/href="#docs"/g, 'href="../docs/pilot/README.md"');
html = html.replace(/href="Get Maskit"/gi, 'href="download/index.html"');

// Enterprise form: open mail client (existing site pattern) if present
if (html.includes("entForm") && !html.includes('mailto:support@designx.co.ke')) {
  html = html.replace(
    /document\.getElementById\('entForm'\)\.addEventListener\('submit', function\(e\) \{[\s\S]*?\}\);/,
    `document.getElementById('entForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = (document.getElementById('entEmail') || {}).value || '';
        const msg = document.getElementById('entMsg');
        if (msg) msg.textContent = email ? 'Opening your email client…' : '';
        const body = encodeURIComponent('Design partner inquiry from: ' + email);
        location.href = 'mailto:support@designx.co.ke?subject=Maskit design partner inquiry&body=' + body;
      });`
  );
}

// Note about fonts
const fontNote = `
  <!-- Fonts: Martel + Karma via Google Fonts. Dorsis is optional self-host under website/fonts/ (falls back to Inter). -->
`;
if (!html.includes('Dorsis is optional')) {
  html = html.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', fontNote + '  <link rel="preconnect" href="https://fonts.googleapis.com">');
}

const out = path.join(root, 'website', 'index.html');
fs.writeFileSync(out, html);
console.log('Wrote', out, '(' + html.length + ' bytes)');

// Sanity scan
const warns = [];
if (/salted hash/i.test(html) && !/unsalted/i.test(html)) warns.push('salted hash');
if (/SOC\s*2 certified/i.test(html)) warns.push('SOC2 cert claim');
if (/all AI apps/i.test(html) && !/not all AI/i.test(html)) warns.push('all AI apps');
if (warns.length) console.warn('WARN residual claims:', warns.join(', '));
else console.log('Claim hygiene: OK');
