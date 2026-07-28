using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Maskit.Agent.Services;

public sealed class MaskitCoreService
{
    private readonly RuleEngine _rules;
    private readonly PolicyEngine _policy;
    public MaskitCoreService(RuleEngine rules, PolicyEngine policy) { _rules = rules ?? throw new ArgumentNullException(nameof(rules)); _policy = policy ?? throw new ArgumentNullException(nameof(policy)); }
    public CoreScanResult Scan(string text, AppContext appContext, string source = "windows")
    {
        text ??= string.Empty;
        var findings = _rules.Scan(text);
        var decisions = _policy.Evaluate(findings, appContext);
        var score = Math.Min(100, findings.Sum(f => SeverityWeight(f.Severity)));
        var redacted = text;
        foreach (var decision in decisions.Where(d => d.Action != "allow")) redacted = redacted.Replace(decision.Finding.Value, RedactionFor(decision.Finding.Type), StringComparison.Ordinal);
        var normalizedSource = source.StartsWith("windows", StringComparison.OrdinalIgnoreCase) ? "windows" : source;
        var events = decisions.Select(d => new CoreAuditEvent
        {
            SchemaVersion = "1.0",
            EventId = $"evt_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}",
            Timestamp = DateTimeOffset.UtcNow.ToString("O"),
            DataType = d.Finding.Type.StartsWith("API_KEY", StringComparison.Ordinal) ? "API_KEY" : d.Finding.Type,
            Risk = d.Finding.Severity,
            Source = normalizedSource,
            Application = appContext.ProcessName,
            User = null,
            Device = null,
            Action = d.Action == "allow" ? "allowed" : d.Action == "block" ? "blocked" : "redacted",
            Policy = new PolicyInfo { Name = string.IsNullOrWhiteSpace(appContext.ProcessName) ? "default" : appContext.ProcessName, Version = "1", Result = d.Action },
            RuleId = d.Finding.Name,
            Confidence = d.Finding.Type.StartsWith("API_KEY", StringComparison.Ordinal) ? 0.95 : 0.85,
            Explanation = $"{d.Finding.Name} matched in {appContext.ProcessName}; policy result was {d.Action}.",
            MatchedValueHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(d.Finding.Value))).ToLowerInvariant()
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
    public string SchemaVersion { get; init; } = "1.0";
    public string EventId { get; init; } = $"evt_{Guid.NewGuid():N}";
    public string Timestamp { get; init; } = DateTimeOffset.UtcNow.ToString("O");
    public string Source { get; init; } = "windows";
    public string Application { get; init; } = "unknown";
    public object? User { get; init; }
    public object? Device { get; init; }
    public string DataType { get; init; } = "unknown";
    public double Confidence { get; init; }
    public string Risk { get; init; } = "medium";
    public PolicyInfo Policy { get; init; } = new();
    public string Action { get; init; } = "redacted";
    public string Explanation { get; init; } = "Sensitive context matched a configured rule.";
    public string RuleId { get; init; } = "";
    public string MatchedValueHash { get; init; } = "";
}
