import { useEffect } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import type { Editor } from '@tiptap/react';
import './SelectionToolbar.css';

interface SelectionToolbarProps {
  position: { x: number; y: number };
  editor: Editor | null;
  onGetSuggestion: () => void;
}

export const SelectionToolbar = ({ position, editor, onGetSuggestion }: SelectionToolbarProps) => {
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    strategy: 'fixed', // Use fixed positioning for viewport coordinates
    middleware: [offset(10), flip(), shift()],
  });

  // 使用 useEffect 设置虚拟定位参考点，避免无限重渲染
  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: position.x,
        y: position.y,
        top: position.y,
        left: position.x,
        right: position.x,
        bottom: position.y,
      }),
    });
  }, [position.x, position.y, refs]);

  if (!editor) return null;

  const handleFormat = (type: string) => {
    switch (type) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
    }
  };

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="selection-toolbar"
    >
      <div className="toolbar-group">
        <button
          className="format-btn"
          onClick={() => handleFormat('bold')}
          title="加粗"
          data-active={editor.isActive('bold')}
        >
          <strong>B</strong>
        </button>
        <button
          className="format-btn"
          onClick={() => handleFormat('italic')}
          title="斜体"
          data-active={editor.isActive('italic')}
        >
          <em>I</em>
        </button>
        <button
          className="format-btn"
          onClick={() => handleFormat('strike')}
          title="删除线"
          data-active={editor.isActive('strike')}
        >
          <s>S</s>
        </button>
        <button
          className="format-btn"
          onClick={() => handleFormat('code')}
          title="代码"
          data-active={editor.isActive('code')}
        >
          {'</>'}
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <button className="ai-btn" onClick={onGetSuggestion}>
        ✨ AI嘚吧嘚
      </button>
    </div>
  );
};
