# 修订功能修复计划

## 🔴 核心问题诊断

经过深入审查，我发现了**根本性架构问题**：

### 问题1: Widget不是DOM子元素

```
ProseMirror <p class="revision-paragraph-block">
  │
  ├─ 文本内容 (可以用inline decoration)
  │
  └─ Widget按钮 (不是<p>的子元素！)
      Widget原因 (不是<p>的子元素！)
```

**后果**:
- CSS的`position: relative`在`.revision-paragraph-block`上
- 但Widget不在这个元素内部
- 所以`float: right`、`margin-top`等都可能失效

---

### 问题2: Decoration.node的限制

```typescript
Decoration.node(pos, pos + node.nodeSize, {
  class: 'revision-paragraph-block',  // 只能添加类名
  'data-revision-id': changeId,       // 和data属性
})
```

**不能做的**:
- ❌ 不能wrap元素（不能创建外层div）
- ❌ 不能在段落内部插入DOM（只能在前/后）
- ❌ 不能控制段落的HTML结构

---

## 💡 根本解决方案

### 方案A: 完全重构为包装器模式（推荐）

**核心思路**: 不改变原段落，在其后插入完整的修订块

```typescript
// 1. 隐藏原段落
Decoration.inline(pos, pos + node.nodeSize, {
  class: 'original-hidden',
  style: 'display: none'
});

// 2. 在段落后插入完整的修订块
Decoration.widget(pos + node.nodeSize, () => {
  const container = document.createElement('div');
  container.className = 'revision-block-wrapper';

  // 头部（按钮区）
  const header = document.createElement('div');
  header.className = 'revision-header';
  header.innerHTML = `
    <button class="revision-btn accept">✓</button>
    <button class="revision-btn reject">✗</button>
  `;

  // 内容区（显示修订）
  const body = document.createElement('div');
  body.className = 'revision-body';
  body.innerHTML = renderInlineDiff(change.inlineDiff);

  // 底部（原因）
  const footer = document.createElement('div');
  footer.className = 'revision-footer';
  footer.textContent = `📝 ${change.reason}`;

  container.appendChild(header);
  container.appendChild(body);
  container.appendChild(footer);

  // 绑定事件
  header.querySelector('.accept').onclick = () => { ... };
  header.querySelector('.reject').onclick = () => { ... };

  return container;
}, { side: 1 });
```

**CSS**:
```css
.revision-block-wrapper {
  display: block;
  position: relative;
  border: 2px solid var(--border-concrete);
  border-left: 4px solid var(--color-obsidian);
  background: var(--color-concrete-50);
  padding: 16px;
  margin: 16px 0;
  border-radius: var(--radius-sm);
}

.revision-header {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
}

.revision-body {
  margin: 8px 0;
  line-height: 1.85;
}

.revision-footer {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border-concrete);
  font-size: 11px;
  color: var(--text-secondary);
}
```

**优点**:
- ✅ 完全控制DOM结构
- ✅ CSS布局简单可靠
- ✅ 不依赖hack（float、负margin等）
- ✅ 符合Grammarly/Tiptap的模式

**缺点**:
- 原段落被隐藏，用户无法直接编辑（但这可能是期望行为）

---

### 方案B: 使用NodeView（Tiptap推荐）

```typescript
// 创建自定义NodeView
const RevisionNodeView = {
  render() {
    const dom = document.createElement('div');
    dom.className = 'revision-paragraph-wrapper';

    const contentDOM = document.createElement('div');
    contentDOM.className = 'revision-content';

    const controls = document.createElement('div');
    controls.className = 'revision-controls';
    controls.innerHTML = `
      <button class="accept">✓</button>
      <button class="reject">✗</button>
    `;

    const footer = document.createElement('div');
    footer.className = 'revision-footer';
    footer.textContent = this.node.attrs.reason;

    dom.appendChild(controls);
    dom.appendChild(contentDOM);
    dom.appendChild(footer);

    return { dom, contentDOM };
  }
};

// 注册Extension
editor.registerExtension(Extension.create({
  addNodeView() {
    return RevisionNodeView;
  }
}));
```

**优点**:
- ✅ Tiptap官方推荐方式
- ✅ 完整的DOM控制
- ✅ 可以保留编辑能力

