/**
 * Browser-safe canonical context event builder.
 * Mirrors engine/context.js — no Node APIs.
 * Raw values are never stored; only SHA-256 hashes.
 */
(function (root) {
  const SCHEMA_VERSION = "1.0";
  const SOURCE_VALUES = { browser: 1, windows: 1, cli: 1, mcp: 1, ci: 1, gateway: 1 };
  const ACTIONS = { allowed: 1, warned: 1, redacted: 1, blocked: 1, approval_required: 1 };
  const RESULTS = { allow: 1, warn: 1, redact: 1, block: 1, require_approval: 1 };
  const RISKS = { low: 1, medium: 1, high: 1, critical: 1 };

  // Minimal synchronous SHA-256 for matched-value hashing in content scripts
  function sha256Hex(message) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    function ch(x, y, z) { return (x & y) ^ (~x & z); }
    function maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }
    function sigma0(x) { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
    function sigma1(x) { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
    function gamma0(x) { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3); }
    function gamma1(x) { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10); }
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const bytes = [];
    const str = String(message);
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) { bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f)); }
      else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    }
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((bitLen / Math.pow(2, i * 8)) & 0xff);
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    for (let offset = 0; offset < bytes.length; offset += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) {
        const j = offset + i * 4;
        w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i++) w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) >>> 0;
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + w[i]) >>> 0;
        const t2 = (sigma0(a) + maj(a, b, c)) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H = H.map((v, i) => (v + [a, b, c, d, e, f, g, h][i]) >>> 0);
    }
    return H.map((v) => ("00000000" + v.toString(16)).slice(-8)).join("");
  }

  function normalizeSource(source) {
    const raw = String(source || "browser").toLowerCase();
    if (SOURCE_VALUES[raw]) return raw;
    if (raw.startsWith("browser") || ["paste", "copy", "typing", "selection"].indexOf(raw) >= 0) return "browser";
    if (raw.startsWith("windows")) return "windows";
    if (raw.startsWith("mcp")) return "mcp";
    if (raw.startsWith("cli")) return "cli";
    return "browser";
  }

  function policyResultFromAction(action) {
    if (action === "allow" || action === "allowed") return "allow";
    if (action === "warn" || action === "warned") return "warn";
    if (action === "block" || action === "blocked") return "block";
    if (action === "require_approval" || action === "approval_required") return "require_approval";
    return "redact";
  }

  function actionFromResult(result) {
    return ({ allow: "allowed", warn: "warned", redact: "redacted", block: "blocked", require_approval: "approval_required" })[result] || "redacted";
  }

  function createContextEvent(input) {
    input = input || {};
    const policyResult = RESULTS[input.policy && input.policy.result]
      ? input.policy.result
      : policyResultFromAction(input.action || "redact");
    const action = ACTIONS[input.action] ? input.action : actionFromResult(policyResult);
    const risk = RISKS[input.risk] ? input.risk : "medium";
    const confidence = Math.max(0, Math.min(1, Number(input.confidence != null ? input.confidence : 0.5)));
    const event = {
      schemaVersion: SCHEMA_VERSION,
      eventId: input.eventId || ("evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8)),
      timestamp: input.timestamp || new Date().toISOString(),
      source: normalizeSource(input.source),
      application: String(input.application || "unknown"),
      user: input.user || null,
      device: input.device || null,
      dataType: String(input.dataType || "unknown"),
      confidence: confidence,
      risk: risk,
      policy: {
        name: String((input.policy && input.policy.name) || "default"),
        version: String((input.policy && input.policy.version) || "1"),
        result: policyResult
      },
      action: action,
      explanation: String(input.explanation || "Sensitive context matched a configured rule.")
    };
    if (input.ruleId) event.ruleId = String(input.ruleId);
    if (input.matchedValueHash) event.matchedValueHash = String(input.matchedValueHash);
    else if (input.matchedValue != null && input.matchedValue !== "") event.matchedValueHash = sha256Hex(String(input.matchedValue));
    return event;
  }

  function confidenceForFinding(finding) {
    if (!finding) return 0.5;
    if (finding.type === "API_KEY" || String(finding.ruleName || "").indexOf("API_KEY") === 0) return 0.95;
    if (["CARD", "SSN", "BANK_ACCOUNT"].indexOf(finding.type) >= 0) return 0.9;
    if (String(finding.type || "").indexOf("CUSTOM:") === 0) return 0.65;
    return 0.85;
  }

  function createEventFromFinding(opts) {
    opts = opts || {};
    const finding = opts.finding || {};
    const decision = opts.decision || {};
    const context = opts.context || {};
    const settings = opts.settings || {};
    const action = decision.action || "redact";
    const result = policyResultFromAction(action);
    const app = context.app || context.domain || context.application || "unknown";
    const severity = finding.severity || "medium";
    return createContextEvent({
      source: context.source || "browser",
      application: app,
      user: context.user || null,
      device: context.device || null,
      dataType: finding.type || "unknown",
      confidence: confidenceForFinding(finding),
      risk: RISKS[severity] ? severity : "medium",
      policy: {
        name: context.policyName || settings.activePolicy || "default",
        version: settings.policyVersion || "1",
        result: result
      },
      action: actionFromResult(result),
      explanation: (finding.ruleName || finding.type || "Rule") + " matched in " + app + "; policy result was " + result + ".",
      ruleId: finding.ruleName || finding.type,
      matchedValue: finding.value
    });
  }

  function validateContextEvent(event) {
    if (!event || event.schemaVersion !== SCHEMA_VERSION) return { valid: false, errors: ["schemaVersion must be 1.0"] };
    const errors = [];
    if (!SOURCE_VALUES[event.source]) errors.push("invalid source");
    if (!ACTIONS[event.action]) errors.push("invalid action");
    if (!event.policy || !RESULTS[event.policy.result]) errors.push("invalid policy result");
    if (typeof event.confidence !== "number" || event.confidence < 0 || event.confidence > 1) errors.push("confidence must be between 0 and 1");
    if (!event.application) errors.push("application is required");
    if (!event.explanation) errors.push("explanation is required");
    if ("value" in event || "matchedValue" in event) errors.push("raw sensitive value must not be stored");
    if ("unmaskToken" in event || "unmaskedAt" in event || "unmaskedDuration" in event) errors.push("unmask fields are not part of the canonical schema");
    return { valid: errors.length === 0, errors: errors };
  }

  const api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    createContextEvent: createContextEvent,
    createEventFromFinding: createEventFromFinding,
    validateContextEvent: validateContextEvent,
    sha256Hex: sha256Hex
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MaskitContext = api;
  root.createContextEvent = createContextEvent;
  root.createEventFromFinding = createEventFromFinding;
  root.validateContextEvent = validateContextEvent;
})(typeof globalThis !== "undefined" ? globalThis : this);
