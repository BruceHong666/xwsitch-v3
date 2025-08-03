# Switch V3

**English** | [简体中文](README-zh.md)

A modern HTTP request forwarding and debugging tool for developers, built with React, TypeScript, and Manifest V3.

## 🙏 Acknowledgments & Background

**Tribute to the Classic**: This project is deeply inspired by [xswitch](https://github.com/yize/xswitch). Thanks to the original author [@yize](https://github.com/yize) for contributing to the developer community.

**Why Rewrite**: With the release of Chrome Extension Manifest V3, the classic xswitch extension can no longer run properly in modern browsers due to its V2 specification. To continue the life of this excellent tool while maintaining the familiar user experience developers love, we rebuilt this modernized version from scratch.

**Alternative Recommendations**: If Switch V3 doesn't meet your needs, we also recommend these excellent similar extensions:

- [Shanhaiguan](https://chrome.google.com/webstore/detail/guan-extension/jfalnandddhgfnmejfgjgfbfnnkhljog) - Powerful request interception tool
- [Camora](https://chromewebstore.google.com/detail/camora/mekhlonkhdepfdocpjpkafckjckloahm) - Simple and practical proxy switcher

> 💻 **Development Note**: This project was developed with AI assistance and completed in two and a half days. While we've conducted testing, as a rapid iteration project, there may be some edge case bugs. If you encounter issues during use, please submit an Issue, and we'll actively fix and improve.

## ✨ Features

- **🔄 Request Forwarding**: Redirect HTTP requests using string matching or regular expressions
- **🌐 CORS Support**: Automatically handle Cross-Origin Resource Sharing
- **📝 Code Editor**: Advanced CodeMirror 6 editor with syntax highlighting and real-time validation
- **🗂️ Group Management**: Organize rules into different groups with enable/disable controls
- **⚡ Performance**: Optimized for fast rule matching and low memory usage
- **🎨 Modern UI**: Built with Ant Design 5 for a clean, professional interface
- **🔧 Developer Friendly**: Easy configuration import/export and debugging tools
- **🌍 Internationalization**: Complete Chinese and English support with automatic browser language detection
- **🚀 Auto-Save**: Debounced auto-save functionality for seamless editing experience
- **🔍 Real-time Validation**: JSON format validation with error highlighting
- **📱 Responsive Design**: Works perfectly in both popup and tab modes

## 🚀 Quick Start

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
   - Click "Load unpacked" and select the `dist` folder

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

# Linting and formatting
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check

# Testing
pnpm run test          # Run tests in watch mode
pnpm run test:run      # Run tests once
pnpm run test:ui       # Run tests with UI
pnpm run test:coverage # Run tests with coverage
```

## ⚙️ Configuration

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

### Configuration Examples

#### Local Development Setup

```json
{
  "proxy": [["https://api.production.com", "http://localhost:3000"]]
}
```

#### Multi-Environment Forwarding

```json
{
  "proxy": [
    ["https://api.prod.com", "https://api.staging.com"],
    ["https://cdn.prod.com", "https://cdn.dev.com"]
  ]
}
```

#### Advanced Regex Patterns

```json
{
  "proxy": [
    ["(.*).api.com/v1", "$1.api.com/v2"],
    ["(.*)production.com", "$1staging.com"]
  ],
  "cors": ["(.*).api.com"]
}
```

## 🏗️ Architecture

### Manifest V3 Migration

This extension uses Chrome's latest Manifest V3 specification:

- **Service Worker**: Replaces background pages for better performance and security
- **declarativeNetRequest**: Modern API for request interception with better performance
- **Enhanced Security**: Improved permissions model and content security policies

### Technology Stack

- **Frontend**: React 19 + TypeScript
- **UI Library**: Ant Design 5
- **State Management**: ahooks (useRequest, useMemoizedFn, useDebounceFn)
- **Build Tool**: WXT (Next-generation Vite-based extension framework)
- **Code Editor**: CodeMirror 6 with JSON syntax highlighting
- **Package Manager**: pnpm
- **Testing**: Vitest + jsdom
- **Linting**: ESLint + Prettier

### Project Structure

```
entrypoints/
├── background.ts           # Service worker entry point
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

## 🌏 Browser Compatibility

- **Chrome 88+** (Manifest V3 support)
- **Edge 88+** (Chromium-based)
- **Firefox 109+** (with `pnpm run build:firefox`)

## 🛠️ Development Guide

### Architecture Overview

The extension follows a clean layered architecture:

1. **Background Layer**: Service worker with controllers, services, and data access objects
2. **UI Layer**: React-based popup interface with modern hooks and state management
3. **Communication Layer**: Type-safe message passing with locale support
4. **Shared Layer**: Common utilities and internationalization

### Key Features

- **Modular Design**: Clear separation of concerns with controllers, services, and DAOs
- **Type Safety**: Full TypeScript coverage with strict type checking
- **State Management**: Reactive state using ahooks with automatic data synchronization
- **Debounced Operations**: Auto-save with performance optimization
- **Error Handling**: Comprehensive error boundaries and user-friendly feedback
- **Internationalization**: Runtime language switching with persistent preferences

### Adding New Rules

1. **Quick Creation**: Use the popup interface for rapid rule creation
2. **Format Support**: Rules support both string matching and regex patterns
3. **Organization**: Groups help organize related rules logically
4. **Validation**: Real-time JSON format checking with error highlighting
5. **Management**: Easy enable/disable, edit, copy, and delete operations

### Debugging

#### 1. Service Worker Debugging

- Navigate to `chrome://extensions/`
- Find "Switch V3" and click "service worker" to debug background scripts
- Monitor console logs for request processing and rule matching

#### 2. Popup Interface Debugging

- Right-click the extension icon → "Inspect popup"
- Use React DevTools for component state inspection
- Check console for frontend errors and state changes

#### 3. Network Monitoring

- Open DevTools → Network tab to observe request redirections
- Check Console for rule matching logs and performance metrics
- Use the extension's real-time feedback for rule validation

### Testing

The project includes comprehensive testing infrastructure:

```bash
# Run all tests with watch mode
pnpm run test

# Run specific test files
pnpm run test -- json.test.ts
pnpm run test -- storage.test.ts

# Generate detailed coverage report
pnpm run test:coverage

# Run tests with visual interface
pnpm run test:ui
```

### Performance Optimization

- **Smart Caching**: Rules are compiled and cached for lightning-fast matching
- **Debounced Saves**: Configuration changes are batched to minimize I/O operations
- **Efficient Regex**: Patterns are compiled once and reused across requests
- **Memory Management**: Minimal memory footprint with automatic garbage collection
- **Lazy Loading**: Components and resources loaded on demand

## 🔒 Security

- **Local Storage**: All data stored locally in Chrome storage with no external dependencies
- **Minimal Permissions**: Requests only essential permissions for core functionality
- **Content Security Policy**: Strict CSP implementation for enhanced security
- **No External Requests**: Extension operates entirely offline after installation
- **Type Safety**: TypeScript prevents common security vulnerabilities
- **Input Validation**: Comprehensive validation for all user inputs and configurations

## 📚 API Reference

### Rule Configuration Format

```typescript
interface GroupRuleVo {
  id: string;
  groupName: string;
  ruleText: string; // JSON string containing proxy and cors rules
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

interface RuleConfig {
  proxy: [string, string][]; // [source, target] pairs
  cors?: string[]; // Domains with CORS enabled
}
```

### Background API

The extension exposes these APIs for frontend-backend communication:

- **`LOAD_GROUPS`**: Load all rule groups with metadata
- **`SAVE_GROUP`**: Save a single rule group with validation
- **`CREATE_GROUP`**: Create new rule group with defaults
- **`UPDATE_GROUP`**: Update existing rule group properties
- **`DELETE_GROUP`**: Remove rule group and cleanup
- **`TOGGLE_GROUP`**: Enable/disable rule group state
- **`CLEAR_ALL_DATA`**: Reset all data to factory defaults

## 🤝 Contributing

We welcome contributions from the community! Please follow these guidelines:

### Getting Started

1. **Fork the repository** and create your feature branch

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Set up development environment**

   ```bash
   pnpm install
   pnpm run dev
   ```

3. **Make your changes** with proper TypeScript types and documentation

4. **Add comprehensive tests** for new functionality

   ```bash
   pnpm run test
   pnpm run test:coverage
   ```

5. **Ensure code quality**

   ```bash
   pnpm run lint:fix
   pnpm run format
   pnpm run compile
   ```

6. **Use conventional commits**

   ```bash
   git commit -m "feat: add amazing feature"
   git commit -m "fix: resolve issue with rule matching"
   git commit -m "docs: update API documentation"
   ```

7. **Submit a pull request** with clear description and screenshots if applicable

### Development Guidelines

- **TypeScript**: Follow strict mode requirements and provide comprehensive types
- **React Patterns**: Use modern hooks patterns with ahooks for state management
- **Testing**: Maintain test coverage above 80% for all new code
- **Code Style**: Follow existing patterns and use provided linting configuration
- **Documentation**: Update documentation for any API changes or new features
- **Internationalization**: Add translations for any user-facing text

### Code Review Process

1. All submissions require review from maintainers
2. Automated tests must pass before merge
3. Code style and type checks must pass
4. Documentation updates should accompany feature changes

## 🗺️ Roadmap

### Short Term (Next Release)

- [ ] **Import/Export**: Configuration backup and sharing functionality
- [ ] **Rule Templates**: Pre-built rule sets for common development scenarios
- [ ] **Advanced Filtering**: Support for request headers and HTTP methods

### Medium Term

- [ ] **Performance Dashboard**: Real-time statistics and rule matching metrics
- [ ] **Rule Testing**: Built-in testing tools for rule validation
- [ ] **Advanced Editor**: Enhanced code editor with autocomplete and validation

### Long Term

- [ ] **Sync Support**: Cross-device rule synchronization (optional)
- [ ] **Team Collaboration**: Shared rule sets for development teams
- [ ] **Plugin System**: Extensible architecture for custom rule processors

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 📝 Changelog

### Current Version (v1.0.0)

#### ✨ New Features

- **Complete Manifest V3 Compatibility**: Full migration to modern Chrome extension APIs
- **Modern React 19 Architecture**: Latest React with concurrent features and TypeScript
- **CodeMirror 6 Integration**: Advanced code editor with syntax highlighting
- **Comprehensive Internationalization**: Runtime language switching with persistent preferences
- **Auto-Save Functionality**: Debounced auto-save with visual feedback
- **Real-time Validation**: JSON format validation with error highlighting

#### 🔧 Technical Improvements

- **ahooks Integration**: Modern React hooks for better state management
- **WXT Build System**: Next-generation Vite-based build system
- **Comprehensive Testing**: Vitest-based testing with high coverage
- **Type Safety**: Strict TypeScript configuration with full type coverage
- **Performance Optimization**: Smart caching and efficient rule matching

#### 🎨 UI/UX Enhancements

- **Ant Design 5**: Modern, accessible UI components
- **Responsive Design**: Perfect experience in both popup and tab modes
- **Light Theme**: Clean and consistent light theme design
- **Improved Accessibility**: Full keyboard navigation and screen reader support

## 💬 Support

### Getting Help

- **📋 Issues**: Report bugs and request features on [GitHub Issues](https://github.com/your-repo/issues)
- **💬 Discussions**: Join community discussions for usage questions and tips
- **📖 Documentation**: Comprehensive guides in this README and inline code comments

### Contributing Support

- **🔧 Development**: Follow the contributing guidelines above
- **🌍 Translations**: Help improve internationalization support
- **📝 Documentation**: Contribute to documentation and examples

## 🔄 Migration from Legacy Versions

### From xswitch v2 or similar tools:

1. **Export Configuration**: Save your existing rules from the old extension

2. **Install Switch V3**: Follow the installation guide above

3. **Convert Rules**: Transform to the new JSON format:

   ```json
   {
     "proxy": [
       ["https://old-api.com", "https://new-api.com"],
       ["(.*).staging.com", "$1.development.com"]
     ],
     "cors": ["api.example.com"]
   }
   ```

4. **Test Thoroughly**: Verify that all rules work as expected

5. **Enjoy New Features**: Take advantage of improved performance and new capabilities

### Key Differences

- **Structured Format**: More explicit and validated JSON configuration
- **Better Performance**: Optimized rule matching and lower resource usage
- **Enhanced UI**: Modern interface with better usability
- **Future-Proof**: Built on latest web standards and best practices

The migration provides significant improvements in stability, performance, and user experience.
