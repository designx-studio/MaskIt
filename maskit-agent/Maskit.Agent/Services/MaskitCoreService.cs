using System;
using System.Collections.Generic;
using System.Linq;

namespace Maskit.Agent.Services;

/// <summary>
/// Windows adapter over the shared MaskIt Core rule and policy artifacts.
/// The agent owns clipboard I/O only. Detection, policy, scoring and redaction
/// are derived from the same JSON rule/policy contract used by other adapters.
/// </summary>
public sealed class MaskitCoreService
{
    private readonly RuleEngine _rules;
    private readonly PolicyEngine _policy;

    public MaskitCoreService(RuleEngine rules, PolicyEngine policy)
    {
        _rules = rules ?? throw new ArgumentNullException(nameof(rules));
        _policy = policy ?? throw new ArgumentNullException(nameof(policy));
    }

    public CoreScanResult Scan(string text, AppContext appContext)
    {
        var findings = _rules.Scan(text);
        var decisions = _policy.Evaluate(findings, appContext);
        var score = Math.Min(100, findings.Sum(f => SeverityWeight(f.Severity)));
        var redacted = text;

        foreach (var decision in decisions)
        {
            if (decision.Action == "allow") continue;
            var replacement = decision.Action == "block"
                ? $"[{decision.Finding.Type}_REDACTED]"
                : $"[{decision.Finding.Type}_REDACTED]";
            redacted = redacted.Replace(decision.Finding.Value, replacement, StringComparison.Ordinal);
        }

        return new CoreScanResult(text, redacted, findings, decisions, score, RiskLevel(score));
    }

    public static int SeverityWeight(string severity) => severity switch
    {
        "critical" => 50,
        "high" => 25,
        "medium" => 10,
        "low" => 5,
        _ => 10
    };

    public static string RiskLevel(int score) => score >= 50 ? "critical" : score >= 25 ? "high" : score >= 10 ? "medium" : "low";
}

public sealed record CoreScanResult(
    string Input,
    string RedactedText,
    IReadOnlyList<Finding> Findings,
    IReadOnlyList<PolicyDecision> Decisions,
    int RiskScore,
    string RiskLevel);
