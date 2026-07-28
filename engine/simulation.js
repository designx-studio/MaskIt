function simulatePolicy(engine, text, settings = {}) {
  if (!engine || typeof engine.scanText !== "function") throw new TypeError("engine.scanText is required");
  const result = engine.scanText(text, settings);
  return {
    mode: "simulation",
    mutated: false,
    findings: result.findings,
    allFindings: result.allFindings,
    policyDecisions: result.policyDecisions,
    redactedText: result.redactedText,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    matchedRules: result.matchedRules,
    explanations: result.allFindings.map((finding) => ({ type: finding.type, ruleName: finding.ruleName || finding.type, confidence: finding.confidence ?? 0.5, explanation: finding.explanation || `Matched ${finding.ruleName || finding.type}.` }))
  };
}
module.exports = { simulatePolicy };
