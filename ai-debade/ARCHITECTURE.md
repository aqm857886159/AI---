# AI嘚吧嘚 - 架构设计文档

## 核心功能

### 1. 全文评论 + 修订模式

**触发：** 用户点击右侧"🔄 让AI们嘚吧嘚"按钮

**流程：**
```
用户点击🔄
↓
并行执行两个任务：
├─ 任务A：8个AI角色依次生成全文评论 → 显示在右侧CommentPanel
└─ 任务B：纠错小助手生成全文改写 → 进入修订模式

修订模式：
1. 获取原文 + AI改写版
2. 计算diff → 生成DiffMark数组
3. 在编辑器中渲染修改标记：
   - 删除内容：红色删除线
   - 新增内容：黄色高亮
   - 替换内容：红色删除线 + 黄色高亮
4. 每个标记可独立交互：
   - 鼠标悬停 → 显示浮窗（✓接受 ✕拒绝）
   - 点击接受 → 应用修改，移除标记
   - 点击拒绝 → 保留原文，移除标记
```

### 2. 选中文本快速改写

**触发：** 用户选中文本 → 点击"✨ AI嘚吧嘚"

**流程：**
```
选中文本
↓
显示工具栏（格式化按钮 + AI按钮）
↓
点击AI按钮
↓
文本高亮为黄色（表示处理中）
↓
AI返回改写
↓
在选中文本下方显示diff卡片
↓
用户选择接受/拒绝
```

## 技术架构

### 数据流

```
CommentPanel (右侧面板)
  ↓ 点击🔄
  ↓
openRouterService.getFullComment() ← 8个AI角色
openRouterService.getRewriteSuggestion() ← 纠错小助手
  ↓
computeDiff(原文, 改写版)
  ↓
diffToMarks() → DiffMark[]
  ↓
Store.setFullTextRewrite()
  ↓
Editor监听fullTextRewrite变化
  ↓
渲染修订标记（使用HTML spans）
  ↓
用户交互 → acceptDiffMark() / rejectDiffMark()
```

### 核心组件

**1. CommentPanel** (`src/components/CommentPanel.tsx`)
- 显示8个AI评论
- "🔄 让AI们嘚吧嘚"按钮
- 触发全文改写

**2. Editor** (`src/components/Editor.tsx`)
- Tiptap编辑器
- 监听`fullTextRewrite`状态
- 渲染修订标记
- 处理用户交互

**3. DiffMarkTooltip** (新建 `src/components/DiffMarkTooltip.tsx`)
- 悬停在修改处时显示
- 显示"接受/拒绝"按钮

**4. diffService** (`src/services/diffService.ts`)
- `computeDiff()` - 计算文本差异
- `diffToMarks()` - 转换为独立修改点
- `diffToHTML()` - 渲染带样式的HTML

### 状态管理 (Zustand)

```typescript
interface AppState {
  // 全文改写（修订模式）
  fullTextRewrite: FullTextRewrite | null;
  setFullTextRewrite: (rewrite: FullTextRewrite | null) => void;
  acceptDiffMark: (markId: string) => void;
  rejectDiffMark: (markId: string) => void;
}

interface FullTextRewrite {
  id: string;
  originalText: string;
  improvedText: string;
  diffMarks: DiffMark[]; // 所有修改点
  timestamp: number;
}

interface DiffMark {
  id: string;
  type: 'delete' | 'insert' | 'replace';
  originalText?: string;
  newText?: string;
  position: { from: number; to: number };
}
```

## 视觉设计

### 修订标记样式

**删除标记：**
```css
.diff-mark-delete {
  background: #ffebee;
  color: #999;
  text-decoration: line-through;
  cursor: pointer;
}
```

**插入标记：**
```css
.diff-mark-insert {
  background: #fff3cd;
  color: #000;
  cursor: pointer;
}
```

**替换标记：**
```html
<span class="diff-mark-delete">原文</span><span class="diff-mark-insert">新文本</span>
```

### 交互浮窗

```
┌─────────────────┐
│ ✓ 接受  ✕ 拒绝  │
└─────────────────┘
      ↑
 [修改的文本]
```

## 实现步骤

1. ✅ 更新types定义（DiffMark, FullTextRewrite）
2. ✅ 更新diffService（diffToMarks函数）
3. ✅ 更新store（fullTextRewrite状态）
4. ⏳ 修改CommentPanel - 添加触发全文改写逻辑
5. ⏳ 修改Editor - 渲染修订标记
6. ⏳ 创建DiffMarkTooltip - 交互浮窗
7. ⏳ 测试完整流程

## 用户体验要点

1. **即时反馈**：点击🔄后立即显示loading状态
2. **渐进呈现**：8个评论依次出现（不是一次性）
3. **清晰标记**：删除线vs高亮，视觉区分明显
4. **独立控制**：每个修改点独立交互
5. **一键采纳**："全部接受"按钮（可选功能）
