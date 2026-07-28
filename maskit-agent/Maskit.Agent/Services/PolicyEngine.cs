using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace Maskit.Agent.Services;

/// <summary>
/// Evaluates policy decisions for detected findings.
/// Same logic as browser extension's selectPolicy/getPolicyAction.
/// </summary>
public class PolicyEngine
{
    private readonly Dictionary<string, Dictionary<string, PolicyAction>> _contexts = new();
    private readonly Dictionary<string, PolicyAction> _defaults = new();
    private bool _killswitchEnabled;
    private string _killswitchMessage = "AI tools are restricted by administrator";

    public PolicyEngine(AgentConfig config)
    {
        LoadDefaults(config);
        LoadContexts(config);
    }

    private void LoadDefaults(AgentConfig config)
    {
        var defaultsPath = Path.Combine(config.RulesPath, "..", "policy", "defaults.json");
        if (!File.Exists(defaultsPath)) return;

        var json = File.ReadAllText(defaultsPath);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.TryGetProperty("defaults", out var defaultsObj))
        {
            foreach (var prop in defaultsObj.EnumerateObject())
            {
                var action = prop.Value.TryGetProperty("action", out var a) ? a.GetString() ?? "redact" : "redact";
                var format = prop.Value.TryGetProperty("format", out var f) ? f.GetString() ?? "tagged" : "tagged";
                _defaults[prop.Name] = new PolicyAction { Action = action, Format = format };
            }
        }
    }

    private void LoadContexts(AgentConfig config)
    {
        var contextsPath = Path.Combine(config.RulesPath, "..", "policy", "contexts.json");
        if (!File.Exists(contextsPath)) return;

        var json = File.ReadAllText(contextsPath);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.TryGetProperty("contexts", out var contextsObj))
        {
            foreach (var contextProp in contextsObj.EnumerateObject())
            {
                var contextActions = new Dictionary<string, PolicyAction>();
                foreach (var typeProp in contextProp.Value.EnumerateObject())
                {
                    var action = typeProp.Value.TryGetProperty("action", out var a) ? a.GetString() ?? "redact" : "redact";
                    contextActions[typeProp.Name] = new PolicyAction { Action = action };
                }
                _contexts[contextProp.Name] = contextActions;
            }
        }
    }

    /// <summary>
    /// Evaluate policy for each finding based on app context.
    /// </summary>
    public List<PolicyDecision> Evaluate(List<Finding> findings, AppContext appContext)
    {
        var decisions = new List<PolicyDecision>();

        // Check killswitch
        if (_killswitchEnabled)
        {
            foreach (var finding in findings)
            {
                decisions.Add(new PolicyDecision
                {
                    Finding = finding,
                    Action = "block",
                    Reason = _killswitchMessage
                });
            }
            return decisions;
        }

        // Select context-appropriate policy
        var policy = SelectPolicy(appContext);

        foreach (var finding in findings)
        {
            // Match Node getPolicyAction: strip CUSTOM: prefix; API_KEY already normalized by RuleEngine
            var typeBase = finding.Type.StartsWith("CUSTOM:", StringComparison.Ordinal)
                ? finding.Type["CUSTOM:".Length..]
                : finding.Type;
            var action = GetAction(policy, typeBase);

            decisions.Add(new PolicyDecision
            {
                Finding = finding,
                Action = action,
                Reason = $"Policy: {action} for {typeBase} in {appContext.ProcessName}"
            });
        }

        return decisions;
    }

    private Dictionary<string, PolicyAction> SelectPolicy(AppContext appContext)
    {
        // Try process name match
        if (appContext.ProcessName != null && _contexts.ContainsKey(appContext.ProcessName))
            return _contexts[appContext.ProcessName];

        // Try category match
        var category = ClassifyApp(appContext.ProcessName ?? "");
        if (_contexts.ContainsKey(category))
            return _contexts[category];

        // Local AI gets trusted policy
        if (appContext.IsLocal && _contexts.ContainsKey("local-ai"))
            return _contexts["local-ai"];

        return _defaults;
    }

    private static string ClassifyApp(string processName)
    {
        return processName.ToUpperInvariant() switch
        {
            "MICROSOFT.COPILOT.EXE" => "copilot.microsoft.com",
            "CHATGPT.EXE" => "chatgpt.com",
            "WINWORD.EXE" => "microsoft-office",
            "EXCEL.EXE" => "microsoft-office",
            "MSTEAMS.EXE" => "microsoft-teams",
            "OLLMAMA.EXE" or "OLLAMA.EXE" => "local-ai",
            "LMSTUDIO.EXE" => "local-ai",
            "CODE.EXE" => "ide",
            _ => "unknown"
        };
    }

    private string GetAction(Dictionary<string, PolicyAction> policy, string type)
    {
        if (policy.TryGetValue(type, out var entry))
            return entry.Action;

        if (_defaults.TryGetValue(type, out var defaultEntry))
            return defaultEntry.Action;

        return "redact"; // Default action
    }

    public void SetKillswitch(bool enabled, string? message = null)
    {
        _killswitchEnabled = enabled;
        if (message != null) _killswitchMessage = message;
    }
}

public class PolicyAction
{
    public string Action { get; set; } = "redact";
    public string Format { get; set; } = "tagged";
}

public class PolicyDecision
{
    public Finding Finding { get; set; } = null!;
    public string Action { get; set; } = "";
    public string Reason { get; set; } = "";
}