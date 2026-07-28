using System;
using System.IO;
using System.Text.Json;

namespace Maskit.Agent.Services;

/// <summary>
/// Agent configuration. Prefer packaged maskit-core next to the executable;
/// never require a repository checkout at runtime.
/// </summary>
public class AgentConfig
{
    public bool Enabled { get; set; } = true;
    public bool ClipboardMonitoring { get; set; } = true;
    public bool Notifications { get; set; } = true;
    public string RulesPath { get; set; } = "";
    public string AuditLogPath { get; set; } = "";
    public string ConfigPath { get; set; } = "";

    public static AgentConfig Load(string? baseDirectory = null)
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var configDir = Path.Combine(appData, "Maskit");
        var configPath = Path.Combine(configDir, "config.json");
        var exeDir = baseDirectory ?? System.AppContext.BaseDirectory;
        var packagedRules = Path.GetFullPath(Path.Combine(exeDir, "maskit-core", "rules"));
        // Dev fallback only: walk up from base dir for monorepo checkouts
        var repoRules = FindRepoRules(exeDir);
        var rulesPath = Directory.Exists(packagedRules) ? packagedRules : (repoRules ?? packagedRules);
        var config = new AgentConfig
        {
            ConfigPath = configPath,
            RulesPath = rulesPath,
            AuditLogPath = Path.Combine(configDir, "audit.jsonl")
        };
        if (File.Exists(configPath))
        {
            try
            {
                var loaded = JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(configPath));
                if (loaded != null)
                {
                    config.Enabled = loaded.Enabled;
                    config.ClipboardMonitoring = loaded.ClipboardMonitoring;
                    config.Notifications = loaded.Notifications;
                    // Packaged rules always win when present so release installs cannot
                    // accidentally point at a developer path from a previous config.
                    if (!Directory.Exists(packagedRules) && !string.IsNullOrWhiteSpace(loaded.RulesPath) && Directory.Exists(loaded.RulesPath))
                        config.RulesPath = loaded.RulesPath;
                    if (!string.IsNullOrWhiteSpace(loaded.AuditLogPath))
                        config.AuditLogPath = loaded.AuditLogPath;
                }
            }
            catch (Exception ex) { Console.Error.WriteLine($"Failed to load config: {ex.Message}"); }
        }
        else
        {
            Directory.CreateDirectory(configDir);
            Save(config);
        }
        return config;
    }

    private static string? FindRepoRules(string start)
    {
        try
        {
            var dir = new DirectoryInfo(start);
            while (dir != null)
            {
                var candidate = Path.Combine(dir.FullName, "maskit-core", "rules");
                if (Directory.Exists(candidate) && File.Exists(Path.Combine(candidate, "pii.json")))
                    return candidate;
                dir = dir.Parent;
            }
        }
        catch { /* ignore */ }
        return null;
    }

    public static void Save(AgentConfig config)
    {
        try
        {
            var dir = Path.GetDirectoryName(config.ConfigPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
            File.WriteAllText(config.ConfigPath, JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception ex) { Console.Error.WriteLine($"Failed to save config: {ex.Message}"); }
    }
}

/// <summary>Compatibility alias used by Program and parity harness.</summary>
public static class Config
{
    public static AgentConfig Load(string? baseDirectory = null) => AgentConfig.Load(baseDirectory);
}
