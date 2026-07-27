using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Maskit.Agent.Services;

/// <summary>
/// Structured audit event logging.
/// Same schema as browser extension — unified reporting across all adapters.
/// </summary>
public class AuditLogger
{
    private readonly string _logPath;
    private readonly object _lock = new();
    private readonly long _maxLogSize = 10 * 1024 * 1024; // 10MB max
    private int _eventCount;

    public int EventCount => _eventCount;

    public AuditLogger(string logPath)
    {
        _logPath = logPath;
        var dir = Path.GetDirectoryName(logPath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        // Count existing events
        if (File.Exists(_logPath))
        {
            _eventCount = CountLines(_logPath);
        }
    }

    public void LogEvent(AuditEvent auditEvent)
    {
        auditEvent.Id = $"evt_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
        auditEvent.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        lock (_lock)
        {
            try
            {
                // Compute chain hash from previous event
                var previousHash = GetLastChainHash();
                auditEvent.ChainHash = ComputeChainHash(previousHash, auditEvent.Id, auditEvent.Timestamp);

                // Rotate log if too large
                if (File.Exists(_logPath) && new FileInfo(_logPath).Length > _maxLogSize)
                {
                    var backupPath = _logPath + ".1";
                    if (File.Exists(backupPath)) File.Delete(backupPath);
                    File.Move(_logPath, backupPath);
                }

                var json = JsonSerializer.Serialize(auditEvent, new JsonSerializerOptions
                {
                    WriteIndented = false,
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
                });

                File.AppendAllText(_logPath, json + Environment.NewLine);
                _eventCount++;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Audit log write error: {ex.Message}");
            }
        }
    }

    private string? GetLastChainHash()
    {
        if (!File.Exists(_logPath)) return null;

        try
        {
            // Read last non-empty line
            string? lastLine = null;
            foreach (var line in File.ReadLines(_logPath))
            {
                if (!string.IsNullOrWhiteSpace(line)) lastLine = line;
            }

            if (string.IsNullOrEmpty(lastLine)) return null;

            var lastEvent = JsonSerializer.Deserialize<AuditEvent>(lastLine);
            return lastEvent?.ChainHash;
        }
        catch
        {
            return null;
        }
    }

    private static string ComputeChainHash(string? previousHash, string eventId, long timestamp)
    {
        var input = (previousHash ?? "0") + eventId + timestamp;
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public AuditEvent[] GetRecentEvents(int count = 100)
    {
        lock (_lock)
        {
            if (!File.Exists(_logPath)) return Array.Empty<AuditEvent>();

            var lines = File.ReadAllLines(_logPath);
            var events = new List<AuditEvent>();
            var start = Math.Max(0, lines.Length - count);

            for (int i = start; i < lines.Length; i++)
            {
                if (string.IsNullOrWhiteSpace(lines[i])) continue;
                try
                {
                    var evt = JsonSerializer.Deserialize<AuditEvent>(lines[i]);
                    if (evt != null) events.Add(evt);
                }
                catch { }
            }

            return events.ToArray();
        }
    }

    private static int CountLines(string path)
    {
        int count = 0;
        using var reader = new StreamReader(path);
        while (reader.ReadLine() != null) count++;
        return count;
    }
}

/// <summary>
/// Structured audit event — same schema as browser extension.
/// </summary>
public class AuditEvent
{
    public string Id { get; set; } = "";
    public long Timestamp { get; set; }
    public string Type { get; set; } = "";
    public string Severity { get; set; } = "";
    public string Source { get; set; } = "";
    public string App { get; set; } = "";
    public string Action { get; set; } = "";
    public int RiskScore { get; set; }
    public string MatchedRule { get; set; } = "";
    public string PolicyApplied { get; set; } = "";
    public string? UnmaskToken { get; set; }
    public long? UnmaskedAt { get; set; }
    public long? UnmaskedDuration { get; set; }
    public AppContextInfo? AppContext { get; set; }
    public string? ChainHash { get; set; }
}

/// <summary>
/// App context info for audit events (Windows agent only).
/// </summary>
public class AppContextInfo
{
    public string? ProcessName { get; set; }
    public bool AiDetected { get; set; }
    public float AiConfidence { get; set; }
    public bool IsLocal { get; set; }
}