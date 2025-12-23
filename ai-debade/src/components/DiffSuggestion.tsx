import type { AISuggestion } from '../types';
import type { AICharacter } from '../types';
import { diffToHTML } from '../services/diffService';
import './DiffSuggestion.css';

interface DiffSuggestionProps {
  suggestion: AISuggestion;
  character: AICharacter;
  position: { top: number; left: number };
  onAccept: () => void;
  onReject: () => void;
}

export const DiffSuggestion = ({
  suggestion,
  character,
  position,
  onAccept,
  onReject,
}: DiffSuggestionProps) => {
  const diffHTML = diffToHTML(suggestion.diff);

  return (
    <div
      className="diff-suggestion"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="diff-header">
        <span className="diff-avatar">{character.avatar}</span>
        <span className="diff-character-name">{character.name}</span>
      </div>

      <div className="diff-comment">{suggestion.comment}</div>

      <div className="diff-preview">
        <div className="diff-label">建议修改：</div>
        <div
          className="diff-content"
          dangerouslySetInnerHTML={{ __html: diffHTML }}
        />
      </div>

      <div className="diff-actions">
        <button className="diff-accept-btn" onClick={onAccept}>
          ✓ 接受
        </button>
        <button className="diff-reject-btn" onClick={onReject}>
          ✕ 拒绝
        </button>
      </div>
    </div>
  );
};
