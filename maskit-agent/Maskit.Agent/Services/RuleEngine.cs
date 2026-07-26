using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Maskit.Agent.Services;

/// <summary>
/// Loads detection rules from maskit-core JSON files and compiles regex patterns.
/// Language-independent: same rules as browser extension and MCP server.
/// </summary>
public class RuleEngine
{
    private readonly List<CompiledRule> _rules = new();
    private readonly List<string> _ruleFiles = new();

    public int RuleCount => _rules.Count;
    public IReadOnlyList<CompiledRule> Rules => _rules.AsReadOnly();

    /// <summary>
    /// Load all rule files from a directory (e.g., maskit-core/rules/).
    /// </summary>
    public void LoadRules(string rulesPath)
    {
        if (!Directory.Exists(rulesPath))
            throw new DirectoryNotFoundException($"Rules directory not found: {rulesPath}");

        _rules.Clear();
        _ruleFiles.Clear();

        foreach (var file in Directory.GetFiles(rulesPath, "*.json"))
        {
            LoadRuleFile(file);
            _ruleFiles.Add(file);
        }
    }

    /// <summary>
    /// Load a single rule file.
    /// </summary>
    public void LoadRuleFile(string filePath)
    {
        var json = File.ReadAllText(filePath);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!root.TryGetProperty("rules", out var rulesArray))
            return;

        foreach (var ruleElement in rulesArray.EnumerateArray())
        {
            var id = ruleElement.GetProperty("id").GetString() ?? "";
            var name = ruleElement.GetProperty("name").GetString() ?? "";
            var pattern = ruleElement.GetProperty("pattern").GetString() ?? "";
            var flags = ruleElement.TryGetProperty("flags", out var f) ? f.GetString() ?? "g" : "g";
            var type = ruleElement.TryGetProperty("type", out var t) ? t.GetString() ?? "unknown" : "unknown";
            var severity = ruleElement.TryGetProperty("severity", out var s) ? s.GetString() ?? "medium" : "medium";
            var validator = ruleElement.TryGetProperty("validator", out var v) ? v.GetString() ?? "none" : "none";

            try
            {
                var regexFlags = RegexOptions.None;
                if (flags.Contains("i")) regexFlags |= RegexOptions.IgnoreCase;

                var regex = new Regex(pattern, regexFlags | RegexOptions.Compiled);

                _rules.Add(new CompiledRule
                {
                    Id = id,
                    Name = name,
                    Regex = regex,
                    Type = type,
                    Severity = severity,
                    Validator = validator
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to compile rule {id}: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Scan text against all loaded rules. Returns findings.
    /// </summary>
    public List<Finding> Scan(string text)
    {
        if (string.IsNullOrEmpty(text))
            return new List<Finding>();

        var findings = new List<Finding>();
        var seen = new HashSet<string>();

        foreach (var rule in _rules)
        {
            var matches = rule.Regex.Matches(text);
            foreach (Match match in matches)
            {
                var value = match.Value;
                var key = $"{rule.Id}:{value}";

                if (seen.Contains(key))
                    continue;

                // Validate finding (false-positive guards)
                if (!ValidateFinding(rule, value))
                    continue;

                seen.Add(key);
                findings.Add(new Finding
                {
                    Type = rule.Id,
                    Name = rule.Name,
                    Value = value,
                    Severity = rule.Severity,
                    StartIndex = match.Index,
                    EndIndex = match.Index + match.Length
                });
            }
        }

        return findings;
    }

    private bool ValidateFinding(CompiledRule rule, string value)
    {
        return rule.Validator switch
        {
            "luhn" => LuhnCheck(value),
            "passport" => value.Length >= 8 && Regex.IsMatch(value, @"[A-Z]") && Regex.IsMatch(value, @"\d"),
            "ip_address" => ValidateIpAddress(value),
            "mpesa" => ValidateMpesa(value),
            "bank_account" => value.Length >= 15,
            "api_key" => value.Replace("Bearer ", "").Length >= 20,
            _ => true
        };
    }

    private static bool LuhnCheck(string value)
    {
        var digits = Regex.Replace(value, @"\D", "");
        if (digits.Length < 13 || digits.Length > 19) return false;

        int sum = 0;
        bool alternate = false;
        for (int i = digits.Length - 1; i >= 0; i--)
        {
            int digit = digits[i] - '0';
            if (alternate)
            {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            alternate = !alternate;
        }
        return sum % 10 == 0;
    }

    private static bool ValidateIpAddress(string value)
    {
        var parts = value.Split('.');
        if (parts.Length != 4) return false;
        var numbers = Array.ConvertAll(parts, int.Parse);
        if (numbers.All(n => n < 12)) return false;
        if (numbers[0] == 127 || numbers.All(n => n == 0)) return false;
        return true;
    }

    private static bool ValidateMpesa(string value)
    {
        var upper = value.ToUpperInvariant();
        var letters = 0;
        var digits = 0;
        foreach (var c in upper)
        {
            if (char.IsLetter(c)) letters++;
            if (char.IsDigit(c)) digits++;
        }
        if (letters < 2 || digits < 2) return false;
        if (letters > 8 || digits > 8) return false;
        if (upper.Distinct().Count() == 1) return false;
        return true;
    }
}

/// <summary>
/// A compiled detection rule.
/// </summary>
public class CompiledRule
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public Regex Regex { get; set; } = null!;
    public string Type { get; set; } = "";
    public string Severity { get; set; } = "";
    public string Validator { get; set; } = "";
}

/// <summary>
/// A detection finding.
/// </summary>
public class Finding
{
    public string Type { get; set; } = "";
    public string Name { get; set; } = "";
    public string Value { get; set; } = "";
    public string Severity { get; set; } = "";
    public int StartIndex { get; set; }
    public int EndIndex { get; set; }
}