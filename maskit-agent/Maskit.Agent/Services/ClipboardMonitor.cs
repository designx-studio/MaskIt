using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace Maskit.Agent.Services;

/// <summary>
/// Monitors Windows clipboard for sensitive data.
/// When text is copied, scans it and replaces with redacted version if needed.
/// </summary>
public class ClipboardMonitor : IDisposable
{
    private readonly RuleEngine _ruleEngine;
    private readonly PolicyEngine _policyEngine;
    private readonly AuditLogger _auditLogger;
    private readonly ForegroundDetector _foregroundDetector;
    private readonly nint _hwnd;
    private bool _isMonitoring;
    private string? _lastClipboardText;
    private CancellationTokenSource? _cts;

    // Windows API constants
    private const int WM_CLIPBOARDUPDATE = 0x031D;
    private const int CF_UNICODETEXT = 13;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern nint FindWindow(string? lpClassName, string? lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool AddClipboardFormatListener(nint hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RemoveClipboardFormatListener(nint hwnd);

    [DllImport("user32.dll")]
    private static extern bool OpenClipboard(nint hWndNewOwner);

    [DllImport("user32.dll")]
    private static extern bool CloseClipboard();

    [DllImport("user32.dll")]
    private static extern nint GetClipboardData(uint uFormat);

    [DllImport("kernel32.dll")]
    private static extern nint GlobalLock(hMem);

    [DllImport("kernel32.dll")]
    private static extern bool GlobalUnlock(hMem);

    [DllImport("user32.dll")]
    private static extern bool SetClipboardData(uint uFormat, nint hMem);

    [DllImport("kernel32.dll")]
    private static extern nint GlobalAlloc(uint uFlags, nuint dwBytes);

    [DllImport("kernel32.dll")]
    private static extern nint GlobalFree(hMem);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern nint lstrcpy(nint lpString1, string lpString2);

    private delegate nint WndProcDelegate(nint hWnd, uint msg, nint wParam, nint lParam);
    private WndProcDelegate? _wndProcDelegate;
    private GCHandle _wndProcHandle;

    public bool IsMonitoring => _isMonitoring;
    public event Action<string, int>? OnRedaction; // (app, count)

    public ClipboardMonitor(RuleEngine ruleEngine, PolicyEngine policyEngine,
        AuditLogger auditLogger, ForegroundDetector foregroundDetector)
    {
        _ruleEngine = ruleEngine;
        _policyEngine = policyEngine;
        _auditLogger = auditLogger;
        _foregroundDetector = foregroundDetector;

        // Create hidden window for clipboard messages
        _wndProcDelegate = WndProc;
        _wndProcHandle = GCHandle.Alloc(_wndProcDelegate);

        _hwnd = FindWindow(null, null); // We'll create a message-only window
        // For simplicity, use a timer-based approach instead of window messages
    }

    /// <summary>
    /// Start monitoring clipboard using polling (simpler than window messages for MVP).
    /// </summary>
    public void Start()
    {
        if (_isMonitoring) return;
        _isMonitoring = true;
        _cts = new CancellationTokenSource();

        Task.Run(async () =>
        {
            while (!_cts.Token.IsCancellationRequested)
            {
                try
                {
                    CheckClipboard();
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Clipboard check error: {ex.Message}");
                }

                await Task.Delay(500, _cts.Token); // Check every 500ms
            }
        }, _cts.Token);
    }

    public void Stop()
    {
        _isMonitoring = false;
        _cts?.Cancel();
        _cts?.Dispose();
        _cts = null;
    }

    private void CheckClipboard()
    {
        if (!NativeMethods.OpenClipboard(IntPtr.Zero))
            return;

        try
        {
            var hData = NativeMethods.GetClipboardData(CF_UNICODETEXT);
            if (hData == IntPtr.Zero) return;

            var ptr = NativeMethods.GlobalLock(hData);
            if (ptr == IntPtr.Zero) return;

            try
            {
                var text = Marshal.PtrToStringUni(ptr);
                if (string.IsNullOrEmpty(text)) return;
                if (text == _lastClipboardText) return; // Same text, skip

                _lastClipboardText = text;
                ProcessClipboardText(text);
            }
            finally
            {
                NativeMethods.GlobalUnlock(hData);
            }
        }
        finally
        {
            NativeMethods.CloseClipboard();
        }
    }

    private void ProcessClipboardText(string text)
    {
        // Scan with rule engine
        var findings = _ruleEngine.Scan(text);
        if (findings.Count == 0) return;

        // Get foreground app context
        var appContext = _foregroundDetector.GetForegroundContext();

        // Evaluate policy for each finding
        var decisions = _policyEngine.Evaluate(findings, appContext);

        // Check if any action is needed
        bool needsRedaction = false;
        foreach (var decision in decisions)
        {
            if (decision.Action == "redact" || decision.Action == "block")
            {
                needsRedaction = true;
                break;
            }
        }

        if (!needsRedaction)
        {
            // All allowed — log and exit
            foreach (var decision in decisions)
            {
                _auditLogger.LogEvent(new AuditEvent
                {
                    Type = decision.Finding.Type,
                    Severity = decision.Finding.Severity,
                    Source = "clipboard",
                    App = appContext.ProcessName,
                    Action = "allowed",
                    RiskScore = CalculateRiskScore(findings),
                    MatchedRule = decision.Finding.Type,
                    PolicyApplied = appContext.ProcessName,
                    AppContext = new AppContextInfo
                    {
                        ProcessName = appContext.ProcessName,
                        AiDetected = appContext.AiDetected,
                        AiConfidence = appContext.AiConfidence,
                        IsLocal = appContext.IsLocal
                    }
                });
            }
            return;
        }

        // Redact the text
        var redacted = text;
        foreach (var decision in decisions)
        {
            if (decision.Action == "redact")
            {
                redacted = redacted.Replace(decision.Finding.Value, $"[{decision.Finding.Type}_REDACTED]");
            }
            else if (decision.Action == "block")
            {
                redacted = redacted.Replace(decision.Finding.Value, "[BLOCKED]");
            }
        }

        // Replace clipboard with redacted version
        SetClipboardText(redacted);

        // Audit log
        foreach (var decision in decisions)
        {
            if (decision.Action != "allowed")
            {
                _auditLogger.LogEvent(new AuditEvent
                {
                    Type = decision.Finding.Type,
                    Severity = decision.Finding.Severity,
                    Source = "clipboard",
                    App = appContext.ProcessName,
                    Action = decision.Action == "redact" ? "redacted" : "blocked",
                    RiskScore = CalculateRiskScore(findings),
                    MatchedRule = decision.Finding.Type,
                    PolicyApplied = appContext.ProcessName,
                    AppContext = new AppContextInfo
                    {
                        ProcessName = appContext.ProcessName,
                        AiDetected = appContext.AiDetected,
                        AiConfidence = appContext.AiConfidence,
                        IsLocal = appContext.IsLocal
                    }
                });
            }
        }

        OnRedaction?.Invoke(appContext.ProcessName, decisions.Count);
    }

    private static void SetClipboardText(string text)
    {
        if (!NativeMethods.OpenClipboard(IntPtr.Zero))
            return;

        try
        {
            NativeMethods.EmptyClipboard();
            var hGlobal = NativeMethods.GlobalAlloc(0x0042, (nuint)((text.Length + 1) * 2)); // GMEM_MOVEABLE | GMEM_ZEROINIT
            if (hGlobal == IntPtr.Zero) return;

            var ptr = NativeMethods.GlobalLock(hGlobal);
            if (ptr == IntPtr.Zero)
            {
                NativeMethods.GlobalFree(hGlobal);
                return;
            }

            Marshal.Copy(text.ToCharArray(), 0, ptr, text.Length);
            Marshal.WriteInt16(ptr + text.Length * 2, 0); // Null terminator
            NativeMethods.GlobalUnlock(hGlobal);
            NativeMethods.SetClipboardData(CF_UNICODETEXT, hGlobal);
        }
        finally
        {
            NativeMethods.CloseClipboard();
        }
    }

    private static int CalculateRiskScore(System.Collections.Generic.List<Finding> findings)
    {
        int score = 0;
        foreach (var f in findings)
        {
            score += f.Severity switch
            {
                "critical" => 50,
                "high" => 25,
                "medium" => 10,
                "low" => 5,
                _ => 10
            };
        }
        return Math.Min(100, score);
    }

    public void Dispose()
    {
        Stop();
        _wndProcHandle.Free();
    }
}

/// <summary>
/// P/Invoke helpers for Windows clipboard API.
/// </summary>
internal static class NativeMethods
{
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool OpenClipboard(IntPtr hWndNewOwner);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseClipboard();

    [DllImport("user32.dll")]
    public static extern bool EmptyClipboard();

    [DllImport("user32.dll")]
    public static extern IntPtr GetClipboardData(uint uFormat);

    [DllImport("user32.dll")]
    public static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GlobalAlloc(uint uFlags, nuint dwBytes);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GlobalFree(IntPtr hMem);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GlobalLock(IntPtr hMem);

    [DllImport("kernel32.dll")]
    public static extern bool GlobalUnlock(IntPtr hMem);
}