using System;
using System.IO;
using System.Text.Json;

namespace Maskit.Agent.Services;

public class AgentConfig
{
    public bool Enabled { get; set; } = true;
    public bool ClipboardMonitoring { get; set; } = true;
    public bool Notifications { get; set; } = true;
    public string RulesPath { get; set; } = "";
    public string AuditLogPath { get; set; } = "";
    public string ConfigPath { get; set; } = "";

    public static AgentConfig Load()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var configDir = Path.Combine(appData, "Maskit");
        var configPath = Path.Combine(configDir, "config.json");
        var exeDir = AppContext.BaseDirectory;
        var packagedRules = Path.Combine(exeDir, "maskit-core", "rules");
        var repoRules = Path.GetFullPath(Path.Combine(exeDir, "..", "..", "..", "..", "maskit-core", "rules"));
        var rulesPath = Directory.Exists(packagedRules) ? packagedRules : repoRules;
        var config = new AgentConfig { ConfigPath = configPath, RulesPath = rulesPath, AuditLogPath = Path.Combine(configDir, "audit.jsonl") };
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
                    if (!string.IsNullOrWhiteSpace(loaded.RulesPath)) config.RulesPath = loaded.RulesPath;
                    if (!string.IsNullOrWhiteSpace(loaded.AuditLogPath)) config.AuditLogPath = loaded.AuditLogPath;
                }
            }
            catch (Exception ex) { Console.Error.WriteLine($"Failed to load config: {ex.Message}"); }
        }
        else { Directory.CreateDirectory(configDir); Save(config); }
        return config;
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
