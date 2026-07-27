using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Maskit.Agent.Services;

public class RuleEngine
{
    private readonly List<CompiledRule> _rules = new();
    public int RuleCount => _rules.Count;
    public IReadOnlyList<CompiledRule> Rules => _rules.AsReadOnly();

    public void LoadRules(string rulesPath)
    {
        if (!Directory.Exists(rulesPath)) throw new DirectoryNotFoundException($"Rules directory not found: {rulesPath}");
        _rules.Clear();
        foreach (var file in Directory.GetFiles(rulesPath, "*.json")) LoadRuleFile(file);
    }

    public void LoadRuleFile(string filePath)
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(filePath));
        if (!doc.RootElement.TryGetProperty("rules", out var rulesArray)) return;
        foreach (var ruleElement in rulesArray.EnumerateArray())
        {
            var id = ruleElement.GetProperty("id").GetString() ?? "";
            var name = ruleElement.GetProperty("name").GetString() ?? "";
            var pattern = ruleElement.GetProperty("pattern").GetString() ?? "";
            var flags = ruleElement.TryGetProperty("flags", out var f) ? f.GetString() ?? "g" : "g";
            var type = ruleElement.TryGetProperty("type", out var t) ? t.GetString() ?? "unknown" : "unknown";
            var severity = ruleElement.TryGetProperty("severity", out var s) ? s.GetString() ?? "medium" : "medium";
            var validator = ruleElement.TryGetProperty("validator", out var v) ? v.GetString() ?? "none" : "none";
            TryAddRule(id, name, pattern, flags, type, severity, validator);
        }
    }

    public void AddRuntimeRule(string id, string pattern, string name = "Custom rule", string severity = "medium")
        => TryAddRule("CUSTOM:" + id, name, pattern, "gi", "custom", severity, "none");

    private void TryAddRule(string id, string name, string pattern, string flags, string type, string severity, string validator)
    {
        try
        {
            var options = RegexOptions.Compiled | (flags.Contains("i", StringComparison.OrdinalIgnoreCase) ? RegexOptions.IgnoreCase : RegexOptions.None);
            _rules.Add(new CompiledRule { Id = id, Name = name, Regex = new Regex(pattern, options), Type = type, Severity = severity, Validator = validator });
        }
        catch (Exception ex) { Console.Error.WriteLine($"Failed to compile rule {id}: {ex.Message}"); }
    }

    public List<Finding> Scan(string text)
    {
        if (string.IsNullOrEmpty(text)) return new List<Finding>();
        var findings = new List<Finding>();
        var seen = new HashSet<string>();
        foreach (var rule in _rules)
        foreach (Match match in rule.Regex.Matches(text))
        {
            if (!ValidateFinding(rule, match.Value)) continue;
            var key = $"{rule.Id}:{match.Value}";
            if (!seen.Add(key)) continue;
            findings.Add(new Finding { Type = rule.Id, Name = rule.Name, Value = match.Value, Severity = rule.Severity, StartIndex = match.Index, EndIndex = match.Index + match.Length });
        }
        return findings;
    }

    private static bool ValidateFinding(CompiledRule rule, string value) => rule.Validator switch
    {
        "luhn" => LuhnCheck(value),
        "passport" => value.Length >= 8 && Regex.IsMatch(value, @"[A-Z]") && Regex.IsMatch(value, @"\d"),
        "ip_address" => ValidateIpAddress(value),
        "mpesa" => ValidateMpesa(value),
        "bank_account" => value.Length >= 15,
        "api_key" => value.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Length >= 20,
        _ => true
    };

    private static bool LuhnCheck(string value)
    {
        var digits = Regex.Replace(value, @"\D", "");
        if (digits.Length < 13 || digits.Length > 19) return false;
        var sum = 0; var alternate = false;
        for (var i = digits.Length - 1; i >= 0; i--) { var digit = digits[i] - '0'; if (alternate) { digit *= 2; if (digit > 9) digit -= 9; } sum += digit; alternate = !alternate; }
        return sum % 10 == 0;
    }

    private static bool ValidateIpAddress(string value)
    {
        var parts = value.Split('.');
        if (parts.Length != 4 || !parts.All(part => int.TryParse(part, out _))) return false;
        var numbers = parts.Select(int.Parse).ToArray();
        return numbers.All(number => number >= 0 && number <= 255) && numbers.Any(number => number >= 12) && numbers[0] != 127 && numbers.Any(number => number != 0);
    }

    private static bool ValidateMpesa(string value)
    {
        var upper = value.ToUpperInvariant(); var letters = upper.Count(char.IsLetter); var digits = upper.Count(char.IsDigit);
        return letters >= 2 && digits >= 2 && letters <= 8 && digits <= 8 && upper.Distinct().Count() > 1;
    }
}

public class CompiledRule { public string Id { get; set; } = ""; public string Name { get; set; } = ""; public Regex Regex { get; set; } = null!; public string Type { get; set; } = ""; public string Severity { get; set; } = ""; public string Validator { get; set; } = ""; }
public class Finding { public string Type { get; set; } = ""; public string Name { get; set; } = ""; public string Value { get; set; } = ""; public string Severity { get; set; } = ""; public int StartIndex { get; set; } public int EndIndex { get; set; } }
