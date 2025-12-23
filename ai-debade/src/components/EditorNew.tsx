import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useStore } from '../store/useStore';
import { SelectionToolbar } from './SelectionToolbar';
import type { ParagraphChange } from '../types';
import './Editor.css';

// Track Changes Plugin - Paragraph Level
const trackChangesPluginKey = new PluginKey('trackChanges');

export const EditorNew = () => {
  const { content, setContent, fullTextRewrite, setFullTextRewrite, isRewriting, setIsRewriting } = useStore();

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  const editorRef = useRef<HTMLDivElement>(null);

  // Create track changes plugin - Paragraph Level
  const trackChangesPlugin = useMemo(() => {
    return new Plugin({
      key: trackChangesPluginKey,

      state: {
        init() {
          return { decorations: DecorationSet.empty, paragraphChanges: [] as ParagraphChange[] };
        },

        apply(tr, oldState, _oldDocState, newDocState) {
          // Check if metadata explicitly sets or clears paragraph changes
          const metaParagraphChanges = tr.getMeta(trackChangesPluginKey) as ParagraphChange[] | undefined;

          // If metadata is present, update the state (could be empty array to clear)
          if (metaParagraphChanges !== undefined) {
            console.log('🔄 [Plugin] 更新修订state, 段落数:', metaParagraphChanges.length);

            if (metaParagraphChanges.length === 0) {
              return { decorations: DecorationSet.empty, paragraphChanges: [] };
            }

            const decorations: Decoration[] = [];
            const doc = newDocState.doc;

            // 遍历文档中的所有段落节点
            let paragraphIndex = 0;
            doc.descendants((node, pos) => {
              if (node.type.name === 'paragraph') {
                // IMPORTANT: 必须跳过空段落，以保持索引与 paragraphDiff.ts 一致
                if (node.textContent.trim().length === 0) {
                  return;
                }

                // 查找该段落是否有对应的修改
                const change = metaParagraphChanges.find(c => c.index === paragraphIndex);

                if (change && change.type === 'modified' && change.inlineDiff) {
                  const from = pos;
                  const to = pos + node.nodeSize;
                  const changeId = change.id;

                  // 1. 隐藏原始段落
                  decorations.push(
                    Decoration.node(from, to, {
                      class: 'paragraph-hidden',
                    })
                  );

                  // 2. 创建替换Widget (显示Diff视图 + 按钮)
                  decorations.push(
                    Decoration.widget(from, () => {
                      // 容器
                      const wrapper = document.createElement('div');
                      wrapper.className = 'paragraph-modified-wrapper diff-widget';
                      wrapper.dataset.changeId = changeId;

                      // 内容区域 (Diff HTML)
                      const contentDiv = document.createElement('div');
                      contentDiv.className = 'inline-diff-content';

                      let diffHTML = '';
                      change.inlineDiff!.forEach(part => {
                        if (part.type === 'delete') {
                          diffHTML += `<span class="inline-diff-delete">${escapeHTML(part.text)}</span>`;
                        } else if (part.type === 'insert') {
                          diffHTML += `<span class="inline-diff-insert">${escapeHTML(part.text)}</span>`;
                        } else {
                          diffHTML += `<span>${escapeHTML(part.text)}</span>`;
                        }
                      });
                      contentDiv.innerHTML = diffHTML;
                      contentDiv.innerHTML = diffHTML;
                      wrapper.appendChild(contentDiv);

                      // Reason Tooltip (New)
                      if (change.reason) {
                        const reasonDiv = document.createElement('div');
                        reasonDiv.className = 'diff-reason-tooltip';
                        reasonDiv.textContent = `💡 ${change.reason}`;
                        wrapper.appendChild(reasonDiv);
                        // Add class to wrapper to trigger styles
                        wrapper.classList.add('has-reason');
                      }

                      // 按钮区域
                      const actionsDiv = document.createElement('div');
                      actionsDiv.className = 'paragraph-actions';

                      const acceptBtn = document.createElement('button');
                      acceptBtn.className = 'paragraph-action-btn accept';
                      acceptBtn.innerHTML = '✓';
                      acceptBtn.title = '接受修改';
                      acceptBtn.onclick = (e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('accept-paragraph-change', { detail: { changeId } }));
                      };

                      const rejectBtn = document.createElement('button');
                      rejectBtn.className = 'paragraph-action-btn reject';
                      rejectBtn.innerHTML = '✗';
                      rejectBtn.title = '拒绝修改';
                      rejectBtn.onclick = (e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('reject-paragraph-change', { detail: { changeId } }));
                      };

                      actionsDiv.appendChild(acceptBtn);
                      actionsDiv.appendChild(rejectBtn);
                      wrapper.appendChild(actionsDiv);

                      return wrapper;
                    }, { side: -1 }) // side: -1 ensure it renders before the node content
                  );
                }

                paragraphIndex++;
              }
            });

            // Helper function to escape HTML
            function escapeHTML(text: string): string {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            }

            const decorationSet = DecorationSet.create(doc, decorations);
            console.log('✅ [Plugin] 创建了', decorations.length, '个修订标记');
            return { decorations: decorationSet, paragraphChanges: metaParagraphChanges };
          }

          // No metadata: keep the old state unchanged
          return oldState;
        },
      },

      props: {
        decorations(state) {
          const pluginState = this.getState(state);
          return pluginState ? pluginState.decorations : DecorationSet.empty;
        },
      },
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写点什么吧... 💭',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
    onCreate: ({ editor }) => {
      // Register track changes plugin
      editor.registerPlugin(trackChangesPlugin);
    },
    onUpdate: ({ editor }) => {
      // 只有不在改写模式下才自动同步内容，避免冲突
      if (!fullTextRewrite) {
        const html = editor.getHTML();
        setContent(html);
      }
    },
  });

  // Apply Changes Effect (Keep strict sync logic)
  useEffect(() => {
    if (!editor || !fullTextRewrite) {
      // 清空decorations
      if (editor) {
        const tr = editor.state.tr;
        tr.setMeta(trackChangesPluginKey, []);
        editor.view.dispatch(tr);
      }
      return;
    }

    console.log('🎨 [EditorNew] 进入段落级修订模式（内联diff）');
    console.log('📦 [EditorNew] 段落修改数量:', fullTextRewrite.paragraphChanges?.length || 0);

    if (fullTextRewrite.paragraphChanges && fullTextRewrite.paragraphChanges.length > 0) {
      console.log('📊 [EditorNew] 段落修改详情:', fullTextRewrite.paragraphChanges.map(c => ({
        index: c.index,
        type: c.type,
        hasInlineDiff: !!c.inlineDiff,
        inlineDiffLength: c.inlineDiff?.length,
        originalPreview: c.originalText?.substring(0, 50)
      })));
    }

    // 重要：不再替换整个文档内容，保留原有格式
    // 只应用段落级装饰
    if (fullTextRewrite.paragraphChanges && fullTextRewrite.paragraphChanges.length > 0) {
      const tr = editor.state.tr;
      tr.setMeta(trackChangesPluginKey, fullTextRewrite.paragraphChanges);
      editor.view.dispatch(tr);
    }

    // 注意：不锁定编辑器，因为需要保留选择功能用于划词
    // Widget装饰已经替换了段落内容，用户无法直接编辑修订的段落
    console.log('✅ [EditorNew] 修订模式已激活，保持编辑器可交互');
  }, [editor, fullTextRewrite]);

  // Handle Accept Single Paragraph
  const handleAcceptParagraph = useCallback((changeId: string) => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    console.log('✅ [EditorNew] 接受段落修改:', changeId);

    // 找到对应的修改
    const change = fullTextRewrite.paragraphChanges.find(c => c.id === changeId);
    if (!change) return;

    // 在文档中找到对应的段落并替换内容
    let paragraphIndex = 0;
    let found = false;

    editor.state.doc.descendants((node, pos) => {
      if (found) return false; // 已找到，停止遍历

      if (node.type.name === 'paragraph') {
        // IMPORTANT: 跳过空段落，保持索引一致
        if (node.textContent.trim().length === 0) {
          return;
        }

        if (paragraphIndex === change.index) {
          if (change.type === 'modified' && change.improvedText) {
            // 替换段落内容
            const tr = editor.state.tr;
            tr.replaceWith(pos, pos + node.nodeSize, editor.schema.text(change.improvedText));
            editor.view.dispatch(tr);
          } else if (change.type === 'deleted') {
            // 删除段落
            const tr = editor.state.tr;
            tr.delete(pos, pos + node.nodeSize);
            editor.view.dispatch(tr);
          }
          found = true;
        }

        paragraphIndex++;
      }
    });

    // 从列表中移除已处理的修改
    const updatedChanges = fullTextRewrite.paragraphChanges.filter(c => c.id !== changeId);

    // 如果所有修改都处理完了，清空修订状态
    if (updatedChanges.length === 0) {
      console.log('🎉 [EditorNew] 所有段落修订已处理');
      setFullTextRewrite(null);
      setTimeout(() => setContent(editor.getHTML()), 100);
    } else {
      setFullTextRewrite({
        ...fullTextRewrite,
        paragraphChanges: updatedChanges,
      });
    }
  }, [fullTextRewrite, editor, setFullTextRewrite, setContent]);

  // Handle Reject Single
  const handleRejectParagraph = useCallback((changeId: string) => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    console.log('❌ [EditorNew] 拒绝段落修改:', changeId);

    // 从列表中移除被拒绝的修改（保持原文不变）
    const updatedChanges = fullTextRewrite.paragraphChanges.filter(c => c.id !== changeId);

    // 如果所有修改都处理完了，清空修订状态
    if (updatedChanges.length === 0) {
      console.log('🎉 [EditorNew] 所有段落修订已处理');
      setFullTextRewrite(null);
      setTimeout(() => setContent(editor.getHTML()), 100);
    } else {
      setFullTextRewrite({
        ...fullTextRewrite,
        paragraphChanges: updatedChanges,
      });
    }
  }, [fullTextRewrite, editor, setFullTextRewrite, setContent]);

  // Handle Accept ALL
  const handleAcceptAll = useCallback(() => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    const sortedChanges = [...fullTextRewrite.paragraphChanges].sort((a, b) => a.index - b.index);
    const tr = editor.state.tr;

    // We need to be careful with positions shifting if we delete nodes.
    // However, since we replacing node-by-node, if we iterate carefully or use mapping, it might work.
    // Easier approach: Iterate document once, check if index matches any change, apply it.

    // Since we are modifying the document, it's safer to do it in one pass or use a mapping.
    // But for simplicity in this specific "Paragraph Substitution" model:
    // We can just re-use the loop logic but applied to all.

    let paragraphIndex = 0;

    // We map changes by index for O(1) lookup
    const changesByIndex = new Map(fullTextRewrite.paragraphChanges.map(c => [c.index, c]));

    // We must traverse carefully. If we delete a node, we can't continue traversing easily with descendants.
    // Better strategy: Collect all transaction steps first, then apply? 
    // Or just apply one by one and rely on ProseMirror tracking? 
    // ProseMirror `tr` handles mapping.

    // Let's try applying from BOTTOM to TOP to avoid index shifting issues?
    // While paragraph INDEX won't change if we just replace content.
    // If we delete paragraphs, subsequent indices shift.
    // But our `changesByIndex` is based on the OLD document state.

    // So if we have changes at Index 1 and Index 3. 
    // If we delete Index 1. Index 3 becomes Index 2 in the NEW doc.
    // But we need to touch Index 3 of the OLD doc.

    // Correct approach: Traverse doc, find positions of all target paragraphs.
    const targets: { pos: number, size: number, change: ParagraphChange }[] = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        if (node.textContent.trim().length === 0) return;

        const change = changesByIndex.get(paragraphIndex);
        if (change) {
          targets.push({ pos, size: node.nodeSize, change });
        }
        paragraphIndex++;
      }
    });

    // Apply changes from last to first to preserve positions
    for (let i = targets.length - 1; i >= 0; i--) {
      const { pos, size, change } = targets[i];
      if (change.type === 'modified' && change.improvedText) {
        tr.replaceWith(pos, pos + size, editor.schema.text(change.improvedText));
      } else if (change.type === 'deleted') {
        tr.delete(pos, pos + size);
      }
    }

    editor.view.dispatch(tr);
    setFullTextRewrite(null);
    setTimeout(() => setContent(editor.getHTML()), 100);

  }, [fullTextRewrite, editor, setFullTextRewrite, setContent]);

  // Handle Reject All
  const handleRejectAll = useCallback(() => {
    setFullTextRewrite(null);
  }, [setFullTextRewrite]);

  // Event Listeners
  useEffect(() => {
    const handleAccept = (e: Event) => handleAcceptParagraph((e as CustomEvent).detail.changeId);
    const handleReject = (e: Event) => handleRejectParagraph((e as CustomEvent).detail.changeId);

    const handleApplySuggestion = (e: Event) => {
      const text = (e as CustomEvent).detail.text;
      if (editor && text) {
        // Insert at selection or replace selection
        editor.commands.insertContent(text);
      }
    };

    window.addEventListener('accept-paragraph-change', handleAccept);
    window.addEventListener('reject-paragraph-change', handleReject);
    window.addEventListener('apply-suggestion-event', handleApplySuggestion);

    return () => {
      window.removeEventListener('accept-paragraph-change', handleAccept);
      window.removeEventListener('reject-paragraph-change', handleReject);
      window.removeEventListener('apply-suggestion-event', handleApplySuggestion);
    };
  }, [handleAcceptParagraph, handleRejectParagraph, editor]);

  // Handle text selection for toolbar
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      try {
        // if (fullTextRewrite) {
        //   setShowToolbar(false);
        //   return;
        // }

        const { from, to } = editor.state.selection;
        if (from === to) {
          setShowToolbar(false);
          return;
        }

        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!selectedText || selectedText.trim().length === 0) {
          setShowToolbar(false);
          return;
        }

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const domRange = selection.getRangeAt(0);
          const rect = domRange.getBoundingClientRect();

          setToolbarPosition({
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
          setShowToolbar(true);
        }
      } catch (error) {
        console.error('❌ Selection error:', error);
        setShowToolbar(false);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, fullTextRewrite]);

  const handleGetSuggestion = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (selectedText && selectedText.trim().length > 0) {
      // 尝试找到包含选区的(多个)段落
      let overlappingParagraphs: { index: number; fullText: string; nodePos: number }[] = [];
      let paragraphIndex = 0;

      const $from = editor.state.doc.resolve(from);
      const $to = editor.state.doc.resolve(to);

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph') {
          // 必须跳过空段落，以保持索引与 plugin 索引保持一致
          if (node.textContent.trim().length > 0) {
            const nodeStart = pos;
            const nodeEnd = pos + node.nodeSize;

            // 简单的重叠检测: Start < End && End > Start
            // 选区 [from, to] 与 节点 [nodeStart, nodeEnd] 是否重叠
            const overlap = Math.max(from, nodeStart) < Math.min(to, nodeEnd);

            if (overlap) {
              overlappingParagraphs.push({
                index: paragraphIndex,
                fullText: node.textContent,
                nodePos: nodeStart
              });
            }

            paragraphIndex++;
          }
        }
      });

      const event = new CustomEvent('get-selection-suggestion', {
        detail: {
          selectedText,
          // 发送段落范围上下文
          paragraphContext: overlappingParagraphs.length > 0 ? { paragraphs: overlappingParagraphs } : null
        },
      });
      window.dispatchEvent(event);
      setShowToolbar(false);
    }
  }, [editor]);

  return (
    <div className="editor-wrapper" ref={editorRef} style={{ position: 'relative' }}>
      <EditorContent editor={editor} />

      {/* Non-Blocking Loading Indicator */}
      {isRewriting && (
        <div className="ai-processing-status">
          <div className="status-dot"></div>
          <span>AI正在后台修订中...</span>
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && !fullTextRewrite && (
        <SelectionToolbar position={toolbarPosition} editor={editor} onGetSuggestion={handleGetSuggestion} />
      )}

      {/* Revision Action Bar */}
      {fullTextRewrite && (
        <div className="revision-action-bar">
          <div className="revision-info">
            <span>📝 修订模式</span>
            <span className="badge">{fullTextRewrite.paragraphChanges?.length || 0} 个修改</span>
          </div>
          <div className="revision-buttons">
            <button className="accept-all-btn" onClick={handleAcceptAll}>✓ 全部接受</button>
            <button className="reject-all-btn" onClick={handleRejectAll}>✗ 全部拒绝</button>
          </div>
        </div>
      )}
    </div>
  );
};
