const fs = require('fs');
const path = require('path');

function inventoryPath(config) { return path.join(config.getConfigDir(), 'ai_inventory.json'); }
function readInventory(config) {
  try {
    const file = inventoryPath(config);
    if (!fs.existsSync(file)) return [];
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(value) ? value.filter(isSafeEntry) : [];
  } catch { return []; }
}
function isSafeEntry(entry) {
  return entry && typeof entry.tool === 'string' && typeof entry.surface === 'string' && typeof entry.status === 'string' && typeof entry.firstSeen === 'string' && typeof entry.lastSeen === 'string' && !('content' in entry) && !('prompt' in entry) && !('secret' in entry);
}
function writeInventory(entries, config) {
  const safe = (entries || []).filter(isSafeEntry).map(({ tool, surface, status, firstSeen, lastSeen }) => ({ tool, surface, status, firstSeen, lastSeen }));
  const file = inventoryPath(config);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(safe, null, 2) + '\n', 'utf8');
  return file;
}
function recordTool(entry, config) {
  const now = new Date().toISOString();
  const current = readInventory(config);
  const existing = current.find(item => item.tool === entry.tool && item.surface === entry.surface);
  if (existing) { existing.lastSeen = now; if (entry.status) existing.status = entry.status; }
  else current.push({ tool: entry.tool, surface: entry.surface, status: entry.status || 'unknown', firstSeen: entry.firstSeen || now, lastSeen: now });
  return writeInventory(current, config);
}
module.exports = { inventoryPath, readInventory, writeInventory, recordTool };
