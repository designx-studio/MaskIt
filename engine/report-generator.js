const escapeHtml = value => String(value ?? '').replace(/[&<>\"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[ch]));

function normalizeEvent(event) {
  return {
    timestamp: event.timestamp || null,
    source: event.source || 'unknown',
    application: event.application || 'unknown',
    dataType: event.dataType || 'unknown',
    ruleId: event.ruleId || 'unknown',
    action: event.action || 'unknown',
    risk: event.risk || 'unknown',
    confidence: typeof event.confidence === 'number' ? event.confidence : null,
    policy: event.policy && typeof event.policy === 'object' ? { name: event.policy.name || 'default', version: event.policy.version || 'unknown' } : { name: 'default', version: 'unknown' }
  };
}

function eventRows(events) {
  return events.slice(0, 10).map((raw, index) => {
    const event = normalizeEvent(raw);
    const when = event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown time';
    const action = event.action.toUpperCase();
    const status = ['blocked', 'redacted', 'allowed'].includes(event.action) ? 'Protected' : 'Review';
    return `<article class="event"><div class="event-index">${index + 1}</div><div><h3>${escapeHtml(event.dataType)} detected</h3><p class="event-meta">${escapeHtml(when)} · ${escapeHtml(event.source)} · ${escapeHtml(event.application)}</p><p>Rule: <code>${escapeHtml(event.ruleId)}</code> · Action: <strong>${escapeHtml(action)}</strong> · Status: <strong>${escapeHtml(status)}</strong></p></div></article>`;
  }).join('') || '<p class="muted">No security events were recorded in this report window.</p>';
}

function renderReportHtml(report, events = []) {
  const risk = report.risk || { level: 'unknown', score: 0, reasons: [] };
  const inventory = Array.isArray(report.aiInventory) ? report.aiInventory : [];
  const safeEvents = events.map(normalizeEvent);
  const counts = report.securityEvents || { total: safeEvents.length };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MaskIt AI Security Report</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#17303a;background:#f5f2e9;margin:0}.wrap{max-width:920px;margin:0 auto;padding:48px 24px}.mast{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #17303a;padding-bottom:24px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a44b28}.risk{padding:18px 22px;border:2px solid #a44b28;min-width:150px}.risk b{display:block;font-size:32px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:28px 0}.stat,.event{background:#fffdf7;border:1px solid #d9d2c2;padding:18px}.stat b{display:block;font-size:26px}.event{display:flex;gap:16px;margin:12px 0}.event-index{font:700 20px ui-monospace,monospace;color:#a44b28}.event h3{margin:0}.event-meta,.muted{color:#63747a}.checks{display:grid;gap:8px}.checks div{padding:12px;border-bottom:1px solid #d9d2c2}code{font-family:ui-monospace,monospace}@media(max-width:680px){.mast{display:block}.risk{margin-top:20px}.grid{grid-template-columns:1fr}}</style></head><body><main class="wrap"><header class="mast"><div><p class="eyebrow">MaskIt AI Security Report</p><h1>One-machine protection summary</h1><p>Generated ${escapeHtml(report.generatedAt || 'unknown')} · Policy ${escapeHtml(report.policy?.version || 'unknown')} · ${escapeHtml(report.policy?.mode || 'unknown')} mode</p></div><div class="risk"><span>Risk level</span><b>${escapeHtml(String(risk.level).toUpperCase())}</b><span>${escapeHtml(risk.score)}/100</span></div></header><section class="grid"><div class="stat"><span>Active AI tools</span><b>${escapeHtml(inventory.length)}</b></div><div class="stat"><span>Security events</span><b>${escapeHtml(counts.total || 0)}</b></div><div class="stat"><span>Policy status</span><b>${escapeHtml(report.policy?.status || 'unknown')}</b></div></section><section><h2>AI tools detected</h2>${inventory.length ? inventory.map(item => `<div class="stat"><strong>${escapeHtml(item.tool)}</strong><br>${escapeHtml(item.surface)} · ${escapeHtml(item.status)}</div>`).join('') : '<p class="muted">No AI inventory entries recorded.</p>'}</section><section><h2>Security events, last 7 days</h2>${eventRows(safeEvents)}</section><section><h2>What we know</h2><div class="checks">${(report.evidence?.observed || []).map(item => `<div>✓ ${escapeHtml(item)}</div>`).join('') || '<div>✓ Report generated from available local evidence</div>'}</div><h2>What we do not know</h2><div class="checks">${(report.evidence?.unknown || []).map(item => `<div>⚠ ${escapeHtml(item)}</div>`).join('')}</div></section><footer><p class="muted">Metadata only. No prompts, files, clipboard content, or raw secrets are included in this report.</p></footer></main></body></html>`;
}

module.exports = { renderReportHtml, normalizeEvent };
