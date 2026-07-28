#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist', 'maskit-chrome.zip');
if (!fs.existsSync(dist)) throw new Error('Build the packaged Chrome extension before running E2E');
let playwright;
try { playwright = require('playwright'); } catch { throw new Error('Packaged Chromium E2E requires the playwright dependency in CI'); }
const extract = path.join(root, '.e2e-maskit-chrome');
fs.rmSync(extract, { recursive: true, force: true });
fs.mkdirSync(extract, { recursive: true });
execFileSync('unzip', ['-q', dist, '-d', extract]);
(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('chrome-extension://' + 'invalid');
  await browser.close();
  console.log('Packaged Chromium E2E harness loaded.');
})().catch((error) => { console.error(error); process.exit(1); });
