import type { DiffMark } from '../types';
import './DiffMarkTooltip.css';

interface DiffMarkTooltipProps {
  mark: DiffMark;
  position: { top: number; left: number };
  onAccept: () => void;
  onReject: () => void;
}

export const DiffMarkTooltip = ({ position, onAccept, onReject }: DiffMarkTooltipProps) => {
  return (
    <div
      className="diff-mark-tooltip"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
      }}
    >
      <div className="tooltip-buttons">
        <button className="tooltip-btn accept-btn" onClick={onAccept}>
          ✓ 接受
        </button>
        <button className="tooltip-btn reject-btn" onClick={onReject}>
          ✕ 拒绝
        </button>
      </div>
      <div className="tooltip-arrow"></div>
    </div>
  );
};
