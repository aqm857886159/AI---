import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useStore } from '../store/useStore';
import { DiffMarkTooltip } from './DiffMarkTooltip';
import { SelectionToolbar } from './SelectionToolbar';
import type { DiffMark } from '../types';
import './Editor.css';

export const Editor = () => {
  const { content, setContent, fullTextRewrite, acceptDiffMark, rejectDiffMark } = useStore();

  const [hoveredMark, setHoveredMark] = useState<{ mark: DiffMark; element: HTMLElement } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

  // Selection toolbar state
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  const editorRef = useRef<HTMLDivElement>(null);

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
    onUpdate: ({ editor }) => {
      // 只有在非修订模式下才更新content
      if (!fullTextRewrite) {
        const html = editor.getHTML();
        setContent(html);
      }
    },
  });

  // 当进入修订模式时，渲染带标记的内容
  useEffect(() => {
    if (!editor || !fullTextRewrite) return;

    console.log('🎨 [Editor] 进入修订模式渲染');
    console.log('📝 [Editor] 原文长度:', fullTextRewrite.originalText.length);
    console.log('📝 [Editor] 改进文长度:', fullTextRewrite.improvedText.length);
    console.log('🏷️ [Editor] 标记数量:', fullTextRewrite.diffMarks?.length || 0);

    const { originalText, diffMarks } = fullTextRewrite;

    // 如果没有diffMarks，直接返回
    if (!diffMarks) {
      return;
    }

    // 构建带标记的HTML
    let html = '';
    let lastPos = 0;

    // 按位置排序diffMarks
    const sortedMarks = [...diffMarks].sort((a, b) => a.position.from - b.position.from);

    console.log('🏷️ [Editor] 排序后的标记:', sortedMarks.map(m => ({
      type: m.type,
      from: m.position.from,
      to: m.position.to,
      orig: m.originalText?.substring(0, 20),
      new: m.newText?.substring(0, 20)
    })));

    for (const mark of sortedMarks) {
      // 添加标记前的正常文本
      if (mark.position.from > lastPos) {
        const normalText = originalText.substring(lastPos, mark.position.from);
        html += escapeHtml(normalText);
      }

      // 添加标记
      if (mark.type === 'delete') {
        html += `<span class="diff-mark diff-mark-delete" data-mark-id="${mark.id}">${escapeHtml(mark.originalText || '')}</span>`;
        lastPos = mark.position.to;
      } else if (mark.type === 'insert') {
        // 插入标记的位置相同（from === to），不移动lastPos
        html += `<span class="diff-mark diff-mark-insert" data-mark-id="${mark.id}">${escapeHtml(mark.newText || '')}</span>`;
        // 插入不改变位置，保持lastPos不变
      } else if (mark.type === 'replace') {
        html += `<span class="diff-mark diff-mark-replace" data-mark-id="${mark.id}">`;
        html += `<span class="original">${escapeHtml(mark.originalText || '')}</span>`;
        html += `<span class="new">${escapeHtml(mark.newText || '')}</span>`;
        html += `</span>`;
        lastPos = mark.position.to;
      }
    }

    // 添加剩余的正常文本
    if (lastPos < originalText.length) {
      const remainingText = originalText.substring(lastPos);
      html += escapeHtml(remainingText);
    }

    // 将换行符转换为段落，但保持diff标记完整性
    let finalHtml = html;

    // 将\n\n (双换行)替换为段落分隔
    finalHtml = finalHtml.replace(/\n\n+/g, '</p><p>');

    // 将单个\n替换为<br>
    finalHtml = finalHtml.replace(/\n/g, '<br>');

    // 包裹在段落中
    finalHtml = `<p>${finalHtml}</p>`;

    // 清理空段落
    finalHtml = finalHtml.replace(/<p><\/p>/g, '');

    console.log('📄 [Editor] 最终HTML长度:', finalHtml.length);
    console.log('📄 [Editor] HTML预览:', finalHtml.substring(0, 300));

    editor.commands.setContent(finalHtml);

    // 禁用编辑（修订模式下只能接受/拒绝，不能直接编辑）
    editor.setEditable(false);
    console.log('🔒 [Editor] 编辑器已锁定');

    return () => {
      // 退出修订模式时恢复可编辑
      editor.setEditable(true);
      console.log('🔓 [Editor] 编辑器已解锁');
    };
  }, [editor, fullTextRewrite]);

  // 监听鼠标悬停在diff标记上
  useEffect(() => {
    if (!editorRef.current) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const markElement = target.closest('.diff-mark') as HTMLElement;

      if (markElement && fullTextRewrite?.diffMarks) {
        const markId = markElement.dataset.markId;
        const mark = fullTextRewrite.diffMarks.find(m => m.id === markId);

        if (mark) {
          setHoveredMark({ mark, element: markElement });

          // 计算tooltip位置
          const rect = markElement.getBoundingClientRect();
          setTooltipPosition({
            top: rect.top,
            left: rect.left + rect.width / 2,
          });
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const markElement = target.closest('.diff-mark');

      if (markElement) {
        // 延迟隐藏，给用户时间移动到tooltip上
        setTimeout(() => {
          setHoveredMark(null);
          setTooltipPosition(null);
        }, 200);
      }
    };

    const editorElement = editorRef.current;
    editorElement.addEventListener('mouseenter', handleMouseEnter, true);
    editorElement.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      editorElement.removeEventListener('mouseenter', handleMouseEnter, true);
      editorElement.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [fullTextRewrite]);

  const handleAcceptMark = (markId: string) => {
    if (!fullTextRewrite || !editor || !fullTextRewrite.diffMarks) return;

    const mark = fullTextRewrite.diffMarks.find(m => m.id === markId);
    if (!mark) return;

    console.log('✅ [Editor] 接受修改:', mark.id, mark.type);

    // 从store中移除这个标记
    acceptDiffMark(markId);
    setHoveredMark(null);
    setTooltipPosition(null);

    // 检查是否还有剩余标记
    const remainingMarks = fullTextRewrite.diffMarks.filter(m => m.id !== markId);

    if (remainingMarks.length === 0) {
      // 所有标记都处理完了，应用最终的改进文本
      console.log('🎉 [Editor] 所有修订已处理，应用最终文本');

      // 构建最终文本：应用所有接受的修改
      editor.commands.setContent(fullTextRewrite.improvedText);
      editor.setEditable(true);

      // 清空修订状态
      setTimeout(() => {
        if (fullTextRewrite.diffMarks && fullTextRewrite.diffMarks.length === 0) {
          setContent(editor.getHTML());
        }
      }, 100);
    }
  };

  const handleRejectMark = (markId: string) => {
    if (!fullTextRewrite || !editor || !fullTextRewrite.diffMarks) return;

    const mark = fullTextRewrite.diffMarks.find(m => m.id === markId);
    if (!mark) return;

    console.log('❌ [Editor] 拒绝修改:', mark.id, mark.type);

    // 从store中移除这个标记
    rejectDiffMark(markId);
    setHoveredMark(null);
    setTooltipPosition(null);

    // 检查是否还有剩余标记
    const remainingMarks = fullTextRewrite.diffMarks.filter(m => m.id !== markId);

    if (remainingMarks.length === 0) {
      // 所有标记都处理完了，保留原文
      console.log('🎉 [Editor] 所有修订已处理，保留原文');

      editor.commands.setContent(fullTextRewrite.originalText);
      editor.setEditable(true);

      // 清空修订状态
      setTimeout(() => {
        if (fullTextRewrite.diffMarks && fullTextRewrite.diffMarks.length === 0) {
          setContent(editor.getHTML());
        }
      }, 100);
    }
  };

  // Handle text selection for toolbar
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      try {
        // Don't show toolbar in revision mode
        if (fullTextRewrite) {
          setShowToolbar(false);
          return;
        }

        const { from, to } = editor.state.selection;

        // Check if there's actual text selected
        if (from === to) {
          setShowToolbar(false);
          return;
        }

        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!selectedText || selectedText.trim().length === 0) {
          setShowToolbar(false);
          return;
        }

        // Get selection position
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
        console.error('Selection position error:', error);
        setShowToolbar(false);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, fullTextRewrite]);

  // Handle getting AI suggestion for selected text
  const handleGetSuggestion = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (selectedText && selectedText.trim().length > 0) {
      // Dispatch custom event for CommentPanel to handle
      const event = new CustomEvent('get-selection-suggestion', {
        detail: { selectedText },
      });
      window.dispatchEvent(event);
      setShowToolbar(false);
    }
  };

  return (
    <div className="editor-wrapper" ref={editorRef}>
      <EditorContent editor={editor} />

      {/* Selection toolbar for normal editing mode */}
      {showToolbar && !fullTextRewrite && (
        <SelectionToolbar
          position={toolbarPosition}
          editor={editor}
          onGetSuggestion={handleGetSuggestion}
        />
      )}

      {/* Diff mark tooltip for revision mode */}
      {hoveredMark && tooltipPosition && fullTextRewrite && (
        <DiffMarkTooltip
          mark={hoveredMark.mark}
          position={tooltipPosition}
          onAccept={() => handleAcceptMark(hoveredMark.mark.id)}
          onReject={() => handleRejectMark(hoveredMark.mark.id)}
        />
      )}
    </div>
  );
};

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
