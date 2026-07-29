const fs = require('fs');
const path = require('path');
const ACTIONS = new Set(['allow', 'redact', 'block']);
const MODES = new Set(['strict', 'loose', 'audit_only']);
const SECURE_DEFAULT = Object.freeze({ version: '1.0', mode: 'strict', actions: { aws_keys: 'block', github_tokens: 'block', customer_data: 'redact', generic_secret: 'block' } });
class PolicyManager {
  constructor(policyPath, options = {}) { this.policyPath = policyPath || path.join(__dirname, 'policy.json'); this.currentPolicy = SECURE_DEFAULT; this.lastLoad = 0; this.subscribers = new Set(); this.onAudit = options.onAudit || (() => {}); this.timer = null; this.watcher = null; this.reload(); this.startWatching(); }
  validate(policy) { if (!policy || typeof policy !== 'object' || typeof policy.version !== 'string') return { ok: false, error: 'Policy version is required' }; if (!MODES.has(policy.mode)) return { ok: false, error: 'Invalid policy mode' }; if (!policy.actions || typeof policy.actions !== 'object' || Array.isArray(policy.actions)) return { ok: false, error: 'Policy actions are required' }; for (const [rule, action] of Object.entries(policy.actions)) if (!/^[A-Za-z0-9_.-]+$/.test(rule) || !ACTIONS.has(action)) return { ok: false, error: `Invalid action for ${rule}` }; return { ok: true }; }
  reload() { try { let next = SECURE_DEFAULT; if (fs.existsSync(this.policyPath)) { const parsed = JSON.parse(fs.readFileSync(this.policyPath, 'utf8')); const validation = this.validate(parsed); if (!validation.ok) throw new Error(validation.error); next = Object.freeze({ version: parsed.version, mode: parsed.mode, actions: { ...parsed.actions } }); } this.currentPolicy = next; this.lastLoad = Date.now(); this.notifySubscribers(); return true; } catch (error) { this.currentPolicy = SECURE_DEFAULT; this.lastLoad = Date.now(); this.onAudit({ type: 'policy_fallback', reason: 'invalid_policy', policyVersion: SECURE_DEFAULT.version }); this.notifySubscribers(); return false; } }
  startWatching() { const dir = path.dirname(this.policyPath); if (!fs.existsSync(dir)) return; this.watcher = fs.watch(dir, { persistent: false }, (eventType, filename) => { if (filename && filename.toString() === path.basename(this.policyPath)) { clearTimeout(this.timer); this.timer = setTimeout(() => this.reload(), 50); } }); }
  getPolicy() { return this.currentPolicy; }
  getVersion() { return this.currentPolicy.version; }
  subscribe(callback) { this.subscribers.add(callback); callback(this.currentPolicy); return () => this.subscribers.delete(callback); }
  notifySubscribers() { for (const callback of this.subscribers) callback(this.currentPolicy); }
  close() { clearTimeout(this.timer); if (this.watcher) this.watcher.close(); this.watcher = null; }
}
module.exports = { PolicyManager, SECURE_DEFAULT, ACTIONS };