**缺点**:
- 需要修改ProseMirror schema
- 实现复杂度更高

---

## 🚀 快速修复方案（临时）

在不改变架构的情况下，尝试让当前实现工作：

### 修复1: 改用block-level widget

```typescript
// 不要用pos（段落开始），而是用pos + node.nodeSize（段落结束）
// 然后用display: block让widget独占一行

decorations.push(
  Decoration.widget(pos + node.nodeSize, () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'revision-controls-wrapper';
    wrapper.style.cssText = `
      display: block;
      position: relative;
      margin: -8px 0 8px 0;
      padding: 8px 12px;
      background: var(--color-concrete-50);
      border: 2px solid var(--border-concrete);
      border-radius: var(--radius-sm);
    `;

    wrapper.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11px; color: var(--text-secondary);">
          📝 ${change.reason}
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="revision-btn accept">✓</button>
          <button class="revision-btn reject">✗</button>
        </div>
      </div>
    `;

    // 事件绑定
    wrapper.querySelector('.accept').onclick = () => { ... };
    wrapper.querySelector('.reject').onclick = () => { ... };

    return wrapper;
  }, { side: 1 })
);
```

### 修复2: 合并按钮和原因到一个widget

不要分开创建按钮widget和原因widget，合并到一起：

```typescript
// 只在段落结束创建一个widget
decorations.push(
  Decoration.widget(pos + node.nodeSize, () => {
    const panel = document.createElement('div');
    panel.className = 'revision-panel';
    panel.innerHTML = `
      <div class="revision-panel-content">
        <span class="revision-reason">📝 ${change.reason}</span>
        <div class="revision-actions">
          <button class="revision-btn accept" data-change-id="${changeId}">✓</button>
          <button class="revision-btn reject" data-change-id="${changeId}">✗</button>
        </div>
      </div>
    `;

    panel.querySelector('.accept').addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('accept-paragraph-change', {
        detail: { changeId }
      }));
    });

    panel.querySelector('.reject').addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('reject-paragraph-change', {
        detail: { changeId }
      }));
    });

    return panel;
  }, { side: 1 })
);
```

**CSS**:
```css
.revision-panel {
  display: block;
  margin: 8px 0;
  padding: 8px 12px;
  background: var(--color-concrete-50);
  border: 1px solid var(--border-concrete);
  border-radius: var(--radius-sm);
}

.revision-panel-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.revision-reason {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.revision-actions {
  display: flex;
  gap: 6px;
}
```

---

## 📋 实施步骤

### 阶段1: 快速修复（1小时）

1. **合并widget** - 修改EditorNew.tsx
   - 删除分开的按钮widget和原因widget
   - 创建单个合并的panel widget
   - 使用inline styles确保显示

2. **测试** - 浏览器中验证
   - 刷新页面
   - 点击"AI嘚吧嘚"
   - 检查是否显示修订面板

3. **调整CSS** - 如果显示但样式不对
   - 微调边距、颜色等

### 阶段2: 架构重构（1-2天）

1. **实现方案A** - 包装器模式
   - 创建完整的修订块组件
   - 测试所有功能
   - 替换当前实现

2. **优化体验**
   - 添加动画
   - 优化交互反馈
   - 添加键盘快捷键

---

## 🧪 测试计划

### 测试1: 单段落修订
```
输入: "我依稀记得有本书里"
预期: 显示修订面板，有按钮和原因
```

### 测试2: 多段落修订
```
输入:
第一段文字。

第二段文字。

预期: 两个独立的修订面板
```

### 测试3: 采纳修订
```
操作: 点击✓按钮
预期: 段落内容更新，修订面板消失
```

### 测试4: 拒绝修订
```
操作: 点击✗按钮
预期: 保持原文，修订面板消失
```

---

## 🎯 决策点

### 现在选择哪个方案？

**如果需要快速修复**:
→ 选择"快速修复方案" - 合并widget
→ 优点：1小时内完成
→ 缺点：仍然是hack，不稳定

**如果愿意重构**:
→ 选择"方案A: 包装器模式"
→ 优点：彻底解决，符合行业标准
→ 缺点：需要1-2天

---

## 💬 我的建议

**立即行动**：实施快速修复，让功能先工作起来
**本周内**：重构为方案A，建立稳定的架构

这样既能快速见效，又能长期稳定。
