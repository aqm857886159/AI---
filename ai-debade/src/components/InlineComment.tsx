import type { Comment as CommentType } from '../types';
import type { AICharacter } from '../types';
import './InlineComment.css';

interface InlineCommentProps {
  comment: CommentType;
  character: AICharacter;
  position: { top: number; left: number };
  onClose: () => void;
}

export const InlineComment = ({ comment, character, position, onClose }: InlineCommentProps) => {
  return (
    <div
      className="inline-comment"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="inline-comment-header">
        <span className="inline-character-avatar">{character.avatar}</span>
        <span className="inline-character-name">{character.name}</span>
        <button className="inline-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="inline-comment-content">
        {comment.content}
      </div>
      {comment.suggestion && (
        <div className="inline-suggestion">
          <strong>💡 建议改为：</strong>
          <p>{comment.suggestion}</p>
        </div>
      )}
    </div>
  );
};
