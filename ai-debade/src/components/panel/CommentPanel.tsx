/**
 * @module components/panel/CommentPanel
 * @description 评论面板组件 - 单一职责：渲染AI评论面板UI和角色选择
 * 
 * 业务逻辑已提取到：
 * - useAIReview: 评论生成和管理
 */

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Store
import { useStore } from '../../store/useStore';

// Features
import { useAIReview } from '../../features/ai-review';

// Config
import { STORAGE_KEYS } from '../../config/constants';

// Styles
import './CommentPanel.css';
import './CharacterSelectStyles.css';

export function CommentPanel() {
    // Store state
    const setWorkflowStage = useStore(state => state.setWorkflowStage);
    const setFullTextRewrite = useStore(state => state.setFullTextRewrite);

    // Hooks
    const {
        isGenerating,
        comments,
        characters,
        startReview,
        generateRewriteFromComment,
        clearComments,
    } = useAIReview();

    // Local state
    const [selectedCharacters, setSelectedCharacters] = useState<string[]>(['doctor', 'polisher']);

    // V19 Migration: Force update characters to get new avatarUrls
    useEffect(() => {
        const hasFix = localStorage.getItem(STORAGE_KEYS.V19_AVATAR_FIX);
        if (!hasFix) {
            console.log('🔄 [V19] Clearing characters to ensure avatar images...');
            localStorage.removeItem(STORAGE_KEYS.AI_CHARACTERS);
            localStorage.setItem(STORAGE_KEYS.V19_AVATAR_FIX, 'true');
            window.location.reload();
        }
    }, []);

    // 切换角色选择
    const toggleCharacter = (id: string) => {
        setSelectedCharacters(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // 开始分析
    // 为什么这样设计：当有旧评论时，头部按钮应该先清空状态，
    // 让UI回到角色选择界面，给用户重新选择角色的机会，而不是直接用默认角色开始。
    const handleStartReview = () => {
        // 如果已有评论，先清空让用户重新选择角色
        if (comments.length > 0) {
            setWorkflowStage('idle');
            setFullTextRewrite(null);
            clearComments();
            return; // 不立即开始，让用户重新选择
        }
        startReview(selectedCharacters);
    };

    // 清空所有
    const handleClearAll = () => {
        setWorkflowStage('idle');
        setFullTextRewrite(null);
        clearComments();
    };

    // 获取角色信息
    const getCharacter = (characterId: string) =>
        characters.find(c => c.id === characterId);

    // 可见角色（过滤隐藏的）
    const visibleCharacters = characters.filter(c => !c.hiddenFromPanel);

    return (
        <div className="comment-panel">
            {/* 头部 */}
            <div className="panel-header">
                <div className="panel-title">
                    <div className="title-icon" />
                    <span>嘴替天团</span>
                </div>
                <div className="panel-actions">
                    <button
                        className="fulltext-revision-btn"
                        onClick={handleStartReview}
                        title="开启 AI 分析"
                    >
                        AI嘚吧嘚
                    </button>

                    <button
                        className="action-icon-btn"
                        onClick={handleClearAll}
                        title="清空"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>
            </div>

            {/* 主内容区 */}
            {comments.length === 0 && !isGenerating ? (
                <CharacterSelectArea
                    characters={visibleCharacters}
                    selectedCharacters={selectedCharacters}
                    onToggle={toggleCharacter}
                    onStart={handleStartReview}
                />
            ) : (
                <CommentsContainer
                    comments={comments}
                    isGenerating={isGenerating}
                    getCharacter={getCharacter}
                    onCommentClick={generateRewriteFromComment}
                />
            )}
        </div>
    );
}

// ======== 子组件 ========

interface CharacterSelectAreaProps {
    characters: any[];
    selectedCharacters: string[];
    onToggle: (id: string) => void;
    onStart: () => void;
}

function CharacterSelectArea({
    characters,
    selectedCharacters,
    onToggle,
    onStart,
}: CharacterSelectAreaProps) {
    return (
        <div className="character-select-area">
            <div className="select-hint">召唤你的嘴替</div>
            <div className="character-list">
                {characters.map(character => (
                    <div
                        key={character.id}
                        className={`character-item ${selectedCharacters.includes(character.id) ? 'selected' : ''}`}
                        onClick={() => onToggle(character.id)}
                    >
                        <div className="char-checkbox">
                            {selectedCharacters.includes(character.id) ? '✓' : ''}
                        </div>
                        <img
                            src={character.avatarUrl}
                            alt={character.name}
                            className="char-avatar"
                        />
                        <div className="char-info">
                            <div className="char-name">{character.name}</div>
                            <div className="char-tags">
                                {character.style.map((s: string, i: number) => (
                                    <span key={i} className="tag">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button
                className="start-btn"
                onClick={onStart}
                disabled={selectedCharacters.length === 0}
            >
                开始嘚吧 ({selectedCharacters.length}位)
            </button>
        </div>
    );
}

interface CommentsContainerProps {
    comments: any[];
    isGenerating: boolean;
    getCharacter: (id: string) => any;
    onCommentClick: (content: string) => void;
}

function CommentsContainer({
    comments,
    isGenerating,
    getCharacter,
    onCommentClick,
}: CommentsContainerProps) {
    return (
        <div className="comments-container">
            {comments.map(comment => {
                const character = getCharacter(comment.characterId);
                if (!character) return null;

                return (
                    <CommentCard
                        key={comment.id}
                        comment={comment}
                        character={character}
                        onClick={() => onCommentClick(comment.content)}
                    />
                );
            })}

            {isGenerating && (
                <div className="loading-state">
                    <div className="loading-avatar-row">
                        <div className="loading-dot" style={{ animationDelay: '0s' }} />
                        <div className="loading-dot" style={{ animationDelay: '0.2s' }} />
                        <div className="loading-dot" style={{ animationDelay: '0.4s' }} />
                    </div>
                    <p className="loading-text">
                        专家们正在认真阅读...
                    </p>
                    <p className="loading-subtext">
                        ☕ 给他们倒杯咖啡的时间
                    </p>
                </div>
            )}
        </div>
    );
}

interface CommentCardProps {
    comment: any;
    character: any;
    onClick: () => void;
}

function CommentCard({ comment, character, onClick }: CommentCardProps) {
    return (
        <div
            className={`comment-card fade-in expert-${character.id}`}
            onClick={onClick}
        >
            <div className="comment-header">
                <div className="char-avatar-box">
                    {character.avatarUrl ? (
                        <img
                            src={character.avatarUrl}
                            alt={character.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        typeof character.avatar === 'string'
                            ? character.avatar[0]
                            : <character.avatar size={14} />
                    )}
                </div>
                <div className="char-meta">
                    <span className="char-name">{character.name}</span>
                </div>
            </div>

            <div className="comment-body markdown-content">
                <ReactMarkdown>{comment.content}</ReactMarkdown>
            </div>

            <div className="card-modular-actions">
                <button
                    className="modular-btn primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                >
                    就这个！
                </button>
            </div>
        </div>
    );
}
