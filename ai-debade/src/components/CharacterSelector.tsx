import { useState } from 'react';
import { useStore } from '../store/useStore';
import './CharacterSelector.css';

interface CharacterSelectorProps {
    onConfirm: (selectedIds: string[]) => void;
    onCancel: () => void;
}

export const CharacterSelector = ({ onConfirm, onCancel }: CharacterSelectorProps) => {
    const { characters } = useStore();

    // 默认选择：纠错和润色
    const [selected, setSelected] = useState<string[]>(['doctor', 'polisher']);

    const toggleSelection = (id: string) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="character-selector-modal" onClick={e => e.stopPropagation()}>
                <div className="selector-header">
                    <h3>选择你想咨询的专家</h3>
                    <p className="subtitle">可以选择1-4位专家为你审阅文章</p>
                </div>

                <div className="character-grid">
                    {characters
                        .filter(c => !c.hiddenFromPanel)
                        .map(character => (
                            <div
                                key={character.id}
                                className={`character-option ${selected.includes(character.id) ? 'selected' : ''}`}
                                onClick={() => toggleSelection(character.id)}
                            >
                                <div className="char-checkbox">
                                    {selected.includes(character.id) ? '☑️' : '☐'}
                                </div>
                                <div className="char-info">
                                    <div className="char-name">{character.name}</div>
                                    <div className="char-tags">
                                        {character.style.map((s, i) => (
                                            <span key={i} className="tag">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                <div className="selector-footer">
                    <button className="btn-secondary" onClick={onCancel}>取消</button>
                    <button
                        className="btn-primary"
                        onClick={() => onConfirm(selected)}
                        disabled={selected.length === 0}
                    >
                        开始分析 ({selected.length}个专家)
                    </button>
                </div>
            </div>
        </div>
    );
};
