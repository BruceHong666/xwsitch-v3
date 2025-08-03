# Switch V3

[English](README.md) | **简体中文**

一个现代化的HTTP请求转发和调试工具，专为开发者设计，基于React、TypeScript和Manifest V3构建。

## 🙏 致谢与说明

**向经典致敬**：本项目深受 [xswitch](https://github.com/yize/xswitch) 启发，感谢原作者 [@yize](https://github.com/yize) 为开发者社区做出的贡献。

**为什么重写**：随着 Chrome Extension Manifest V3 的推出，经典的 xswitch 插件因为使用了 V2 规范而无法在新版浏览器中正常运行。为了延续这个优秀工具的生命力，并保持开发者们熟悉的操作习惯，我从零开始重新构建了这个现代化的版本。

**同类推荐**：如果 Switch V3 无法满足您的需求，也推荐试试这些优秀的同类插件：

- [山海关](https://chrome.google.com/webstore/detail/guan-extension/jfalnandddhgfnmejfgjgfbfnnkhljog) - 功能强大的请求拦截工具
- [Camora](https://chromewebstore.google.com/detail/camora/mekhlonkhdepfdocpjpkafckjckloahm) - 简洁实用的代理切换器

> 💻 **开发说明**：本项目采用 AI 辅助开发，历时两天半完成。虽然我已经进行了测试，但作为一个快速迭代的项目，难免存在一些边缘情况的 BUG。如果您在使用中遇到问题，欢迎提交 Issue，我会积极修复和改进。

## ✨ 功能特性

- **🔄 请求转发**: 使用字符串匹配或正则表达式重定向HTTP请求
- **🌐 CORS支持**: 自动处理跨域资源共享
- **📝 代码编辑器**: 高级CodeMirror 6编辑器，支持语法高亮和实时验证
- **🗂️ 分组管理**: 将规则组织到不同的分组中，支持启用/禁用控制
- **⚡ 高性能**: 优化的规则匹配和低内存占用
- **🎨 现代化UI**: 基于Ant Design 5的简洁专业界面
- **🔧 开发者友好**: 简单的配置导入/导出和调试工具
- **🌍 国际化**: 完整的中英文支持，可自动检测浏览器语言
- **🚀 自动保存**: 防抖自动保存功能，带来无缝编辑体验
- **🔍 实时验证**: JSON格式验证，带有错误高亮显示
- **📱 响应式设计**: 在弹窗和标签页模式下都能完美工作

## 🚀 快速开始

### 安装

1. 克隆仓库

   ```bash
   git clone <repository-url>
   cd xswitch-v3
   ```

2. 安装依赖

   ```bash
   pnpm install
   ```

3. 构建扩展

   ```bash
   pnpm run build
   ```

4. 在Chrome中加载扩展
   - 打开Chrome并导航到 `chrome://extensions/`
   - 在右上角启用"开发者模式"
   - 点击"加载已解压的扩展程序"并选择 `dist` 文件夹

### 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器（支持热重载）
pnpm run dev

# 启动Firefox开发服务器
pnpm run dev:firefox

# 生产环境构建
pnpm run build

# Firefox构建
pnpm run build:firefox

# 创建分发包
pnpm run zip

# 类型检查
pnpm run compile

# 代码检查和格式化
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check

# 测试
pnpm run test          # 监听模式运行测试
pnpm run test:run      # 运行一次测试
pnpm run test:ui       # 可视化界面运行测试
pnpm run test:coverage # 运行测试并生成覆盖率报告
```

## ⚙️ 配置

### 基本配置格式

```json
{
  "proxy": [
    ["https://api.example.com", "http://localhost:3000"],
    ["(.*).example.com", "http://localhost:8080"]
  ],
  "cors": ["api.example.com", "(.*).example.com"]
}
```

### 规则类型

- **字符串匹配**: 直接字符串替换
- **正则匹配**: 使用正则表达式进行模式匹配（使用 `(.*)` 前缀）

### 配置示例

#### 本地开发设置

```json
{
  "proxy": [["https://api.production.com", "http://localhost:3000"]]
}
```

#### 多环境转发

```json
{
  "proxy": [
    ["https://api.prod.com", "https://api.staging.com"],
    ["https://cdn.prod.com", "https://cdn.dev.com"]
  ]
}
```

#### 高级正则模式

```json
{
  "proxy": [
    ["(.*).api.com/v1", "$1.api.com/v2"],
    ["(.*)production.com", "$1staging.com"]
  ],
  "cors": ["(.*).api.com"]
}
```

## 🏗️ 架构

### Manifest V3迁移

此扩展使用Chrome最新的Manifest V3规范：

- **Service Worker**: 替代背景页面以获得更好的性能和安全性
- **declarativeNetRequest**: 用于请求拦截的现代API，性能更佳
- **增强安全性**: 改进的权限模型和内容安全策略

### 技术栈

- **前端**: React 19 + TypeScript
- **UI库**: Ant Design 5
- **状态管理**: ahooks (useRequest, useMemoizedFn, useDebounceFn)
- **构建工具**: WXT (下一代基于Vite的扩展框架)
- **代码编辑器**: CodeMirror 6 支持JSON语法高亮
- **包管理器**: pnpm
- **测试**: Vitest + jsdom
- **代码检查**: ESLint + Prettier
- **国际化**: 前后端共享的i18n系统

### 项目结构

```
entrypoints/
├── background.ts           # Service worker入口点
├── background/
│   ├── controllers/        # 消息处理控制器
│   ├── dao/               # 数据访问层
│   ├── services/          # 业务逻辑服务
│   └── types/             # API类型定义
├── popup/
│   ├── App.tsx            # 主要弹窗界面
│   ├── api/               # API客户端模块
│   ├── components/        # 可复用UI组件
│   ├── services/          # 前端服务
│   └── utils/             # 工具函数
├── shared/
│   └── i18n/              # 国际化（前后端共享）
├── utils/                 # 共享工具
└── content.ts             # 内容脚本入口

tests/
├── integration/           # 端到端测试
├── unit/                  # 单元测试
├── mocks/                 # 测试模拟
└── fixtures/              # 测试数据

types/                     # 共享TypeScript定义
```

## 🌏 浏览器兼容性

- **Chrome 88+** (Manifest V3支持)
- **Edge 88+** (基于Chromium)
- **Firefox 109+** (使用 `pnpm run build:firefox`)

## 🛠️ 开发指南

### 架构概览

扩展采用清晰的分层架构：

1. **背景层**: 带有控制器、服务和数据访问对象的Service worker
2. **UI层**: 基于React的弹窗界面，使用现代hooks和状态管理
3. **通信层**: 带有locale支持的类型安全消息传递
4. **共享层**: 通用工具和国际化

### 核心特性

- **模块化设计**: 控制器、服务和DAO的清晰分离
- **类型安全**: 完整的TypeScript覆盖和严格类型检查
- **状态管理**: 使用ahooks进行响应式状态管理和自动数据同步
- **防抖操作**: 带有性能优化的自动保存
- **错误处理**: 全面的错误边界和用户友好反馈
- **国际化**: 运行时语言切换，支持持久化偏好

### 添加新规则

1. **快速创建**: 使用弹窗界面快速创建规则
2. **格式支持**: 规则支持字符串匹配和正则表达式模式
3. **组织管理**: 分组帮助逻辑地组织相关规则
4. **验证检查**: 实时JSON格式检查，带有错误高亮
5. **规则管理**: 轻松启用/禁用、编辑、复制和删除操作

### 调试

#### 1. Service Worker调试

- 导航到 `chrome://extensions/`
- 找到"Switch V3"并点击"service worker"调试背景脚本
- 监控控制台日志以查看请求处理和规则匹配

#### 2. 弹窗界面调试

- 右键点击扩展图标 → "检查弹窗"
- 使用React DevTools进行组件状态检查
- 检查控制台查看前端错误和状态变化

#### 3. 网络监控

- 打开DevTools → Network标签观察请求重定向
- 检查Console查看规则匹配日志和性能指标
- 使用扩展的实时反馈进行规则验证

### 测试

项目包含全面的测试基础设施：

```bash
# 运行所有测试（监听模式）
pnpm run test

# 运行特定测试文件
pnpm run test -- json.test.ts
pnpm run test -- storage.test.ts

# 生成详细覆盖率报告
pnpm run test:coverage

# 运行带有可视化界面的测试
pnpm run test:ui
```

### 性能优化

- **智能缓存**: 规则被编译和缓存以实现闪电般的匹配速度
- **防抖保存**: 配置更改批量处理以最小化I/O操作
- **高效正则**: 模式编译一次并在请求间重复使用
- **内存管理**: 最小内存占用，自动垃圾回收
- **懒加载**: 组件和资源按需加载

## 🔒 安全性

- **本地存储**: 所有数据本地存储在Chrome storage中，无外部依赖
- **最小权限**: 仅请求核心功能所需的基本权限
- **内容安全策略**: 严格的CSP实现以增强安全性
- **无外部请求**: 扩展安装后完全离线运行
- **类型安全**: TypeScript防止常见安全漏洞
- **输入验证**: 对所有用户输入和配置进行全面验证

## 📚 API参考

### 规则配置格式

```typescript
interface GroupRuleVo {
  id: string;
  groupName: string;
  ruleText: string; // 包含proxy和cors规则的JSON字符串
  enabled: boolean;
  createTime: string;
  updateTime: string;
}

interface RuleConfig {
  proxy: [string, string][]; // [源, 目标] 对
  cors?: string[]; // 启用CORS的域名
}
```

### 背景API

扩展公开这些API用于前后端通信：

- **`LOAD_GROUPS`**: 加载所有规则组及元数据
- **`SAVE_GROUP`**: 保存单个规则组并验证
- **`CREATE_GROUP`**: 创建新规则组并设置默认值
- **`UPDATE_GROUP`**: 更新现有规则组属性
- **`DELETE_GROUP`**: 删除规则组并清理
- **`TOGGLE_GROUP`**: 启用/禁用规则组状态
- **`CLEAR_ALL_DATA`**: 重置所有数据到出厂设置

### 国际化API

```typescript
// 前端使用
const { t, locale, changeLocale } = useI18n();

// 后端使用
const i18n = createI18n(locale);
const message = i18n.t('error.loadFailed');
```

## 🤝 贡献

我欢迎社区贡献！请遵循以下指南：

### 开始贡献

1. **Fork仓库**并创建功能分支

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **设置开发环境**

   ```bash
   pnpm install
   pnpm run dev
   ```

3. **进行更改**并提供适当的TypeScript类型和文档

4. **为新功能添加全面测试**

   ```bash
   pnpm run test
   pnpm run test:coverage
   ```

5. **确保代码质量**

   ```bash
   pnpm run lint:fix
   pnpm run format
   pnpm run compile
   ```

6. **使用约定式提交**

   ```bash
   git commit -m "feat: add amazing feature"
   git commit -m "fix: resolve issue with rule matching"
   git commit -m "docs: update API documentation"
   ```

7. **提交拉取请求**并提供清晰的描述和截图（如适用）

### 开发指南

- **TypeScript**: 遵循严格模式要求并提供全面的类型
- **React模式**: 使用现代hooks模式和ahooks进行状态管理
- **测试**: 为所有新代码保持80%以上的测试覆盖率
- **代码风格**: 遵循现有模式并使用提供的代码检查配置
- **文档**: 为任何API更改或新功能更新文档
- **国际化**: 为任何面向用户的文本添加翻译

### 代码审查流程

1. 所有提交都需要维护者审查
2. 合并前必须通过自动化测试
3. 必须通过代码风格和类型检查
4. 功能更改应附带文档更新

## 🗺️ 开发路线图

### 短期目标（下个版本）

- [ ] **导入/导出**: 配置备份和共享功能
- [ ] **规则模板**: 常见开发场景的预构建规则集
- [ ] **高级过滤**: 支持请求头和HTTP方法过滤

### 中期目标

- [ ] **性能面板**: 实时统计和规则匹配指标
- [ ] **规则测试**: 内置规则验证测试工具
- [ ] **高级编辑器**: 增强的代码编辑器，支持自动完成和验证

### 长期目标

- [ ] **同步支持**: 跨设备规则同步（可选）
- [ ] **团队协作**: 开发团队的共享规则集
- [ ] **插件系统**: 自定义规则处理器的可扩展架构

## 📄 许可证

MIT License - 详情请参阅 [LICENSE](LICENSE) 文件

## 📝 更新日志

### 当前版本 (v1.0.0)

#### ✨ 新功能

- **完整Manifest V3兼容性**: 完全迁移到现代Chrome扩展API
- **现代React 19架构**: 最新React与并发特性和TypeScript
- **CodeMirror 6集成**: 高级代码编辑器，支持语法高亮
- **全面国际化**: 运行时语言切换，支持持久化偏好
- **自动保存功能**: 防抖自动保存，带有视觉反馈
- **实时验证**: JSON格式验证，带有错误高亮

#### 🔧 技术改进

- **ahooks集成**: 现代React hooks，更好的状态管理
- **WXT构建系统**: 下一代基于Vite的构建系统
- **全面测试**: 基于Vitest的测试，高覆盖率
- **类型安全**: 严格的TypeScript配置，完整类型覆盖
- **性能优化**: 智能缓存和高效规则匹配

#### 🎨 UI/UX增强

- **Ant Design 5**: 现代、可访问的UI组件
- **响应式设计**: 在弹窗和标签页模式下的完美体验
- **亮色主题**: 简洁一致的亮色主题设计
- **改进的可访问性**: 完整的键盘导航和屏幕阅读器支持

## 💬 支持

### 获取帮助

- **📋 问题**: 在 [GitHub Issues](https://github.com/your-repo/issues) 报告错误和请求功能
- **💬 讨论**: 加入社区讨论，获取使用问题和技巧
- **📖 文档**: 此README中的全面指南和内联代码注释

### 贡献支持

- **🔧 开发**: 遵循上述贡献指南
- **🌍 翻译**: 帮助改进国际化支持
- **📝 文档**: 为文档和示例做出贡献

## 🔄 从旧版本迁移

### 从xswitch v2或类似工具迁移：

1. **导出配置**: 从旧扩展保存现有规则

2. **安装Switch V3**: 按照上述安装指南操作

3. **转换规则**: 转换为新的JSON格式：

   ```json
   {
     "proxy": [
       ["https://old-api.com", "https://new-api.com"],
       ["(.*).staging.com", "$1.development.com"]
     ],
     "cors": ["api.example.com"]
   }
   ```

4. **彻底测试**: 验证所有规则按预期工作

5. **享受新功能**: 利用改进的性能和新功能

### 主要差异

- **结构化格式**: 更明确和经过验证的JSON配置
- **更好性能**: 优化的规则匹配和更低的资源使用
- **增强UI**: 现代界面，更好的可用性
- **面向未来**: 基于最新的Web标准和最佳实践构建

迁移将在稳定性、性能和用户体验方面带来显著改进。
