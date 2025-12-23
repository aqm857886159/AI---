import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { useEffect } from 'react';
import type { ParagraphChange } from '../types';
import './ParagraphTooltip.css';

interface ParagraphTooltipProps {
  change: ParagraphChange;
  position: { top: number; left: number };
  onAccept: () => void;
  onReject: () => void;
}

export const ParagraphTooltip = ({
  change,
  position,
  onAccept,
  onReject,
}: ParagraphTooltipProps) => {
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 8 }),
    ],
  });

  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        x: position.left,
        y: position.top,
        top: position.top,
        left: position.left,
        right: position.left,
        bottom: position.top,
      }),
    });
  }, [position.left, position.top, refs]);

  const getChangeTypeLabel = () => {
    switch (change.type) {
      case 'modified':
        return '修改';
      case 'added':
        return '新增';
      case 'deleted':
        return '删除';
      default:
        return '';
    }
  };

  const getChangeTypeEmoji = () => {
    switch (change.type) {
      case 'modified':
        return '✏️';
      case 'added':
        return '➕';
      case 'deleted':
        return '🗑️';
      default:
        return '';
    }
  };

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="paragraph-tooltip"
    >
      <div className="tooltip-header">
        <span className="change-type">
          {getChangeTypeEmoji()} {getChangeTypeLabel()}段落
        </span>
      </div>

      <div className="tooltip-content">
        {change.type === 'modified' && change.improvedText && (
          <>
            <div className="text-section">
              <div className="text-label">原文</div>
              <div className="text-preview original">{change.originalText}</div>
            </div>
            <div className="text-section">
              <div className="text-label">改为</div>
              <div className="text-preview improved">{change.improvedText}</div>
            </div>
          </>
        )}

        {change.type === 'deleted' && (
          <div className="text-section">
            <div className="text-label">将删除</div>
            <div className="text-preview deleted">{change.originalText}</div>
          </div>
        )}

        {change.type === 'added' && change.improvedText && (
          <div className="text-section">
            <div className="text-label">将添加</div>
            <div className="text-preview added">{change.improvedText}</div>
          </div>
        )}
      </div>

      <div className="tooltip-actions">
        <button className="accept-btn" onClick={onAccept}>
          ✓ 接受
        </button>
        <button className="reject-btn" onClick={onReject}>
          ✗ 忽略
        </button>
      </div>
    </div>
  );
};
