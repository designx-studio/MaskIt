using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Maskit.Agent.Services;

public class AuditLogger
{
    private readonly string _logPath;
    private readonly object _lock = new();
    private readonly long _maxLogSize = 10 * 1024 * 1024;
    private int _eventCount;
    public int EventCount => _eventCount;
    public AuditLogger(string logPath)
    {
        _logPath = logPath;
        var dir = Path.GetDirectoryName(logPath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
        if (File.Exists(_logPath)) _eventCount = CountLines(_logPath);
    }
    public void LogEvent(AuditEvent auditEvent)
    {
        auditEvent.EventId = $"evt_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
        auditEvent.Timestamp = DateTimeOffset.UtcNow.ToString("O");
        lock (_lock)
        {
            try
            {
                var previousHash = GetLastChainHash();
                auditEvent.ChainHash = ComputeChainHash(previousHash, auditEvent.EventId, auditEvent.Timestamp);
                if (File.Exists(_logPath) && new FileInfo(_logPath).Length > _maxLogSize)
                {
                    var backupPath = _logPath + ".1";
                    if (File.Exists(backupPath)) File.Delete(backupPath);
                    File.Move(_logPath, backupPath);
                }
                var json = JsonSerializer.Serialize(auditEvent, new JsonSerializerOptions { WriteIndented = false, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull });
                File.AppendAllText(_logPath, json + Environment.NewLine);
                _eventCount++;
            }
            catch (Exception ex) { Console.Error.WriteLine($"Audit log write error: {ex.Message}"); }
        }
    }
    private string? GetLastChainHash()
    {
        if (!File.Exists(_logPath)) return null;
        try
        {
            string? lastLine = null;
            foreach (var line in File.ReadLines(_logPath)) if (!string.IsNullOrWhiteSpace(line)) lastLine = line;
            return string.IsNullOrEmpty(lastLine) ? null : JsonSerializer.Deserialize<AuditEvent>(lastLine)?.ChainHash;
        }
        catch { return null; }
    }
    private static string ComputeChainHash(string? previousHash, string eventId, string timestamp)
    {
        using var sha256 = SHA256.Create();
        return Convert.ToHexString(sha256.ComputeHash(Encoding.UTF8.GetBytes((previousHash ?? "0") + eventId + timestamp))).ToLowerInvariant();
    }
    public AuditEvent[] GetRecentEvents(int count = 100)
    {
        lock (_lock)
        {
            if (!File.Exists(_logPath)) return Array.Empty<AuditEvent>();
            var lines = File.ReadAllLines(_logPath);
            var events = new System.Collections.Generic.List<AuditEvent>();
            var start = Math.Max(0, lines.Length - count);
            for (var i = start; i < lines.Length; i++) if (!string.IsNullOrWhiteSpace(lines[i])) try { var evt = JsonSerializer.Deserialize<AuditEvent>(lines[i]); if (evt != null) events.Add(evt); } catch { }
            return events.ToArray();
        }
    }
    private static int CountLines(string path) { var count = 0; using var reader = new StreamReader(path); while (reader.ReadLine() != null) count++; return count; }
}

public class AuditEvent
{
    public string SchemaVersion { get; set; } = "1.0";
    public string EventId { get; set; } = "";
    public string Timestamp { get; set; } = "";
    public string Source { get; set; } = "windows";
    public string Application { get; set; } = "unknown";
    public object? User { get; set; }
    public object? Device { get; set; }
    public string DataType { get; set; } = "unknown";
    public double Confidence { get; set; } = 0.85;
    public string Risk { get; set; } = "medium";
    public PolicyInfo Policy { get; set; } = new();
    public string Action { get; set; } = "redacted";
    public string Explanation { get; set; } = "Sensitive context matched a configured rule.";
    public string? RuleId { get; set; }
    public string? MatchedValueHash { get; set; }
    public string? ChainHash { get; set; }
    [JsonIgnore] public AppContextInfo? AppContext { get; set; }
}
public class PolicyInfo { public string Name { get; set; } = "default"; public string Version { get; set; } = "1"; public string Result { get; set; } = "redact"; }
public class AppContextInfo { public string? ProcessName { get; set; } public bool AiDetected { get; set; } public float AiConfidence { get; set; } public bool IsLocal { get; set; } }
