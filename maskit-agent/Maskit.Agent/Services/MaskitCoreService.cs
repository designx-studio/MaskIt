using System;
using System.Collections.Generic;
using System.Linq;

namespace Maskit.Agent.Services;

public sealed class MaskitCoreService
{
    private readonly RuleEngine _rules;
    private readonly PolicyEngine _policy;

    public MaskitCoreService(RuleEngine rules, PolicyEngine policy)
    {
        _rules = rules ?? throw new ArgumentNullException(nameof(rules));
        _policy = policy ?? throw new ArgumentNullException(nameof(policy));
    }

    public CoreScanResult Scan(string text, AppContext appContext, string source = "windows")
    {
        text ??= string.Empty;
        var findings = _rules.Scan(text);
        var decisions = _policy.Evaluate(findings, appContext);
        var score = Math.Min(100, findings.Sum(f => SeverityWeight(f.Severity)));
        var redacted = text;
        foreach (var decision in decisions.Where(d => d.Action != "allow"))
            redacted = redacted.Replace(decision.Finding.Value, RedactionFor(decision.Finding.Type), StringComparison.Ordinal);

        var events = decisions.Select(d => new CoreAuditEvent
        {
            Type = d.Finding.Type,
            Severity = d.Finding.Severity,
            Source = source,
            App = appContext.ProcessName,
            Action = d.Action == "allow" ? "allowed" : d.Action == "block" ? "blocked" : "redacted",
            RiskScore = score,
            MatchedRule = d.Finding.Name,
            PolicyApplied = appContext.ProcessName
        }).ToArray();
        return new CoreScanResult(text, redacted, findings, decisions, score, RiskLevel(score), events);
    }

    public static string RedactionFor(string type) => $"[{type}_REDACTED]";
    public static int SeverityWeight(string severity) => severity switch { "critical" => 50, "high" => 25, "medium" => 10, "low" => 5, _ => 10 };
    public static string RiskLevel(int score) => score >= 50 ? "critical" : score >= 25 ? "high" : score >= 10 ? "medium" : "low";
}

public sealed record CoreScanResult(string Input, string RedactedText, IReadOnlyList<Finding> Findings, IReadOnlyList<PolicyDecision> Decisions, int RiskScore, string RiskLevel, IReadOnlyList<CoreAuditEvent> AuditEvents);
public sealed class CoreAuditEvent
{
    public string Id { get; init; } = "";
    public long Timestamp { get; init; }
    public string Type { get; init; } = "";
    public string Severity { get; init; } = "";
    public string Source { get; init; } = "";
    public string App { get; init; } = "";
    public string Action { get; init; } = "";
    public int RiskScore { get; init; }
    public string MatchedRule { get; init; } = "";
    public string PolicyApplied { get; init; } = "";
}
