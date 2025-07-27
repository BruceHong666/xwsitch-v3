# Switch V3

## 🙏 致谢与说明

**向经典致敬**：本项目深受 [xswitch](https://github.com/yize/xswitch) 启发，感谢原作者 [@yize](https://github.com/yize) 为开发者社区做出的贡献。

**为什么重写**：随着 Chrome Extension Manifest V3 的推出，经典的 xswitch 插件因为使用了 V2 规范而无法在新版浏览器中正常运行。为了延续这个优秀工具的生命力，并保持开发者们熟悉的操作习惯，我们从零开始重新构建了这个现代化的版本。

**同类推荐**：如果 Switch V3 无法满足您的需求，也推荐试试这些优秀的同类插件：

- [山海关](https://chrome.google.com/webstore/detail/guan-extension/jfalnandddhgfnmejfgjgfbfnnkhljog) - 功能强大的请求拦截工具
- [Camora](https://chromewebstore.google.com/detail/camora/mekhlonkhdepfdocpjpkafckjckloahm) - 简洁实用的代理切换器

> 💻 **开发说明**：本项目采用 AI 辅助开发，时间比较短。虽然我已经进行了不怎么充分的测试，但作为一个快速迭代的项目，难免存在一些边缘情况的 BUG。如果您在使用中遇到问题，欢迎提交 Issue，我会积极修复和改进。

---

A modern HTTP request forwarding and debugging tool for developers, built with React, TypeScript, and Manifest V3.

## Features

- **🔄 Request Forwarding**: Redirect HTTP requests using string matching or regular expressions
- **🌐 CORS Support**: Automatically handle Cross-Origin Resource Sharing
- **📝 Monaco Editor**: Advanced JSON configuration editor with syntax highlighting
- **🗂️ Group Management**: Organize rules into different groups
- **⚡ Performance**: Optimized for fast rule matching and low memory usage
- **🎨 Modern UI**: Built with Ant Design for a clean, professional interface
- **🔧 Developer Friendly**: Easy configuration import/export and debugging tools

## Quick Start

### Installation

1. Clone this repository
   ```bash
   git clone <repository-url>
   cd xswitch-v3
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Build the extension
   ```bash
   pnpm run build
   ```

4. Load the extension in Chrome
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `.output` folder

### Development

```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm run dev

# Start development for Firefox
pnpm run dev:firefox

# Build for production
pnpm run build

# Build for Firefox
pnpm run build:firefox

# Create distribution zip
pnpm run zip

# Type checking
pnpm run compile

# Linting
pnpm run lint
pnpm run lint:fix

# Code formatting
pnpm run format
pnpm run format:check

# Testing
pnpm run test          # Run tests in watch mode
pnpm run test:run      # Run tests once
pnpm run test:ui       # Run tests with UI
pnpm run test:coverage # Run tests with coverage
```

## Configuration

### Basic Configuration Format

```json
{
  "proxy": [
    ["https://api.example.com", "http://localhost:3000"],
    ["(.*).example.com", "http://localhost:8080"]
  ],
  "cors": ["api.example.com", "(.*).example.com"]
}
```

### Rule Types

- **String Match**: Direct string replacement
- **Regex Match**: Pattern matching with regular expressions (use `(.*)` prefix)

### Examples

#### Local Development

```json
{
  "proxy": [["https://api.production.com", "http://localhost:3000"]]
}
```

#### Multiple Environment Forwarding

```json
{
  "proxy": [
    ["https://api.prod.com", "https://api.staging.com"],
    ["https://cdn.prod.com", "https://cdn.dev.com"]
  ]
}
```

#### Regex Pattern Matching

```json
{
  "proxy": [
    ["(.*).api.com/v1", "$1.api.com/v2"],
    ["(.*)production.com", "$1staging.com"]
  ]
}
```

## Architecture

### Manifest V3 Migration

This extension uses Chrome's latest Manifest V3 specification:

- **Service Worker**: Replaces background pages for better performance
- **declarativeNetRequest**: Modern API for request interception
- **Enhanced Security**: Improved permissions and content security

### Technology Stack

- **Frontend**: React 19 + TypeScript
- **UI Library**: Ant Design 5
- **State Management**: ahooks (useRequest, useMemoizedFn)
- **Build Tool**: WXT (Vite-based)
- **Code Editor**: CodeMirror 6
- **Package Manager**: pnpm
- **Testing**: Vitest + jsdom
- **Linting**: ESLint + Prettier

### Project Structure

```
entrypoints/
├── background.ts           # Service worker entry
├── background/
│   ├── controllers/        # Message handling controllers
│   ├── dao/               # Data access layer
│   ├── services/          # Business logic services
│   └── types/             # API type definitions
├── popup/
│   ├── App.tsx            # Main popup interface
│   ├── api/               # API client modules
│   ├── components/        # Reusable UI components
│   ├── services/          # Frontend services
│   └── utils/             # Utility functions
├── utils/                 # Shared utilities
└── content.ts             # Content script entry

tests/
├── integration/           # End-to-end tests
├── unit/                  # Unit tests
├── mocks/                 # Test mocks
└── fixtures/              # Test data

types/                     # Shared TypeScript definitions
```

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Firefox 109+ (with `pnpm run build:firefox`)

## Development Guide

### Architecture Overview

The extension follows a layered architecture:

1. **Background Layer**: Service worker with controllers, services, and data access
2. **UI Layer**: React-based popup interface with modern hooks
3. **Communication Layer**: Type-safe message passing between layers

### Key Features

- **Modular Design**: Separation of concerns with controllers, services, and DAOs
- **Type Safety**: Full TypeScript coverage with strict type checking
- **State Management**: Reactive state using ahooks with automatic data synchronization
- **Debounced Saves**: Automatic rule persistence with performance optimization
- **Error Handling**: Comprehensive error boundaries and user feedback

### Adding New Rules

1. Use the popup interface for quick rule creation
2. Rules support both string matching and regex patterns
3. Groups help organize related rules
4. Rules are validated in real-time with JSON format checking

### Debugging

1. **Service Worker**: 
   - Navigate to `chrome://extensions/`
   - Find "Switch V3" and click "service worker" to debug background scripts
   
2. **Popup Interface**:
   - Right-click the extension icon → "Inspect popup"
   - Use React DevTools for component debugging

3. **Network Monitoring**:
   - Open DevTools → Network tab to see request redirections
   - Check the Console for rule matching logs

### Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
pnpm run test

# Run specific test suites
pnpm run test -- json.test.ts
pnpm run test -- storage.test.ts

# Generate coverage report
pnpm run test:coverage
```

### Performance Optimization

- **Smart Caching**: Rules are cached for fast matching
- **Debounced Saves**: Configuration changes are batched to reduce I/O
- **Efficient Regex**: Patterns are compiled once and reused
- **Memory Management**: Minimal memory footprint with automatic cleanup

## Security

- **Local Storage**: All data stored locally in Chrome storage, no cloud dependencies
- **Minimal Permissions**: Only requests necessary permissions for core functionality
- **Content Security Policy**: Strict CSP compliance for enhanced security
- **No External Requests**: Extension operates entirely offline after installation
- **Type Safety**: TypeScript prevents common security vulnerabilities

## API Reference

### Rule Configuration Format

```typescript
interface GroupRuleVo {
  id: string;
  groupName: string;
  ruleText: string;  // JSON string with proxy and cors rules
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

interface RuleConfig {
  proxy: [string, string][];  // [source, target] pairs
  cors?: string[];            // CORS enabled domains
}
```

### Background API

The extension exposes these APIs for communication:

- `LOAD_GROUPS`: Load all rule groups
- `SAVE_GROUP`: Save a single rule group
- `CREATE_GROUP`: Create a new rule group
- `UPDATE_GROUP`: Update existing rule group
- `DELETE_GROUP`: Delete a rule group
- `TOGGLE_GROUP`: Enable/disable a rule group
- `CLEAR_ALL_DATA`: Reset all data

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository** and create your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** with proper TypeScript types
3. **Add tests** for new functionality
   ```bash
   pnpm run test
   ```

4. **Run linting and formatting**
   ```bash
   pnpm run lint:fix
   pnpm run format
   ```

5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

6. **Submit a pull request** with a clear description

### Development Guidelines

- Follow TypeScript strict mode requirements
- Use React hooks patterns with ahooks
- Maintain test coverage above 80%
- Follow the existing code style and patterns
- Update documentation for API changes

## Roadmap

- [ ] **Advanced Filtering**: Support for request headers and method filtering
- [ ] **Import/Export**: Configuration backup and sharing functionality  
- [ ] **Rule Templates**: Pre-built rule sets for common development scenarios
- [ ] **Performance Dashboard**: Real-time statistics and rule matching metrics
- [ ] **Sync Support**: Cross-device rule synchronization (optional)

## License

MIT License - see LICENSE file for details

## Changelog

### Current Version
- Full Manifest V3 compatibility
- Modern React 19 + TypeScript architecture
- CodeMirror 6 integration for rule editing
- Comprehensive test suite with Vitest
- ahooks integration for better state management
- Debounced auto-save functionality
- Real-time JSON validation

## Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: Join community discussions for usage questions
- **Documentation**: Check this README and inline code documentation

## Migration from Legacy Versions

If migrating from older xswitch versions:

1. **Export** your existing rules from the old extension
2. **Install** Switch V3 following the installation guide above
3. **Recreate** rules using the new JSON format:
   ```json
   {
     "proxy": [["old-url", "new-url"]],
     "cors": ["domain.com"]
   }
   ```
4. **Test** your rules to ensure they work as expected

The new format is more structured but provides better validation and performance.
