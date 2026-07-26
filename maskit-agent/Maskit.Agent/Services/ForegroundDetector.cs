using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Maskit.Agent.Services;

/// <summary>
/// Detects the foreground application and classifies it as AI or non-AI.
/// Provides context for policy decisions.
/// </summary>
public class ForegroundDetector
{
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    // AI process classification (confidence 0-1)
    private static readonly Dictionary<string, AppContext> AiProcesses = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Microsoft.Copilot.exe"] = new() { ProcessName = "Windows Copilot", AiDetected = true, AiConfidence = 1.0f, IsLocal = false },
        ["ChatGPT.exe"] = new() { ProcessName = "ChatGPT Desktop", AiDetected = true, AiConfidence = 1.0f, IsLocal = false },
        ["claude-desktop.exe"] = new() { ProcessName = "Claude Desktop", AiDetected = true, AiConfidence = 1.0f, IsLocal = false },
        ["ollama.exe"] = new() { ProcessName = "Ollama", AiDetected = true, AiConfidence = 1.0f, IsLocal = true },
        ["LMStudio.exe"] = new() { ProcessName = "LM Studio", AiDetected = true, AiConfidence = 1.0f, IsLocal = true },
        ["WINWORD.EXE"] = new() { ProcessName = "Microsoft Word", AiDetected = true, AiConfidence = 0.7f, IsLocal = false },
        ["EXCEL.EXE"] = new() { ProcessName = "Microsoft Excel", AiDetected = true, AiConfidence = 0.7f, IsLocal = false },
        ["POWERPNT.EXE"] = new() { ProcessName = "Microsoft PowerPoint", AiDetected = true, AiConfidence = 0.6f, IsLocal = false },
        ["MSTEAMS.EXE"] = new() { ProcessName = "Microsoft Teams", AiDetected = true, AiConfidence = 0.6f, IsLocal = false },
        ["OUTLOOK.EXE"] = new() { ProcessName = "Microsoft Outlook", AiDetected = true, AiConfidence = 0.5f, IsLocal = false },
        ["Code.exe"] = new() { ProcessName = "VS Code", AiDetected = true, AiConfidence = 0.5f, IsLocal = false },
        ["Cursor.exe"] = new() { ProcessName = "Cursor", AiDetected = true, AiConfidence = 0.7f, IsLocal = false },
        ["Windsurf.exe"] = new() { ProcessName = "Windsurf", AiDetected = true, AiConfidence = 0.7f, IsLocal = false },
    };

    /// <summary>
    /// Get the current foreground application context.
    /// </summary>
    public AppContext GetForegroundContext()
    {
        try
        {
            var hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero)
                return DefaultContext();

            GetWindowThreadProcessId(hwnd, out uint processId);
            if (processId == 0)
                return DefaultContext();

            var process = Process.GetProcessById((int)processId);
            var processName = process.ProcessName + ".exe";

            if (AiProcesses.TryGetValue(processName, out var aiContext))
            {
                return new AppContext
                {
                    ProcessName = aiContext.ProcessName,
                    ProcessPath = TryGetProcessPath(process),
                    AiDetected = aiContext.AiDetected,
                    AiConfidence = aiContext.AiConfidence,
                    IsLocal = aiContext.IsLocal
                };
            }

            return new AppContext
            {
                ProcessName = processName,
                ProcessPath = TryGetProcessPath(process),
                AiDetected = false,
                AiConfidence = 0.0f,
                IsLocal = false
            };
        }
        catch
        {
            return DefaultContext();
        }
    }

    private static string? TryGetProcessPath(Process process)
    {
        try { return process.MainModule?.FileName; }
        catch { return null; }
    }

    private static AppContext DefaultContext() => new()
    {
        ProcessName = "unknown",
        AiDetected = false,
        AiConfidence = 0.0f,
        IsLocal = false
    };
}

/// <summary>
/// Application context for policy decisions.
/// </summary>
public class AppContext
{
    public string ProcessName { get; set; } = "unknown";
    public string? ProcessPath { get; set; }
    public bool AiDetected { get; set; }
    public float AiConfidence { get; set; }
    public bool IsLocal { get; set; }
}