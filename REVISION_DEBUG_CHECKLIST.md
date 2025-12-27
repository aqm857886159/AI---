# 修订功能调试检查清单

## 🔍 问题定位流程

### Step 1: 检查数据是否生成
打开浏览器控制台，执行：
```javascript
// 检查store状态
window.__ZUSTAND_STORE__ = useStore.getState();
console.log('fullTextRewrite:', window.__ZUSTAND_STORE__.fullTextRewrite);
```

**预期结果**:
```javascript
{
  id: "rewrite-xxx",
  paragraphChanges: [
    {
      id: "fulltext-change-0-xxx",
      index: 0,
      type: "modified",
      originalText: "...",
      improvedText: "...",
      inlineDiff: [{type: "delete", text: "..."}, ...],
      reason: "修正错别字"
    }
  ]
}
```

**如果为null**: 问题在数据生成阶段（CommentPanel）
**如果有数据**: 问题在渲染阶段（EditorNew）

---

### Step 2: 检查Plugin是否收到数据
控制台输出：
```
🔄 [Plugin] 更新修订state, 段落数: X
✅ [Plugin] 创建了 Y 个修订标记
```

**如果看到这些日志**: Plugin收到数据
**如果没有**: useEffect没有触发

---

### Step 3: 检查Decoration是否创建
在控制台执行：
```javascript
// 检查DOM中是否有修订样式类
document.querySelectorAll('.revision-paragraph-block').length
document.querySelectorAll('.revision-action-buttons').length
document.querySelectorAll('.revision-reason-footer').length
```

**预期结果**: 都应该 > 0

---

## 🐛 常见问题诊断

### 问题1: fullTextRewrite为null

#### 可能原因A: API调用失败
**检查**: 控制台是否有错误
```
❌ [FullText Revision] 改写失败: ...
```

**解决**: 检查API Key配置

#### 可能原因B: hasSignificantChanges过滤掉了所有修改
**检查**: 控制台输出
```
⚠️ [FullText] AI认为无需修改
```

**临时调试**: 修改 `inlineDiff.ts`
```typescript
export function hasSignificantChanges(original: string, improved: string): boolean {
  console.log('🔍 检查差异:', { original, improved, same: original === improved });
  return true; // 暂时返回true，强制显示所有修改
}
```

---

### 问题2: fullTextRewrite有数据，但没有渲染

#### 可能原因A: useEffect依赖项问题
**检查**: EditorNew.tsx:169
```typescript
useEffect(() => {
  console.log('🎨 useEffect触发', { editor, fullTextRewrite });
  // ...
}, [editor, fullTextRewrite]);
```

**如果没有日志**: useEffect没触发，可能是依赖项问题

#### 可能原因B: editor未初始化
**检查**:
```typescript
if (!editor) {
  console.warn('⚠️ editor未初始化');
  return;
}
```

---

### 问题3: Decoration创建了，但看不到

#### 可能原因A: CSS样式问题
**检查**: 浏览器开发者工具 → Elements
1. 找到 `<p>` 段落元素
2. 是否有 `revision-paragraph-block` 类？
3. 该类的CSS是否生效？

**调试CSS**:
```css
.revision-paragraph-block {
  background: red !important; /* 临时高亮，确认类已应用 */
}
```

#### 可能原因B: Widget定位问题
**检查**:
```css
.revision-action-buttons {
  position: fixed !important; /* 临时改为fixed */
  top: 100px !important;
  right: 100px !important;
  background: yellow !important;
  z-index: 9999 !important;
}
```

如果这样能看到，说明是定位问题。

---

### 问题4: 按钮显示了，但点击无反应

#### 检查事件监听器
控制台执行：
```javascript
// 手动触发事件测试
window.dispatchEvent(new CustomEvent('accept-paragraph-change', {
  detail: { changeId: 'test-id' }
}));
```

**预期**: 控制台输出
```
✅ [EditorNew] 接受段落修改: test-id
```

**如果没有**: 事件监听器未注册

---

## 🧪 完整测试用例

### 测试用例1: 基础修订流程

1. **写入测试文本**:
```
高手思维：在复杂世界自由切换

我依稀记得有本书里，能把两套对立的观点融合的人才是高手。
```

2. **点击"AI嘚吧嘚"**

3. **等待修订生成**（控制台应该有日志）

4. **检查UI**:
   - [ ] 段落有灰色背景
   - [ ] 右上角有✓✗按钮
   - [ ] 底部有📝原因
   - [ ] 文字有删除线和绿色插入

5. **点击✓按钮**:
   - [ ] 修订应用
   - [ ] 修订块消失
   - [ ] 内容变为改写后的

---

### 测试用例2: 空修订

1. **写入已经完美的文本**:
```
这是一段完全正确的文字，没有任何错误。
```

2. **点击"AI嘚吧嘚"**

3. **预期结果**:
   - 弹窗提示"AI认为无需修改"
   - 或者没有修订块显示

---

### 测试用例3: 多段落修订

1. **写入多段文本**:
```
第一段有错别字。

第二段也有问題。

第三段很完美。
```

