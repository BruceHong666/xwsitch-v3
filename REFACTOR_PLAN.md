# XSwitch -> XSwitch-V3 (WXT) 重构计划

## 1. 背景

现有 `xswitch` 项目是使用 Vite + React 手动构建的 Chrome 插件，虽然功能完整，但项目结构、构建流程较为复杂，不利于长期维护和功能迭代。`xswitch-v3` 项目已经使用 WXT 框架初始化，旨在利用其现代化的开发体验和简化的构建流程，对 `xswitch` 进行重构。

本次重构的目标不是全盘推翻，而是**有选择性地、分阶段地将核心逻辑和优秀实践迁移到新的 WXT 架构中**。

## 2. 核心目标

- **现代化架构**：全面拥抱 WXT 框架，简化入口点（entrypoints）管理、构建配置和热重载。
- **代码复用**：识别并迁移 `xswitch` 项目中与业务逻辑紧密相关、与框架解耦的代码，如工具函数、核心算法、状态管理逻辑等。
- **UI 分离**：将 `xswitch` 中的 React UI 组件迁移至 WXT 的 `entrypoints` 中，并适配新的项目结构。
- **Manifest V3 兼容**：确保所有功能在 Manifest V3 规范下正常工作。
- **分阶段进行**：将庞大的重构任务拆解为多个可管理、可验证的阶段。

## 3. 核心功能清单 (根据 PRD 和 Docs)

我们将确保以下核心功能在 `xswitch-v3` 中得到完整实现：

- [ ] **规则管理**：
  - [ ] 创建、编辑、删除规则组和规则。
  - [ ] 规则的启用/禁用状态切换。
- [ ] **请求转发/拦截**：
  - [ ] 基于规则匹配，对网络请求进行重定向或修改。
  - [ ] 支持 `declarativeNetRequest` API。
- [ ] **CORS 处理**：自动处理跨域请求问题。
- [ ] **缓存控制**：提供禁用缓存的选项。
- [ ] **Popup 界面**：
  - [ ] 快速切换规则启用状态。
  - [ ] 显示当前激活的规则。
- [ ] **Options 页面**：
  - [ ] 完整的规则配置界面。
  - [ ] 使用 CodeMirror 或类似编辑器进行规则编辑。
- [ ] **图标状态**：根据插件的启用状态切换浏览器图标。

## 4. 重构阶段规划

### Phase 1: 核心逻辑与数据结构迁移

此阶段专注于迁移不依赖 UI 的核心业务逻辑。

1.  **类型定义**:
    - **来源**: `xswitch/src/types/index.ts`
    - **目标**: `xswitch-v3/entrypoints/types/index.ts`
    - **任务**: 将核心类型（如 `Rule`, `RuleGroup`, `Config`）迁移过来，这是后续所有工作的基础。

2.  **存储工具**:
    - **来源**: `xswitch/src/utils/storage.ts`
    - **目标**: `xswitch-v3/utils/storage.ts` (需新建目录)
    - **任务**: WXT 提供了 `wxt/storage`，可以考虑使用官方库进行重写，以获得更好的类型支持和 API。

3.  **背景逻辑 (Background Script)**:
    - **来源**: `xswitch/src/background/index.ts`
    - **目标**: `xswitch-v3/entrypoints/background.ts`
    - **任务**:
      - 迁移请求拦截的核心逻辑。
      - 迁移规则匹配算法。
      - 迁移图标状态管理逻辑 (`iconManager.ts`)。

### Phase 2: Popup 界面迁移

1.  **Popup 主组件**:
    - **来源**: `xswitch/src/popup/Popup.tsx`
    - **目标**: `xswitch-v3/entrypoints/popup/App.tsx`
    - **任务**:
      - 迁移 Popup 的基本布局和样式。
      - 迁移 `RuleList.tsx` 组件，用于展示和切换规则。
      - 对接 `Phase 1` 中迁移的存储和背景逻辑。

2.  **静态资源**:
    - **来源**: `xswitch/public/icons/`
    - **目标**: `xswitch-v3/public/icon/`
    - **任务**: 迁移所有图标文件。

### Phase 3: Options 页面迁移

WXT 需要为 Options 页创建一个新的入口点。

1.  **创建 Options 入口点**:
    - **任务**: 在 `xswitch-v3/entrypoints/` 下创建 `options.html` 和 `options.tsx`。

2.  **Options 主组件**:
    - **来源**: `xswitch/src/options/Options.tsx`
    - **目标**: `xswitch-v3/entrypoints/options.tsx`
    - **任务**:
      - 迁移 Options 页面的整体布局。
      - 重点迁移和适配 `CodeMirrorEditor.tsx` 组件。
      - 对接完整的规则增删改查逻辑。

### Phase 4: 国际化 (i18n) 和其他功能

1.  **i18n**:
    - **来源**: `xswitch/src/i18n/`
    - **目标**: 在 `xswitch-v3` 中实现类似机制。WXT 对 i18n 有内置支持，可以查阅其文档进行适配。

2.  **Content Script**:
    - **来源**: `xswitch/src/content/index.ts`
    - **目标**: `xswitch-v3/entrypoints/content.ts`
    - **任务**: 如果有需要注入到页面的逻辑，迁移此部分。

## 5. 建议优先迁移的代码片段

以下是从 `xswitch` 挑选出的、价值最高且相对独立的代码，建议作为迁移的起点：

- `xswitch/src/types/index.ts`: **(最优先)** 定义了整个应用的数据模型。
- `xswitch/src/utils/storage.ts`: 封装了浏览器存储，是数据持久化的关键。
- `xswitch/src/utils/iconManager.ts`: 管理插件图标状态，逻辑独立。
- `xswitch/src/components/RuleList.tsx`: 核心的规则列表组件，可在 Popup 和 Options 页面复用。
- `xswitch/src/components/CodeMirrorEditor.tsx`: 提供了强大的规则编辑功能。

---

下一步，我将把上述内容写入项目根目录的 `REFACTOR_PLAN.md` 文件。请确认，然后我们将依据此计划开始第一阶段的编码工作。
