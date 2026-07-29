const fs = require('fs');
const path = require('path');

class PolicyManager {
    constructor(policyPath) {
        this.policyPath = policyPath || path.join(__dirname, '../policy.json');
        this.currentPolicy = null;
        this.lastLoad = 0;
        this.subscribers = [];
        
        // Initial load
        this.reload();
        
        // Watch for file changes for hot reloading
        if (fs.existsSync(this.policyPath)) {
            fs.watch(this.policyPath, (eventType) => {
                if (eventType === 'change') {
                    this.reload();
                }
            });
        }
    }

    reload() {
        try {
            if (fs.existsSync(this.policyPath)) {
                const raw = fs.readFileSync(this.policyPath, 'utf8');
                const parsed = JSON.parse(raw);
                if (this.validate(parsed)) {
                    this.currentPolicy = parsed;
                    this.lastLoad = Date.now();
                    this.notifySubscribers();
                    console.log(`[PolicyManager] Loaded policy v${this.currentPolicy.version}`);
                }
            } else {
                // Default fallback policy
                this.currentPolicy = {
                    version: "1.0",
                    mode: "strict",
                    actions: {
                        aws_keys: "block",
                        github_tokens: "block",
                        generic_secret: "redact"
                    }
                };
            }
        } catch (error) {
            console.error(`[PolicyManager] Failed to reload policy: ${error.message}`);
        }
    }

    validate(policy) {
        // Schema validation
        if (!policy.version || typeof policy.version !== 'string') return false;
        if (!policy.mode || !['strict', 'warn', 'audit_only'].includes(policy.mode)) return false;
        if (!policy.actions || typeof policy.actions !== 'object') return false;
        return true;
    }

    getPolicy() {
        return this.currentPolicy;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        callback(this.currentPolicy);
    }

    notifySubscribers() {
        for (const cb of this.subscribers) {
            cb(this.currentPolicy);
        }
    }
}

module.exports = { PolicyManager };