2. **点击"AI嘚吧嘚"**

3. **预期结果**:
   - 第一段有修订块
   - 第二段有修订块
   - 第三段可能没有（如果AI认为无需修改）

---

## 🔧 临时调试代码

### 在EditorNew.tsx添加详细日志

```typescript
// 在useEffect中添加
useEffect(() => {
  console.group('🎨 [EditorNew] 修订模式 useEffect');
  console.log('editor存在:', !!editor);
  console.log('fullTextRewrite存在:', !!fullTextRewrite);

  if (fullTextRewrite) {
    console.log('paragraphChanges数量:', fullTextRewrite.paragraphChanges?.length);
    console.log('paragraphChanges详情:', fullTextRewrite.paragraphChanges);
  }

  console.groupEnd();

  // 原有代码...
}, [editor, fullTextRewrite]);
```

### 在Plugin中添加详细日志

```typescript
apply(tr, oldState, _oldDocState, newDocState) {
  const metaParagraphChanges = tr.getMeta(trackChangesPluginKey);

  console.group('🔧 [Plugin] apply');
  console.log('有meta数据:', metaParagraphChanges !== undefined);
  console.log('meta数据:', metaParagraphChanges);
  console.groupEnd();

  // 原有代码...
}
```

---

## 🎯 关键检查点

### ✅ 数据层 (CommentPanel)
- [ ] API调用成功
- [ ] 返回的JSON格式正确
- [ ] paragraphChanges数组不为空
- [ ] 每个change有inlineDiff
- [ ] 每个change有reason

### ✅ 状态管理 (Zustand)
- [ ] setFullTextRewrite被调用
- [ ] fullTextRewrite存储成功
- [ ] EditorNew能读取到

### ✅ 渲染层 (EditorNew)
- [ ] useEffect被触发
- [ ] editor已初始化
- [ ] tr.setMeta被调用
- [ ] Plugin收到数据

### ✅ 装饰器层 (Plugin)
- [ ] decorations数组不为空
- [ ] Decoration.node创建成功
- [ ] Decoration.widget创建成功
- [ ] DecorationSet.create成功

### ✅ 样式层 (CSS)
- [ ] .revision-paragraph-block类存在
- [ ] .revision-action-buttons类存在
- [ ] .revision-reason-footer类存在
- [ ] 样式规则生效

### ✅ 交互层 (Events)
- [ ] 按钮点击触发事件
- [ ] 事件监听器接收到
- [ ] handleAcceptParagraph执行
- [ ] 文档更新成功

---

## 🚨 紧急回退方案

如果修订功能完全不工作，临时禁用它：

```typescript
// CommentPanel.tsx
const startFullReview = async () => {
  alert('修订功能暂时禁用，仅生成评论');

  // 只生成评论，不生成修订
  const commentsPromise = (async () => {
    // ...
  })();

  await commentsPromise;
  // 注释掉 rewritePromise
};
```

---

## 📊 性能检查

### 检查渲染性能
```javascript
performance.mark('revision-start');

// 修订渲染代码

performance.mark('revision-end');
performance.measure('revision-render', 'revision-start', 'revision-end');
console.log('渲染耗时:', performance.getEntriesByName('revision-render')[0].duration, 'ms');
```

**预期**: < 100ms
**如果 > 500ms**: 有性能问题

---

## 🎬 逐步调试脚本

在控制台执行以下代码，逐步检查：

```javascript
// Step 1: 检查Store
const state = useStore.getState();
console.log('1️⃣ Store状态:', {
  hasFullTextRewrite: !!state.fullTextRewrite,
  changesCount: state.fullTextRewrite?.paragraphChanges?.length
});

// Step 2: 检查DOM
console.log('2️⃣ DOM元素:', {
  paragraphBlocks: document.querySelectorAll('.revision-paragraph-block').length,
  actionButtons: document.querySelectorAll('.revision-action-buttons').length,
  reasonFooters: document.querySelectorAll('.revision-reason-footer').length
});

// Step 3: 检查ProseMirror
const editorElement = document.querySelector('.ProseMirror');
console.log('3️⃣ 编辑器:', {
  exists: !!editorElement,
  paragraphs: editorElement?.querySelectorAll('p').length
});

// Step 4: 模拟点击
const acceptBtn = document.querySelector('.revision-btn.accept');
if (acceptBtn) {
  console.log('4️⃣ 找到采纳按钮，尝试点击');
  acceptBtn.click();
} else {
  console.log('4️⃣ 未找到采纳按钮');
}
```

---

## 📝 问题报告模板

如果以上都检查过还有问题，按此模板报告：

```
【修订功能Bug报告】

环境:
- 浏览器: Chrome/Firefox/Safari 版本号
- 控制台错误: [粘贴完整错误信息]

复现步骤:
1. 写入文字: "..."
2. 点击"AI嘚吧嘚"
3. 等待X秒

实际结果:
- fullTextRewrite: [null/有数据]
- DOM元素数量: [0/X个]
- 控制台日志: [粘贴]

预期结果:
- 应该显示修订块

截图:
[粘贴浏览器截图和控制台截图]
```
