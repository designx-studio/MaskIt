# MaskIt Enterprise Deployment Guide

## Overview

MaskIt can be deployed across an enterprise using a unified policy file. This guide covers deploying the Windows agent and browser extension via MDM (e.g., Microsoft Intune).

## Unified Policy

MaskIt uses a central `policy.json` file. All components (Windows Agent, Browser Extension, VS Code Extension, MCP) read from this policy if configured.

### Example Policy
```json
{
  "version": "1.0",
  "mode": "strict",
  "actions": {
    "aws_keys": "block",
    "github_tokens": "block",
    "customer_data": "redact",
    "generic_secret": "redact"
  }
}
```

## Deploying the Windows Agent (MSI)

The Windows agent is packaged as an MSI, supporting silent installation.

```cmd
msiexec /i MaskIt.Agent.msi /qn POLICY_URL="https://internal.corp/maskit-policy.json"
```

## Deploying the Browser Extension

Deploy via Chrome Enterprise or Edge management policies. Configure the extension to read the unified policy from a managed local path or URL.

## Managing Updates

Deploy new MSI versions over existing installations. The installer is configured to upgrade the service while preserving existing configuration files in `AppData`.
