using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace Maskit.Agent.Services;

/// <summary>
/// Monitors Windows clipboard for sensitive data.
/// When text is copied, scans it and replaces with redacted version if needed.
/// Uses AddClipboardFormatListener for event-driven clipboard notifications.
/// </summary>
public class ClipboardMonitor : IDisposable
{
    private readonly RuleEngine _ruleEngine;
    private readonly PolicyEngine _policyEngine;
    private readonly AuditLogger _auditLogger;
    private readonly ForegroundDetector _foregroundDetector;
    private bool _isMonitoring;
    private string? _lastClipboardText;
    private CancellationTokenSource? _cts;

    // Windows API constants
    private const int WM_CLIPBOARDUPDATE = 0x031D;
    private const int CF_UNICODETEXT = 13;
    private const uint GMEM_MOVEABLE = 0x0002;
    private const uint GMEM_ZEROINIT = 0x0040;
    private static readonly IntPtr HWND_MESSAGE = new IntPtr(-3);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern ushort RegisterClassEx(ref WNDCLASSEX lpwcx);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr CreateWindowEx(
        uint dwExStyle,
        string? lpClassName,
        string? lpWindowName,
        uint dwStyle,
        int x, int y,
        int nWidth, int nHeight,
        IntPtr hWndParent,
        IntPtr hMenu,
        IntPtr hInstance,
        IntPtr lpParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyWindow(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool AddClipboardFormatListener(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RemoveClipboardFormatListener(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    private static extern bool TranslateMessage(ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessage(ref MSG lpMsg);

    [DllImport("user32.dll")]
    private static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct WNDCLASSEX
    {
        public uint cbSize;
        public uint style;
        public IntPtr lpfnWndProc;
        public int cbClsExtra;
        public int cbWndExtra;
        public IntPtr hInstance;
        public IntPtr hIcon;
        public IntPtr hCursor;
        public IntPtr hbrBackground;
        public string? lpszMenuName;
        public string? lpszClassName;
        public IntPtr hIconSm;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr hWnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int x;
        public int y;
    }

    private delegate IntPtr WndProcDelegate(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    private WndProcDelegate? _wndProcDelegate;
    private GCHandle _wndProcHandle;
    private IntPtr _hwnd = IntPtr.Zero;
    private Thread? _messageThread;
    private readonly ManualResetEventSlim _windowCreatedEvent = new ManualResetEventSlim(false);

    public bool IsMonitoring => _isMonitoring;
    public event Action<string, int>? OnRedaction; // (app, count)

    public ClipboardMonitor(RuleEngine ruleEngine, PolicyEngine policyEngine,
        AuditLogger auditLogger, ForegroundDetector foregroundDetector)
    {
        _ruleEngine = ruleEngine;
        _policyEngine = policyEngine;
        _auditLogger = auditLogger;
        _foregroundDetector = foregroundDetector;
    }

    /// <summary>
    /// Start monitoring clipboard using WM_CLIPBOARDUPDATE message listener.
    /// </summary>
    public void Start()
    {
        if (_isMonitoring) return;
        _isMonitoring = true;
        _cts = new CancellationTokenSource();

        _messageThread = new Thread(MessageLoop) { IsBackground = true };
        _messageThread.Start();

        // Wait for the window to be created before returning
        if (!_windowCreatedEvent.Wait(2000))
        {
            Console.Error.WriteLine("ClipboardMonitor: timeout waiting for message window");
        }
    }

    public void Stop()
    {
        if (!_isMonitoring) return;
        _isMonitoring = false;

        // Signal the message loop to exit
        if (_hwnd != IntPtr.Zero)
        {
            PostMessage(_hwnd, 0x0012, IntPtr.Zero, IntPtr.Zero); // WM_QUIT
        }

        _cts?.Cancel();
        _messageThread?.Join(1000);
        _messageThread = null;

        CleanupWindow();
    }

    private void MessageLoop()
    {
        try
        {
            CreateMessageWindow();

            if (_hwnd == IntPtr.Zero)
            {
                Console.Error.WriteLine("ClipboardMonitor: failed to create message window");
                return;
            }

            // Signal that the window is ready
            _windowCreatedEvent.Set();

            // Message loop
            while (GetMessage(out MSG msg, _hwnd, 0, 0))
            {
                if (msg.message == WM_CLIPBOARDUPDATE)
                {
                    CheckClipboard();
                }
                TranslateMessage(ref msg);
                DispatchMessage(ref msg);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"ClipboardMonitor message loop error: {ex.Message}");
        }
        finally
        {
            _windowCreatedEvent.Set();
        }
    }

    private void CreateMessageWindow()
    {
        _wndProcDelegate = WndProc;
        _wndProcHandle = GCHandle.Alloc(_wndProcDelegate);

        var wc = new WNDCLASSEX
        {
            cbSize = (uint)Marshal.SizeOf<WNDCLASSEX>(),
            lpfnWndProc = Marshal.GetFunctionPointerForDelegate(_wndProcDelegate),
            hInstance = Marshal.GetHINSTANCE(typeof(ClipboardMonitor).Module),
            lpszClassName = "MaskitClipboardMonitor"
        };

        ushort classAtom = RegisterClassEx(ref wc);
        if (classAtom == 0)
        {
            // Class already registered, that's fine
        }

        // Create a message-only window
        _hwnd = CreateWindowEx(
            0,
            "MaskitClipboardMonitor",
            "Maskit Clipboard Monitor",
            0,
            0, 0, 0, 0,
            HWND_MESSAGE,
            IntPtr.Zero,
            wc.hInstance,
            IntPtr.Zero);

        if (_hwnd == IntPtr.Zero)
        {
            int error = Marshal.GetLastWin32Error();
            Console.Error.WriteLine($"ClipboardMonitor: CreateWindowEx failed with error {error}");
            return;
        }

        // Register for clipboard update notifications
        if (!AddClipboardFormatListener(_hwnd))
        {
            int error = Marshal.GetLastWin32Error();
            Console.Error.WriteLine($"ClipboardMonitor: AddClipboardFormatListener failed with error {error}");
        }
    }

    private void CleanupWindow()
    {
        if (_hwnd != IntPtr.Zero)
        {
            RemoveClipboardFormatListener(_hwnd);
            DestroyWindow(_hwnd);
            _hwnd = IntPtr.Zero;
        }

        if (_wndProcHandle.IsAllocated)
        {
            _wndProcHandle.Free();
        }
    }

    private IntPtr WndProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam)
    {
        if (msg == WM_CLIPBOARDUPDATE)
        {
            CheckClipboard();
        }
        return DefWindowProc(hWnd, msg, wParam, lParam);
    }

    [DllImport("user32.dll")]
    private static extern IntPtr DefWindowProc(IntPtr hWnd, uint uMsg, IntPtr wParam, IntPtr lParam);

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
            var hGlobal = NativeMethods.GlobalAlloc(GMEM_MOVEABLE | GMEM_ZEROINIT, (nuint)((text.Length + 1) * 2));
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
        _windowCreatedEvent.Dispose();
    }
}

/// <summary>
/// Win32 native methods for clipboard access.
/// </summary>
internal static class NativeMethods
{
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool OpenClipboard(IntPtr hWndNewOwner);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseClipboard();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetClipboardData(uint uFormat);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetClipboardData(uint uFormat, IntPtr hMem);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool EmptyClipboard();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GlobalLock(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GlobalUnlock(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GlobalAlloc(uint uFlags, nuint dwBytes);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GlobalFree(IntPtr hMem);
}
