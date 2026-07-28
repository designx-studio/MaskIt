#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
const requiredIds = ['tl-dot','tl-label','toggle-wrap','pause-btn','exclude-btn','site-status','stat-total','stat-paste','stat-copy','stat-typing'];
const missing = requiredIds.filter(id => !popupHtml.includes(`id="${id}"`));
if (missing.length) throw new Error(`Popup missing required IDs: ${missing.join(', ')}`);
if (!popupJs.includes('getElementById("tl-dot")') || !popupJs.includes('getElementById("tl-label")')) throw new Error('Popup status rendering is not wired');
if (popupJs.includes('dot.className') && !popupJs.includes('if (dot)')) throw new Error('Popup status rendering is not null-safe');
console.log(`Browser surface validation passed: ${requiredIds.length} popup controls present.`);
