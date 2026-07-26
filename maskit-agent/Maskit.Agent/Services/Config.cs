using System;
using System.IO;
using System.Text.Json;

namespace Maskit.Agent.Services;

/// <summary>
/// Agent configuration. Same JSON schema as MCP server config.
/// </summary>
public class AgentConfig
{
    public bool Enabled { get; set; } = true;
    public bool ClipboardMonitoring { get; set; } = true;
    public bool Notifications { get; set; } = true;
    public string RulesPath { get; set; } = "";
    public string AuditLogPath { get; set; } = "";
    public string ConfigPath { get; set; } = "";
    public int ClipboardCheckIntervalMs { get; set; } = 500;

    /// <summary>
    /// Load config from standard location (%APPDATA%/Maskit/config.json).
    /// Creates defaults if not found.
    /// </summary>
    public static AgentConfig Load()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var configDir = Path.Combine(appData, "Maskit");
        var configPath = Path.Combine(configDir, "config.json");

        // Default paths relative to executable
        var exeDir = AppContext.BaseDirectory;
        var coreRulesPath = Path.Combine(exeDir, "..", "..", "maskit-core", "rules");

        var config = new AgentConfig
        {
            ConfigPath = configPath,
            RulesPath = coreRulesPath,
            AuditLogPath = Path.Combine(appData, "Maskit", "audit.jsonl")
        };

        if (File.Exists(configPath))
        {
            try
            {
                var json = File.ReadAllText(configPath);
                var loaded = JsonSerializer.Deserialize<AgentConfig>(json);
                if (loaded != null)
                {
                    config.Enabled = loaded.Enabled;
                    config.ClipboardMonitoring = loaded.ClipboardMonitoring;
                    config.Notifications = loaded.Notifications;
                    config.ClipboardCheckIntervalMs = loaded.ClipboardCheckIntervalMs;
                    if (!string.IsNullOrEmpty(loaded.RulesPath)) config.RulesPath = loaded.RulesPath;
                    if (!string.IsNullOrEmpty(loaded.AuditLogPath)) config.AuditLogPath = loaded.AuditLogPath;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to load config: {ex.Message}");
            }
        }
        else
        {
            // Create default config
            Directory.CreateDirectory(configDir);
            Save(config);
        }

        return config;
    }

    public static void Save(AgentConfig config)
    {
        try
        {
            var dir = Path.GetDirectoryName(config.ConfigPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(config.ConfigPath, json);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to save config: {ex.Message}");
        }
    }
}