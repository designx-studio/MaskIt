# MaskIt Developer Guide

Welcome to the MaskIt developer guide. This document outlines the architecture, setup instructions, and guidelines for contributing to MaskIt.

## Architecture Overview

MaskIt consists of several components:
1.  **maskit-core**: Contains the shared detection engine, policies, and rules.
2.  **maskit-agent**: A Windows service (.NET 8) that monitors the clipboard and enforces policies.
3.  **maskit-vscode**: A VS Code extension for inline secret detection and quick fixes.
4.  **mcp-server**: An MCP server and CLI for integration with local AI clients.
5.  **Browser Extension**: A Manifest V3 extension for protecting web-based AI chats.

## Environment Setup

### Prerequisites
- Node.js v18+
- .NET 8 SDK (for Windows agent)
- Git

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/designx-studio/MaskIt
    cd MaskIt
    ```
2.  Install Node dependencies:
    ```bash
    npm ci
    ```

## Testing

Run all tests before submitting a PR:
```bash
npm test
```

For specific test suites:
```bash
npm run test:security
```

## Adding New Rules

Rules are defined in `maskit-core/rules/`. After adding a new rule, ensure you add corresponding tests in `tests/security/rule-regression.test.js` to prevent regressions.

## VS Code Extension Development

1.  Navigate to `maskit-vscode`.
2.  Run `npm install`.
3.  Press F5 to start debugging the extension.

## Building the Windows Agent

```bash
cd maskit-agent
dotnet build Maskit.Agent/Maskit.Agent.csproj --configuration Release
```
