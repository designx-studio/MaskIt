# MaskIt - Intelligent PII & Secret Masking Extension

MaskIt is a comprehensive browser extension and desktop agent that automatically detects and masks sensitive information (PII, secrets, financial data) in real-time across multiple platforms.

## Features

- **Real-time Detection**: Automatically detects PII, secrets, and financial data as you type
- **Multi-Platform Support**: Browser extension + Windows desktop agent
- **Smart Masking**: Context-aware masking with configurable rules
- **MCP Server Integration**: Claude Desktop and bot integrations (Discord, Slack, Express)
- **Audit Logging**: Comprehensive tracking of all masking operations
- **Privacy-First**: All processing happens locally on your device

## What Gets Masked

- **PII**: Email addresses, phone numbers, SSNs, IP addresses, names
- **Secrets**: API keys, passwords, tokens, private keys, database credentials
- **Financial**: Credit card numbers, bank account numbers, routing numbers

## Installation

### Browser Extension (Chrome/Edge/Firefox)

1. Clone this repository
2. Open your browser's extension management page
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory
5. Configure masking rules in the extension options

### Windows Desktop Agent

1. Navigate to `maskit-agent/Maskit.Agent/`
2. Build the project using Visual Studio or `dotnet build`
3. Run the installer or executable
4. The agent will monitor clipboard and foreground applications

## Configuration

### Extension Options
- Toggle masking for different data types
- Add custom regex patterns
- Configure whitelist/blacklist for websites
- Set notification preferences

### Desktop Agent Settings
- Configure monitored applications
- Set clipboard monitoring rules
- Adjust detection sensitivity
- Enable/disable audit logging

## Development

### Prerequisites
- Node.js 16+
- npm or yarn
- .NET 6+ SDK (for desktop agent)

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build extension
npm run build

# Start MCP server (for Claude Desktop integration)
cd mcp-server
npm install
npm start
```

### Project Structure

```
maskit-extension/
├── engine/              # Core detection engine
├── maskit-core/         # Shared rules and policies
├── maskit-agent/        # Windows desktop agent (.NET)
├── mcp-server/          # MCP server for AI integrations
├── scripts/             # Build and validation scripts
├── website/             # Documentation website
├── background.js        # Extension background service
├── content.js           # Content script for web pages
├── popup.js             # Extension popup UI
└── options.js           # Extension options page
```

## MCP Server Integration

The MCP (Model Context Protocol) server enables AI assistants like Claude to interact with MaskIt:

- **Claude Desktop**: Direct integration for AI-powered masking decisions
- **Discord Bot**: Monitor and mask sensitive data in Discord channels
- **Slack Bot**: Protect sensitive information in Slack workspaces
- **Express Middleware**: API endpoint protection for web applications
- **GitHub Action**: Automated secret scanning in CI/CD pipelines

## Testing

```bash
# Run all tests
npm test

# Run engine tests
cd engine && npm test

# Run MCP server tests
cd mcp-server && npm test

# Run .NET agent tests
cd maskit-agent/Maskit.Agent && dotnet test
```

## Documentation

- [FEATURES.md](FEATURES.md) - Detailed feature list
- [BUILD.md](BUILD.md) - Build and deployment guide
- [SECURITY.md](SECURITY.md) - Security policy and vulnerability reporting
- [RELEASE.md](RELEASE.md) - Release process and versioning
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

## Architecture

MaskIt uses a multi-layered architecture:

1. **Detection Layer**: Regex-based pattern matching with context awareness
2. **Policy Layer**: Configurable rules for different data types and contexts
3. **Masking Layer**: Multiple masking strategies (redaction, tokenization, hashing)
4. **Integration Layer**: Browser APIs, desktop APIs, and MCP server

## Privacy & Security

- **Local Processing**: All detection and masking happens on your device
- **No Data Collection**: MaskIt does not collect or transmit personal data
- **Open Source**: Fully auditable codebase
- **Secure by Default**: Conservative masking rules that can be customized

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Firefox 78+
- Brave (latest)
- Opera (latest)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/designx-studio/MaskIt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/designx-studio/MaskIt/discussions)
- **Email**: support@designx.studio

## Roadmap

- [ ] Safari extension support
- [ ] macOS desktop agent
- [ ] Linux desktop agent
- [ ] Custom rule marketplace
- [ ] Team collaboration features
- [ ] Advanced ML-based detection

---

**Built with ❤️ by DesignX Studio**