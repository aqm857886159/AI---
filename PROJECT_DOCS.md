# AI嘚吧嘚 项目文档

> **版本**: 2.0  
> **最后更新**: 2025-12-28  
> **文档目的**: 帮助 AI 在每次改动时快速理解项目架构和遵守开发规范

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [目录结构](#3-目录结构)
4. [核心功能模块](#4-核心功能模块)
5. [架构与数据流](#5-架构与数据流)
6. [AI 角色与 Prompt 设计](#6-ai-角色与-prompt-设计)
7. [状态管理](#7-状态管理)
8. [类型定义速查](#8-类型定义速查)
9. [开发规范](#9-开发规范)
10. [AI 改动准则](#10-ai-改动准则)
11. [常见问题](#11-常见问题)
12. [修改日志](#12-修改日志)

---

## 1. 项目概述

### 1.1 产品定位

**AI嘚吧嘚** 是一款智能写作助手，帮助用户润色和优化文章。核心特点：

- **多角色 AI 点评**: 4 位性格各异的 AI 专家从不同角度评论文章
- **全文/选区修订**: 提供段落级别的修改建议，红删绿增可视化
- **夸夸高亮系统**: 自动识别文章亮点并给予鼓励
- **智能标题生成**: 根据文章内容推荐吸引人的标题

### 1.2 核心价值

```
用户输入文章 → AI 多角度点评 → 可视化修订建议 → 用户逐条接受/拒绝 → 优化完成
```

### 1.3 项目路径

| 路径 | 说明 |
|------|------|
| `d:\AI嘚吧嘚\` | 工作区根目录 |
| `d:\AI嘚吧嘚\ai-debade\` | 前端项目目录 |
| `d:\AI嘚吧嘚\ai-debade\src\` | 源代码目录 |

---

## 2. 技术栈

### 2.1 核心依赖

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.2.0 | UI 框架 |
| **TypeScript** | 5.9.3 | 类型安全 |
| **Vite** | 7.2.4 | 构建工具 |
| **Tiptap** | 3.14.0 | 富文本编辑器（基于 ProseMirror） |
| **Zustand** | 5.0.9 | 状态管理 |
| **Framer Motion** | 12.23.26 | 动画效果 |

### 2.2 重要依赖说明

| 依赖 | 用途 |
|------|------|
| `@tiptap/react` | 编辑器 React 绑定 |
| `@tiptap/starter-kit` | 编辑器基础扩展包 |
| `diff-match-patch` | 文本差异比对 |
| `prosemirror-changeset` | 修订追踪 |
| `canvas-confetti` | 夸夸粒子效果 |
| `lucide-react` | 图标库 |

### 2.3 AI 服务

- **提供商**: OpenRouter
- **默认模型**: `deepseek/deepseek-v3.2`
- **API 端点**: `https://openrouter.ai/api/v1`

---

## 3. 目录结构

### 3.1 顶层目录

```
d:\AI嘚吧嘚\
├── ai-debade/              # 主项目目录
├── AI_CONTEXT_AUDIT.md     # AI 上下文审查文档（参考）
├── AI_PRAISE_FEATURE_DESIGN.md # 夸夸功能设计文档（参考）
├── README.md               # 用户手册
└── PROJECT_DOCS.md         # 本文档
```

### 3.2 源代码结构

```
ai-debade/src/
├── app/                    # 应用入口
│   ├── App.tsx            # 主应用组件（布局、侧边栏）
│   └── App.css            # 全局样式
│
├── components/             # UI 组件
│   ├── editor/            # 编辑器相关
│   │   ├── Editor.tsx     # 主编辑器组件
│   │   ├── Editor.css     # 编辑器样式
│   │   ├── SelectionToolbar.tsx  # 选区工具栏
│   │   └── SelectionToolbar.css
│   │
│   ├── panel/             # 面板组件
│   │   ├── CommentPanel.tsx    # AI 评论面板
│   │   ├── CommentPanel.css
│   │   └── CharacterSelectStyles.css
│   │
│   ├── praise/            # 夸夸 UI 组件
│   │   ├── CinematicPraise.tsx  # 电影式夸夸弹窗
│   │   └── PraiseStyles.css
│   │
│   ├── TitleGenerator.tsx # 标题生成组件
│   ├── Settings.tsx       # 设置弹窗
│   ├── CharacterManager.tsx    # 角色管理弹窗
│   └── CharacterSelector.tsx   # 角色选择器
│
├── config/                 # 配置
│   ├── constants.ts       # 全局常量
│   └── characters.ts      # AI 角色定义
│
├── features/               # 业务功能模块 ⭐
│   ├── index.ts           # 统一导出
│   │
│   ├── ai-review/         # AI 评论功能
│   │   ├── index.ts
│   │   ├── types.ts       # 类型定义
│   │   ├── useAIReview.ts # 核心 Hook
│   │   └── reviewService.ts
│   │
│   ├── revision/          # 修订追踪功能
│   │   ├── index.ts
│   │   ├── types.ts       # 类型定义
│   │   ├── useRevision.ts # 核心 Hook
│   │   ├── revisionService.ts
│   │   └── trackChangesPlugin.ts  # ProseMirror 插件
│   │
│   └── praise/            # 夸夸功能
│       ├── index.ts
│       ├── types.ts       # 类型定义
│       ├── usePraise.ts   # 核心 Hook
│       ├── praiseService.ts
│       └── praisePlugin.ts # ProseMirror 插件
│
├── services/               # 服务层
│   ├── openrouter.ts      # OpenRouter API 封装
│   └── utils/
│       └── diffUtils.ts   # 差异计算工具
│
├── store/                  # 状态管理
│   ├── useStore.ts        # 主 Store
│   └── slices/
│       ├── createAISlice.ts      # AI 角色/评论状态
│       ├── createContentSlice.ts # 文章内容状态
│       ├── createRevisionSlice.ts # 修订状态
│       └── createPraiseSlice.ts  # 夸夸状态
│
├── types/                  # 通用类型
│   └── global.ts
│
├── utils/                  # 工具函数
│   └── helpers.ts
│
├── index.css              # 全局基础样式
└── main.tsx               # 入口文件
```

### 3.3 关键约定

| 约定 | 说明 |
|------|------|
| `features/` | 业务逻辑层，每个功能独立文件夹 |
| `components/` | 纯 UI 组件，不含业务逻辑 |
| `services/` | 外部服务调用（API、工具函数） |
| `store/slices/` | Zustand 状态切片，按功能划分 |
| `use*.ts` | 自定义 Hook 文件命名规范 |
| `*Service.ts` | 服务层文件命名规范 |

---

## 4. 核心功能模块

### 4.1 AI 评论系统 (`features/ai-review/`)

#### 功能概述
- 用户点击"AI嘚吧嘚"按钮，4 位 AI 角色依次生成评论
- 支持全文评论和选区评论两种模式
- 每位角色同时返回评论文本和修订建议

#### 核心文件

| 文件 | 职责 |
|------|------|
| `useAIReview.ts` | 评论生成流程控制 Hook |
| `reviewService.ts` | 角色评论 API 调用封装 |
| `types.ts` | `AICharacter`, `Comment`, `CharacterRevisionOutput` 类型 |

#### 数据流

```
用户点击 → useAIReview.startReview()
  → 遍历选中角色
  → reviewService.generateCharacterReview()
  → openRouterService.getCommentWithRevisions()
  → 解析 JSON 响应
  → store.addComment() + 合并修订
  → 触发 UI 更新
```

#### 关键函数

```typescript
// useAIReview.ts
startReview(selectedCharacterIds: string[]): Promise<void>
startSelectionReview(selectedText: string, paragraphs: [...]): Promise<void>
generateRewriteFromComment(commentContent: string): Promise<void>
```

---

### 4.2 修订追踪系统 (`features/revision/`)

#### 功能概述
- 显示"红删绿增"式的修改对比
- 每处修改可独立接受或拒绝
- 支持全部接受/全部拒绝

#### 核心文件

| 文件 | 职责 |
|------|------|
| `useRevision.ts` | 修订操作逻辑 Hook |
| `revisionService.ts` | 修订数据处理（合并、调整索引） |
| `trackChangesPlugin.ts` | ProseMirror 渲染插件 |
| `types.ts` | `ParagraphChange`, `FullTextRewrite` 类型 |

#### 数据流

```
AI 返回修订 → createParagraphChangesFromRevisions()
  → 计算 inlineDiff
  → store.setFullTextRewrite()
  → trackChangesPlugin 渲染装饰

用户点击接受 → useRevision.acceptChange()
  → applyChangeToDocument()
  → adjustIndicesAfterAccept()
  → 更新 store
```

#### 关键函数

```typescript
// useRevision.ts
acceptChange(changeId: string, editor: any): void
rejectChange(changeId: string): void
acceptAllChanges(editor: any): void
rejectAllChanges(): void
```

---

### 4.3 夸夸高亮系统 (`features/praise/`)

#### 功能概述
- 自动检测写作进步，给予鼓励
- 识别金句、情感表达、逻辑清晰等亮点
- 每增写 300 字触发一次夸夸检测

#### 核心文件

| 文件 | 职责 |
|------|------|
| `usePraise.ts` | 夸夸触发和状态管理 Hook |
| `praiseService.ts` | 夸夸 API 调用封装 |
| `praisePlugin.ts` | ProseMirror 高亮渲染插件 |
| `types.ts` | `PraiseRecord`, `PraiseHighlight` 类型 |

#### 触发机制

```
编辑器内容变化 → useAutoPraise 检测字数增量
  → 增量 >= 300 字 → praiseService.generateIncrementalPraise()
  → 增量 >= 500 字 → praiseService.generateBulkPraise()
  → 结果存入 store.praiseHistory
  → 触发彩蛋动画
```

#### 夸夸类型

| 类型 | 说明 |
|------|------|
| `golden_sentence` | 金句 |
| `fluency` | 流畅表达 |
| `logic` | 逻辑清晰 |
| `emotion` | 情感共鸣 |
| `progress` | 写作进步 |

---

### 4.4 标题生成 (`components/TitleGenerator.tsx`)

#### 功能概述
- 根据文章内容生成吸引人的标题
- 显示推荐理由

#### 数据流

```
点击"标题生成" → openRouterService.generateTitle()
  → 返回 { title, reason }
  → 更新 UI
```

---

## 5. 架构与数据流

### 5.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           App.tsx (布局层)                           │
├─────────────────────────────────────────────────────────────────────┤
│           │                              │                          │
│   TitleGenerator          Editor                    CommentPanel    │
│           │                              │                          │
│           │         ┌───────────────────┼──────────────────┐        │
│           │         │                   │                  │        │
│           │   SelectionToolbar   trackChangesPlugin  praisePlugin   │
│           │         │                   │                  │        │
└───────────┼─────────┼───────────────────┼──────────────────┼────────┘
            │         │                   │                  │
            └────────┬┼────────────────────┼─────────────────┘
                     ││                    │
         ┌───────────┘│                    │
         │            │                    │
    ┌────▼────┐  ┌────▼────┐        ┌─────▼─────┐
    │useAIReview│ │useRevision│       │ usePraise │
    └────┬────┘  └────┬────┘        └─────┬─────┘
         │            │                   │
         └────────────┼───────────────────┘
                      │
              ┌───────▼───────┐
              │   useStore    │ (Zustand)
              │   (4 Slices)  │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │ openRouterService │
              └───────┬───────┘
                      │
                      ▼
              OpenRouter API
```

### 5.2 模块依赖关系

```
components/
    └── 依赖 → features/ (通过 Hooks)
                   └── 依赖 → services/ (API 调用)
                                  └── 依赖 → config/ (常量)

store/
    └── 被 features/ 和 components/ 消费
```

### 5.3 禁止的依赖方向

- ❌ `services/` 不得依赖 `components/`
- ❌ `config/` 不得依赖任何其他模块
- ❌ `store/` 不得直接调用 `services/`（应通过 Hooks）

---

## 6. AI 角色与 Prompt 设计

### 6.1 默认角色列表

| ID | 名称 | 职责 | 关键词 |
|----|------|------|--------|
| `doctor` | 老张 (纠错) | 语法、错别字、标点 | 严谨、毒舌 |
| `polisher` | 婉儿 (润色) | 文采、感染力 | 优雅、细腻 |
| `logic` | 阿基 (逻辑) | 论点、论据、结构 | 理性、硬核 |
| `creative` | 皮皮 (脑洞) | 创意、新颖角度 | 跳脱、幽默 |
| `praise` | 夸夸 (高光) | 识别亮点（隐藏角色） | 温暖、粉丝视角 |

### 6.2 Prompt 输出格式

每个角色的 Prompt 要求 AI 返回 JSON 格式：

```json
{
  "comment": "总体评价（40-60字）",
  "revisions": [
    {
      "type": "replace",
      "original": "原文片段（精确匹配）",
      "improved": "改进后文本",
      "reason": "修改理由（5-10字）"
    }
  ]
}
```

### 6.3 Prompt 设计原则

| 原则 | 说明 |
|------|------|
| **精确匹配** | `original` 必须是原文的精确子串 |
| **简洁理由** | `reason` 控制在 5-15 字 |
| **分工明确** | 每个角色只做自己的事，不越界 |
| **说人话** | 避免学术术语，用日常表达 |

### 6.4 修改 Prompt 须知

> ⚠️ **警告**: Prompt 已经过多次调优，修改前请与用户确认！

修改时需注意：
1. 保持 JSON 输出格式不变
2. 不要改变评分标准（如有）
3. 测试至少 3 篇不同风格的文章

---

## 7. 状态管理

### 7.1 Store 结构

使用 Zustand 的 Slice 模式，将状态按功能拆分：

```typescript
// store/useStore.ts
export type AppState = ContentSlice & AISlice & RevisionSlice & PraiseSlice;
```

### 7.2 各 Slice 职责

#### ContentSlice - 文章内容

```typescript
interface ContentSlice {
    content: string;           // 当前文章内容 (HTML)
    setContent: (c: string) => void;
}
```

#### AISlice - AI 角色与评论

```typescript
interface AISlice {
    characters: AICharacter[];     // 角色列表
    comments: Comment[];           // 评论列表
    isGeneratingComments: boolean; // 生成中标志
    aiSuggestions: AISuggestion[]; // AI 建议列表
    
    // UI 状态
    showSettings: boolean;
    showCharacterManager: boolean;
    
    // Actions
    addCharacter / removeCharacter / updateCharacter
    addComment / clearComments
    addAISuggestion / removeAISuggestion
    setShowSettings / setShowCharacterManager
}
```

#### RevisionSlice - 修订状态

```typescript
interface RevisionSlice {
    fullTextRewrite: FullTextRewrite | null;  // 当前修订会话
    isRewriting: boolean;                      // 改写中标志
    workflowStage: WorkflowStage;             // 工作流阶段
    
    setFullTextRewrite / setIsRewriting / setWorkflowStage
}
```

#### PraiseSlice - 夸夸状态

```typescript
interface PraiseSlice {
    praiseHistory: PraiseRecord[];  // 夸夸历史
    readPraises: Set<string>;       // 已读夸夸 ID
    wordCountState: WordCountState; // 字数追踪
    
    addPraiseRecord / markPraiseAsRead / clearPraiseHistory
    setWordCount
}
```

### 7.3 状态使用示例

```typescript
// 在组件中使用
const comments = useStore(state => state.comments);
const addComment = useStore(state => state.addComment);

// 在 Hook 中使用
const fullTextRewrite = useStore(state => state.fullTextRewrite);
const setFullTextRewrite = useStore(state => state.setFullTextRewrite);
```

---

## 8. 类型定义速查

### 8.1 AI 评论相关

```typescript
// features/ai-review/types.ts

interface AICharacter {
    id: string;
    name: string;
    avatar: string | React.ElementType;
    avatarUrl?: string;
    personality: string;
    style: string[];
    systemPrompt: string;
    isCustom: boolean;
    hiddenFromPanel?: boolean;
}

interface Comment {
    id: string;
    characterId: string;
    type: 'full' | 'selection';
    content: string;
    position?: { from: number; to: number };
    suggestion?: string;
    timestamp: number;
}

interface CharacterRevisionOutput {
    comment: string;
    revisions: RevisionItem[];
}
```

### 8.2 修订相关

```typescript
// features/revision/types.ts

type ParagraphChangeType = 'modified' | 'added' | 'deleted' | 'praise';

interface ParagraphChange {
    id: string;
    index: number;
    type: ParagraphChangeType;
    originalText: string;
    improvedText?: string;
    inlineDiff?: InlineDiffPart[];
    reason?: string;
    nodePos: number;
    sourceCharacterId?: string;
    sourceCharacterName?: string;
}

interface RevisionItem {
    type: 'replace' | 'insert_after' | 'delete' | 'suggest';
    original: string;
    improved: string;
    reason: string;
}

interface FullTextRewrite {
    id: string;
    originalText: string;
    improvedText: string;
    paragraphChanges: ParagraphChange[];
    timestamp: number;
}
```

### 8.3 夸夸相关

```typescript
// features/praise/types.ts

type PraiseType = 'golden_sentence' | 'fluency' | 'logic' | 'emotion' | 'progress' | 'rhetoric' | 'insight';

interface PraiseRecord {
    id: string;
    timestamp: number;
    type: PraiseType;
    quote?: string;
    wow: string;
    reason: string;
    wordCountWhen: number;
}

interface PraiseHighlight {
    id: string;
    type: PraiseType;
    quote: string;
    reason: string;
    wow?: string;
}
```

---

## 9. 开发规范

### 9.1 代码风格

| 规范 | 说明 |
|------|------|
| **缩进** | 4 空格 |
| **引号** | 单引号 |
| **分号** | 必须 |
| **行尾逗号** | ES5 风格 |
| **文件命名** | 组件 PascalCase，工具 camelCase |

### 9.2 组件设计原则

1. **单一职责**: 每个组件只做一件事
2. **UI/逻辑分离**: 组件只负责渲染，逻辑放 Hooks
3. **Props 类型**: 必须定义 TypeScript 接口
4. **注释**: 每个文件顶部必须有 `@module` 和 `@description`

### 9.3 文件头注释模板

```typescript
/**
 * @module [模块路径]
 * @description [功能描述] - 单一职责：[职责说明]
 * 
 * 职责：
 * - [职责1]
 * - [职责2]
 */
```

### 9.4 调试日志规范

项目使用 emoji 前缀的调试日志，便于追踪：

```typescript
console.log('🎭 [App] 组件渲染');
console.log('✅ [useRevision] 接受修改:', changeId);
console.log('❌ [useRevision] 拒绝修改:', changeId);
console.log('✨ [AutoPraise] 生成夸夸');
console.log('📊 [AutoPraise] 字数统计');
console.log('🗄️ [useStore] Store 构建');
```

> ⚠️ **不要删除这些日志**，它们用于开发调试。

---

## 10. AI 改动准则

### 10.1 改动前必读清单

在进行任何代码修改之前，AI 必须：

- [ ] 阅读本文档的相关模块章节
- [ ] 确认改动不会破坏模块依赖关系（参见 5.3）
- [ ] 检查是否需要同步更新类型定义
- [ ] 了解该模块的设计约束

### 10.2 禁止事项

| 禁止行为 | 原因 |
|---------|------|
| 删除带 emoji 前缀的 console.log | 这些是有意保留的调试日志 |
| 修改 `config/constants.ts` 常量值而不通知用户 | 可能影响用户体验和 API 成本 |
| 在组件中直接调用 `openRouterService` | 应通过 `features/` 层的 Hooks 封装 |
| 合并或拆分现有的 Zustand slices | 会破坏状态管理架构 |
| 修改 AI 角色的 systemPrompt 而不通知用户 | Prompt 已经过调优 |
| 删除或重命名 `features/index.ts` 的导出 | 会破坏其他模块的导入 |

### 10.3 改动后检查项

每次完成改动后，AI 应：

1. 确保 TypeScript 编译无错误 (`npm run build`)
2. 确保开发服务器正常运行 (`npm run dev`)
3. 在本文档"修改日志"章节添加记录
4. 如涉及架构变更，更新"架构与数据流"章节
5. 如添加新功能，更新"核心功能模块"章节

### 10.4 文件修改指引

| 修改类型 | 涉及文件 | 注意事项 |
|---------|---------|---------|
| 添加新 AI 角色 | `config/characters.ts` | 遵循现有角色格式 |
| 修改评论生成逻辑 | `features/ai-review/` | 先读 `useAIReview.ts` |
| 修改修订渲染 | `features/revision/trackChangesPlugin.ts` | ProseMirror 知识必备 |
| 修改夸夸触发条件 | `config/constants.ts` + `features/praise/usePraise.ts` | 检查阈值常量 |
| 修改 UI 样式 | 对应 `.css` 文件 | 保持玻璃态设计风格 |

---

## 11. 常见问题

### Q1: 如何添加新的 AI 角色？

1. 在 `config/characters.ts` 的 `DEFAULT_CHARACTERS` 数组中添加新角色
2. 遵循 `AICharacter` 接口格式
3. 编写 `systemPrompt`，确保输出格式与现有角色一致

### Q2: 如何修改修订的视觉样式？

修改 `components/editor/Editor.css` 中的以下类：
- `.diff-deletion` - 删除内容样式
- `.diff-insertion` - 新增内容样式
- `.paragraph-actions-floating` - 操作按钮样式

### Q3: 如何调整夸夸触发频率？

修改 `config/constants.ts`：
```typescript
export const PRAISE_TRIGGER_THRESHOLD = 300;  // 字数阈值
export const PRAISE_DEBOUNCE_MS = 2000;       // 防抖时间
```

### Q4: 为什么评论生成失败？

检查以下可能原因：
1. API Key 未配置 → 打开设置弹窗
2. 网络问题 → 查看控制台错误
3. 模型余额不足 → 检查 OpenRouter 账户

### Q5: 如何理解 ProseMirror 插件？

关键文件：
- `features/revision/trackChangesPlugin.ts` - 修订装饰
- `features/praise/praisePlugin.ts` - 夸夸高亮

核心概念：
- `Plugin` - 插件定义
- `PluginKey` - 插件状态访问
- `Decoration` - 视觉装饰

---

## 12. 修改日志

### 2025-12-28

- **[文档]** 创建 `PROJECT_DOCS.md` 项目文档
  - 包含完整的项目架构说明
  - 包含 AI 改动准则和开发规范
  - 包含类型定义速查表

---

## 附录 A: 常量配置速查

```typescript
// config/constants.ts

// AI 配置
DEFAULT_AI_MODEL = 'deepseek/deepseek-v3.2'
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
DEFAULT_TEMPERATURE = 0.7
HIGH_CREATIVITY_TEMPERATURE = 0.8

// 夸夸配置
PRAISE_TRIGGER_THRESHOLD = 300   // 字
PRAISE_DEBOUNCE_MS = 2000        // 毫秒
BULK_PRAISE_MAX_CHARS = 5000     // 字
INCREMENTAL_PRAISE_WINDOW = 500  // 字

// 修订配置
SIGNIFICANT_CHANGE_RATIO = 0.05  // 5%
HOVER_PREVIEW_DELAY_MS = 300     // 毫秒

// UI 配置
SIDEBAR_MIN_WIDTH = 250          // 像素
SIDEBAR_MAX_WIDTH = 800          // 像素
SIDEBAR_DEFAULT_WIDTH = 340      // 像素
MIN_CONTENT_LENGTH = 50          // 字

// 评论限制
MAX_COMMENT_LENGTH = 50          // 字
MAX_REASON_LENGTH = 15           // 字
```

---

## 附录 B: 快速启动

```bash
# 安装依赖
cd d:\AI嘚吧嘚\ai-debade
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
tsc --noEmit
```

---

**文档结束** | 如需更新，请修改此文件并在"修改日志"章节记录。
