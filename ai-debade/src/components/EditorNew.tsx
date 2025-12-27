import { useRef, useState, useEffect, useCallback } from 'react'; // Removed useMemo
import { useEditor, EditorContent } from '@tiptap/react';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
// import { Plugin, PluginKey } from '@tiptap/pm/state'; // No longer needed directly for creation, but needed for keys? Keys are imported.
import { DecorationSet } from '@tiptap/pm/view'; // Needed? Maybe for types if referenced
import { useStore } from '../store/useStore';
import { SelectionToolbar } from './SelectionToolbar';
import type { ParagraphChange, PraiseHighlight } from '../types';
import { praiseService } from '../services/praiseService';
import { CinematicPraise } from './CinematicPraise'; // V15.0 Engine
import './Editor.css';

// Imported Plugins
import { createTrackChangesPlugin, trackChangesPluginKey } from '../editor/plugins/trackChangesPlugin';
import type { TrackChangesAction } from '../editor/plugins/trackChangesPlugin';

import { createPraisePlugin, praisePluginKey } from '../editor/plugins/praisePlugin';
import type { PraiseAction } from '../editor/plugins/praisePlugin';



export const EditorNew = () => {
  const { content, setContent, fullTextRewrite, setFullTextRewrite, isRewriting, readPraises, markPraiseAsRead } = useStore();

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  // const [praiseTooltip, setPraiseTooltip] = useState<{ x: number, y: number, highlight: PraiseHighlight } | null>(null); // Removed V15
  const [isPraising, setIsPraising] = useState(false);


  const editorRef = useRef<HTMLDivElement>(null);






  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写点什么吧...',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
    onCreate: ({ editor }) => {
      // Register track changes plugin (Factory Pattern)
      editor.registerPlugin(createTrackChangesPlugin());
      editor.registerPlugin(createPraisePlugin());
    },
    onUpdate: ({ editor }) => {
      // 只有不在改写模式下才自动同步内容，避免冲突
      if (!fullTextRewrite) {
        const html = editor.getHTML();
        setContent(html);
      }
    },
  });

  // Conflict Resolution: Clear Praise when in Revision Mode
  useEffect(() => {
    if (!editor) return;

    if (fullTextRewrite) {
      // User Feedback: "Don't mix Praise with Revision"
      // Hide Ambient Praise when doing heavy lifting
      const tr = editor.state.tr;
      tr.setMeta(praisePluginKey, { type: 'CLEAR_PRAISE' });
      editor.view.dispatch(tr);
    }
    // No else needed
  }, [fullTextRewrite, editor]);

  // Apply Changes Effect (Keep strict sync logic)
  useEffect(() => {
    if (!editor || !fullTextRewrite) {
      // 清空decorations
      if (editor) {
        const tr = editor.state.tr;
        const action: TrackChangesAction = { type: 'SET_CHANGES', changes: [] };
        tr.setMeta(trackChangesPluginKey, action);
        editor.view.dispatch(tr);
      }
      return;
    }

    console.log('🎨 [EditorNew] 进入段落级修订模式（内联diff）');
    console.log('📦 [EditorNew] 段落修改数量:', fullTextRewrite.paragraphChanges?.length || 0);

    // 只应用段落级装饰
    if (fullTextRewrite.paragraphChanges && fullTextRewrite.paragraphChanges.length > 0) {
      const tr = editor.state.tr;
      const action: TrackChangesAction = {
        type: 'SET_CHANGES',
        changes: fullTextRewrite.paragraphChanges
      };
      tr.setMeta(trackChangesPluginKey, action);
      editor.view.dispatch(tr);
    }

    // 注意：不锁定编辑器，因为需要保留选择功能用于划词
    // Widget装饰已经替换了段落内容，用户无法直接编辑修订的段落
  }, [fullTextRewrite, editor]);

  // FIX V15: Dedicated handling for Read Status Updates (Burn After Reading)
  useEffect(() => {
    if (!editor) return;
    const tr = editor.state.tr;
    tr.setMeta(praisePluginKey, { type: 'UPDATE_READ_STATUS' });
    editor.view.dispatch(tr);
  }, [readPraises, editor]);

  // Handle Accept Single Paragraph
  const handleAcceptParagraph = useCallback((changeId: string) => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    console.log('✅ [EditorNew] 接受段落修改:', changeId);

    // 找到对应的修改
    const change = fullTextRewrite.paragraphChanges.find(c => c.id === changeId);
    if (!change) return;

    // ROBUST SEARCH: Use Decorations instead of scanning paragraphs by index
    // This allows us to find the correct paragraph even if indices are shifted.
    const pluginState = trackChangesPluginKey.getState(editor.state);
    if (!pluginState) return;

    const decorations = pluginState.decorations.find();
    // Find decoration for this changeId.
    // We look for the "container" decoration which is a 'node' decoration with the data attribute.
    const targetDeco = decorations.find(d =>
      d.spec['data-revision-id'] === changeId
    );

    let targetPos = -1;
    let targetSize = 0;

    if (targetDeco) {
      targetPos = targetDeco.from;
      targetSize = targetDeco.to - targetDeco.from;
      console.log(`🎯 [Position Found] via Decoration: ${targetPos} - ${targetDeco.to}`);
    } else {
      console.warn('⚠️ [Position Warning] Decoration not found, falling back to index scan (unreliable)');
      // Fallback (Logic from before, just in case)
      let paragraphIndex = 0;
      let found = false;
      editor.state.doc.descendants((node, pos) => {
        if (found) return false;
        if (node.type.name === 'paragraph') {
          if (node.textContent.trim().length === 0) return;
          if (paragraphIndex === change.index) {
            targetPos = pos;
            targetSize = node.nodeSize;
            found = true;
          }
          paragraphIndex++;
        }
      });
    }

    if (targetPos !== -1) {
      if (change.type === 'modified' && change.improvedText) {
        // 替换段落内容 (Modification usually keeps 1 paragraph -> 1 paragraph)
        const tr = editor.state.tr;
        // Use replaceWith to swap content.
        tr.replaceWith(targetPos, targetPos + targetSize, editor.schema.text(change.improvedText));
        editor.view.dispatch(tr);
      } else if (change.type === 'deleted') {
        // 删除段落 (Count decreases!)
        const tr = editor.state.tr;
        tr.delete(targetPos, targetPos + targetSize);
        editor.view.dispatch(tr);
      }
    }

    // INDEX FIX: Re-calculate indices for remaining changes
    // If we deleted a paragraph, subsequent indices must shift down.
    // Assuming 'deleted' reduces count by 1. 'modified' keeps count.
    const isDeletion = change.type === 'deleted';

    // 从列表中移除已处理的修改
    let updatedChanges = fullTextRewrite.paragraphChanges.filter(c => c.id !== changeId);

    if (isDeletion) {
      console.log('📉 [Index Shift] Detected Deletion, adjusting indices for subsequent changes...');
      updatedChanges = updatedChanges.map(c => {
        if (c.index > change.index) {
          return { ...c, index: c.index - 1 };
        }
        return c;
      });
    }

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

    // ROBUST SEARCH: Use Decorations
    const pluginState = trackChangesPluginKey.getState(editor.state);
    if (!pluginState) return;

    const decorations = pluginState.decorations.find();
    // Find decoration for this changeId.
    const targetDeco = decorations.find(d =>
      d.spec['data-revision-id'] === changeId
    );

    if (targetDeco) {
      console.log(`🎯 [Reject Position Found] via Decoration: ${targetDeco.from}`);
      // No DOM manipulation needed for reject, just state update
    } else {
      console.warn('⚠️ [Reject Warning] Decoration not found');
    }

    // 从列表中移除被拒绝的修改（保持原文不变）
    // Index shifting is NOT required for Rejection because we keep the original paragraph
    // So 1 paragraph -> 1 paragraph. Count preserved. Indices stable.
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

    const tr = editor.state.tr;
    let paragraphIndex = 0;
    const changesByIndex = new Map(fullTextRewrite.paragraphChanges.map(c => [c.index, c]));
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

    const handlePraiseClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      /* Removed V15 Legacy Tooltip Logic */
    };

    // Remove legacy Time Machine event listener because we handle it via plugin HandleDOMEvents now
    // But we still need these Custom Events for the buttons
    window.addEventListener('accept-paragraph-change', handleAccept);
    window.addEventListener('reject-paragraph-change', handleReject);
    window.addEventListener('apply-suggestion', handleApplySuggestion);
    // window.addEventListener('praise-click', handlePraiseClick); // Moved to CinematicPraise

    return () => {
      window.removeEventListener('accept-paragraph-change', handleAccept);
      window.removeEventListener('reject-paragraph-change', handleReject);
      window.removeEventListener('apply-suggestion', handleApplySuggestion);
      // window.removeEventListener('praise-click', handlePraiseClick);
    };
  }, [handleAcceptParagraph, handleRejectParagraph, editor]);

  // Handle Praise Generation
  // Internal function to be called by debounce

  // Ambient Trigger Strategy: Debounce on content change
  // Trigger 4 seconds after typing stops, if content length > 50
  // To save tokens, we might only do this once per session or on specific milestones
  // For this MVP, we will use a "Reflective Pause" trigger.

  // Ref to track last content to avoid duplicate checks
  const lastAnalyzedContent = useRef('');

  // V17: 增量夸夸系统 - 每300字自动触发
  useEffect(() => {
    if (!editor || fullTextRewrite || isPraising) return;

    const timer = setTimeout(async () => {
      const text = editor.getText();
      const currentLength = text.length;

      // 获取store中的夸奖状态
      const { wordCountState, setPraiseRecord, setWordCount } = useStore.getState();
      const { total: lastCount } = wordCountState;
      const increment = currentLength - lastCount;

      console.log(`📊 [Praise Monitor] Current: ${currentLength}, Last: ${lastCount}, Increment: ${increment}`);

      // 检查是否达到300字阈值
      if (increment >= 300 && currentLength > 10) {
        console.log(`✨ [Praise Trigger] Threshold reached! Generating praise...`);
        setIsPraising(true);

        try {
          const result = await praiseService.generateIncrementalPraise(text, lastCount);

          if (result && result.praises) {
            console.log('🎉 [Praise] Generated:', result.praises.length, 'praises');

            // 添加每个夸奖到store并触发视觉效果
            result.praises.forEach((praise: any, index: number) => {
              const praiseRecord = {
                id: `praise-${Date.now()}-${index}`,
                timestamp: Date.now(),
                wordCount: currentLength,
                type: praise.type || 'progress',
                quote: praise.quote || '',
                wow: praise.wow || '不错！',
                reason: praise.reason || '',
                isRead: false
              };

              setPraiseRecord(praiseRecord);

              // 触发cinematic效果
              setTimeout(() => {
                const event = new CustomEvent('showPraise', {
                  detail: {
                    text: praise.wow,
                    effect: 'confetti' // 可以根据type选择不同效果
                  }
                });
                window.dispatchEvent(event);
              }, index * 500); // 错开显示
            });

            // 更新字数状态
            setWordCount(currentLength, lastCount);
          }
        } catch (e) {
          console.error('❌ [Praise] Generation failed:', e);
        } finally {
          setIsPraising(false);
        }
      }
    }, 2000); // 2秒debounce

    return () => clearTimeout(timer);
  }, [editor?.state.doc.content.size, fullTextRewrite, isPraising]);


  // Handle text selection for toolbar
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      try {
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

  /* Legacy UseEffect Removed */

  return (
    <div className="editor-wrapper" ref={editorRef} style={{ position: 'relative' }}>
      <EditorContent editor={editor} />

      {/* Non-Blocking Loading Indicator */}
      {isRewriting && (
        <div className="ai-processing-status">
          <div className="status-dot"></div>
          <span>AI 分析中...</span>
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && !fullTextRewrite && (
        <SelectionToolbar position={toolbarPosition} editor={editor} onGetSuggestion={handleGetSuggestion} />
      )}

      {/* 修订栏Fixed悬浮 - Portal到body，始终可见 */}
      {/* 架构重构: 动态计算编辑器中心位置 */}
      {fullTextRewrite && ReactDOM.createPortal(
        <div
          className="revision-dock-fixed"
          style={{
            left: editorRef.current
              ? `${editorRef.current.getBoundingClientRect().left + editorRef.current.offsetWidth / 2}px`
              : '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="revision-action-bar">
            <div className="revision-info">
              <span>修订模式</span>
              <span className="badge">{fullTextRewrite.paragraphChanges?.length || 0} 处建议</span>
            </div>
            <div className="revision-buttons">
              <button className="accept-all-btn" onClick={handleAcceptAll}>全部采纳</button>
              <button className="reject-all-btn" onClick={handleRejectAll}>全部忽略</button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* V15.0: Cinematic Praise (The 12-Effect Engine) */}
      <CinematicPraise />

    </div>
  );
};

