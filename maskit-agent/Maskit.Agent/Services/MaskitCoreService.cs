using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Maskit.Agent.Services;

/// <summary>
/// Shared scan boundary for the Windows agent. Emits only canonical audit events
/// (schema 1.0). Raw sensitive values are never placed on events — only SHA-256 hashes.
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

    public CoreScanResult Scan(string text, AppContext appContext, string source = "windows")
    {
        text ??= string.Empty;
        var findings = _rules.Scan(text);
        var decisions = _policy.Evaluate(findings, appContext);
        var score = Math.Min(100, findings.Sum(f => SeverityWeight(f.Severity)));
        var redacted = text;
        foreach (var decision in decisions.Where(d => d.Action != "allow"))
        {
            redacted = redacted.Replace(decision.Finding.Value, RedactionFor(decision.Finding.Type), StringComparison.Ordinal);
        }

        var normalizedSource = NormalizeSource(source);
        var application = string.IsNullOrWhiteSpace(appContext.ProcessName) ? "unknown" : appContext.ProcessName;
        var events = decisions.Select(d =>
        {
            var result = d.Action is "allow" or "block" or "warn" or "require_approval" ? d.Action : "redact";
            var action = result switch
            {
                "allow" => "allowed",
                "block" => "blocked",
                "warn" => "warned",
                "require_approval" => "approval_required",
                _ => "redacted"
            };
            var dataType = d.Finding.Type;
            var ruleId = string.IsNullOrWhiteSpace(d.Finding.Name) ? dataType : d.Finding.Name;
            return new CoreAuditEvent
            {
                SchemaVersion = "1.0",
                EventId = $"evt_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}",
                Timestamp = DateTimeOffset.UtcNow.ToString("O"),
                Source = normalizedSource,
                Application = application,
                User = null,
                Device = null,
                DataType = dataType,
                Confidence = ConfidenceFor(dataType, ruleId),
                Risk = NormalizeRisk(d.Finding.Severity),
                Policy = new PolicyInfo
                {
                    Name = "default",
                    Version = "1",
                    Result = result
                },
                Action = action,
                Explanation = $"{ruleId} matched in {application}; policy result was {result}.",
                RuleId = ruleId,
                MatchedValueHash = HashValue(d.Finding.Value)
            };
        }).ToArray();

        return new CoreScanResult(text, redacted, findings, decisions, score, RiskLevel(score), events);
    }

    public static string NormalizeSource(string source)
    {
        var raw = (source ?? "windows").ToLowerInvariant();
        if (raw.StartsWith("windows", StringComparison.Ordinal)) return "windows";
        if (raw is "browser" or "cli" or "mcp" or "ci" or "gateway") return raw;
        return "windows";
    }

    public static double ConfidenceFor(string dataType, string ruleId)
    {
        if (dataType == "API_KEY" || ruleId.StartsWith("API_KEY", StringComparison.Ordinal)) return 0.95;
        if (dataType is "CARD" or "SSN" or "BANK_ACCOUNT") return 0.9;
        if (dataType.StartsWith("CUSTOM:", StringComparison.Ordinal)) return 0.65;
        return 0.85;
    }

    public static string NormalizeRisk(string severity) => severity switch
    {
        "critical" or "high" or "medium" or "low" => severity,
        _ => "medium"
    };

    public static string RedactionFor(string type) => $"[{type}_REDACTED]";
    public static int SeverityWeight(string severity) => severity switch
    {
        "critical" => 50,
        "high" => 25,
        "medium" => 10,
        "low" => 5,
        _ => 10
    };
    public static string RiskLevel(int score) => score >= 50 ? "critical" : score >= 25 ? "high" : score >= 10 ? "medium" : "low";

    public static string HashValue(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value ?? ""))).ToLowerInvariant();
}

public sealed record CoreScanResult(
    string Input,
    string RedactedText,
    IReadOnlyList<Finding> Findings,
    IReadOnlyList<PolicyDecision> Decisions,
    int RiskScore,
    string RiskLevel,
    IReadOnlyList<CoreAuditEvent> AuditEvents);

/// <summary>Canonical context event (maskit-core audit schema 1.0). No raw values.</summary>
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
    public string? ContentType { get; init; }
    public object? Metadata { get; init; }
    public string RuleId { get; init; } = "";
    public string MatchedValueHash { get; init; } = "";
}
