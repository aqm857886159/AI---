/**
 * @module components/editor/Editor
 * @description 编辑器组件 - 单一职责：渲染编辑器UI和处理编辑交互
 * 
 * 业务逻辑已提取到：
 * - useRevision: 修订状态管理
 * - usePraise: 夸夸触发和管理
 * - 插件仅负责渲染装饰
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import ReactDOM from 'react-dom';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

// Store
import { useStore } from '../../store/useStore';

// Features
import { useRevision, createTrackChangesPlugin, trackChangesPluginKey } from '../../features/revision';
import { useAutoPraise, createPraisePlugin, praisePluginKey } from '../../features/praise';
import type { TrackChangesAction } from '../../features/revision';
import type { PraiseAction, PraiseHighlight } from '../../features/praise';

// Components
import { SelectionToolbar } from './SelectionToolbar';
import { CinematicPraise } from '../praise/CinematicPraise';

// Styles
import './Editor.css';
import '../praise/PraiseStyles.css';

export function Editor() {
    // Store state
    const content = useStore(state => state.content);
    const setContent = useStore(state => state.setContent);
    const isRewriting = useStore(state => state.isRewriting);
    const readPraises = useStore(state => state.readPraises);
    const praiseHistory = useStore(state => state.praiseHistory);

    // Hooks
    const {
        fullTextRewrite,
        acceptChange,
        rejectChange,
        acceptAllChanges,
        rejectAllChanges,
        pendingChangesCount,
    } = useRevision();

    // Local state
    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

    const editorRef = useRef<HTMLDivElement>(null);

    // Editor instance
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
            editor.registerPlugin(createTrackChangesPlugin());
            editor.registerPlugin(createPraisePlugin());
        },
        onUpdate: ({ editor }) => {
            if (!fullTextRewrite) {
                const html = editor.getHTML();
                setContent(html);
            }
        },
    });

    // 使用自动夸夸Hook
    useAutoPraise(editor, !fullTextRewrite);

    // 修订模式时清除夸夸
    useEffect(() => {
        if (!editor) return;

        if (fullTextRewrite) {
            const tr = editor.state.tr;
            tr.setMeta(praisePluginKey, { type: 'CLEAR_PRAISE' } as PraiseAction);
            editor.view.dispatch(tr);
        }
    }, [fullTextRewrite, editor]);

    // 同步修订到插件
    useEffect(() => {
        if (!editor) return;

        if (!fullTextRewrite) {
            const tr = editor.state.tr;
            const action: TrackChangesAction = { type: 'SET_CHANGES', changes: [] };
            tr.setMeta(trackChangesPluginKey, action);
            editor.view.dispatch(tr);
            return;
        }

        console.log('🎨 [Editor] 进入段落级修订模式');
        console.log('📦 [Editor] 段落修改数量:', fullTextRewrite.paragraphChanges?.length || 0);

        if (fullTextRewrite.paragraphChanges && fullTextRewrite.paragraphChanges.length > 0) {
            const tr = editor.state.tr;
            const action: TrackChangesAction = {
                type: 'SET_CHANGES',
                changes: fullTextRewrite.paragraphChanges,
            };
            tr.setMeta(trackChangesPluginKey, action);
            editor.view.dispatch(tr);
        }
    }, [fullTextRewrite, editor]);

    // 同步已读状态到插件
    useEffect(() => {
        if (!editor) return;
        const tr = editor.state.tr;
        tr.setMeta(praisePluginKey, { type: 'UPDATE_READ_STATUS' } as PraiseAction);
        editor.view.dispatch(tr);
    }, [readPraises, editor]);

    // 同步夸夸历史到插件
    useEffect(() => {
        if (!editor || fullTextRewrite) return;

        const highlights: PraiseHighlight[] = praiseHistory.map(r => ({
            id: r.id,
            quote: r.quote || '',
            type: r.type,
            wow: r.wow,
            reason: r.reason,
        }));

        const tr = editor.state.tr;
        tr.setMeta(praisePluginKey, {
            type: 'SET_PRAISE',
            highlights: highlights,
        } as PraiseAction);
        console.log('✨ [Editor] Syncing praises to plugin:', highlights.length);
        editor.view.dispatch(tr);
    }, [praiseHistory, editor, fullTextRewrite]);

    // 事件监听：接受/拒绝修改
    useEffect(() => {
        const handleAccept = (e: Event) => {
            const changeId = (e as CustomEvent).detail.changeId;
            acceptChange(changeId, editor);
        };

        const handleReject = (e: Event) => {
            const changeId = (e as CustomEvent).detail.changeId;
            rejectChange(changeId);
        };

        const handleApplySuggestion = (e: Event) => {
            const text = (e as CustomEvent).detail.text;
            if (editor && text) {
                editor.commands.insertContent(text);
            }
        };

        window.addEventListener('accept-paragraph-change', handleAccept);
        window.addEventListener('reject-paragraph-change', handleReject);
        window.addEventListener('apply-suggestion', handleApplySuggestion);

        return () => {
            window.removeEventListener('accept-paragraph-change', handleAccept);
            window.removeEventListener('reject-paragraph-change', handleReject);
            window.removeEventListener('apply-suggestion', handleApplySuggestion);
        };
    }, [acceptChange, rejectChange, editor]);

    // 选区工具栏处理
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
    }, [editor]);

    // 获取建议
    const handleGetSuggestion = useCallback(() => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        if (selectedText && selectedText.trim().length > 0) {
            const overlappingParagraphs: { index: number; fullText: string; nodePos: number }[] = [];
            let paragraphIndex = 0;

            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'paragraph') {
                    if (node.textContent.trim().length > 0) {
                        const nodeStart = pos;
                        const nodeEnd = pos + node.nodeSize;
                        const overlap = Math.max(from, nodeStart) < Math.min(to, nodeEnd);

                        if (overlap) {
                            overlappingParagraphs.push({
                                index: paragraphIndex,
                                fullText: node.textContent,
                                nodePos: nodeStart,
                            });
                        }

                        paragraphIndex++;
                    }
                }
            });

            const event = new CustomEvent('get-selection-suggestion', {
                detail: {
                    selectedText,
                    paragraphContext: overlappingParagraphs.length > 0
                        ? { paragraphs: overlappingParagraphs }
                        : null,
                },
            });
            window.dispatchEvent(event);
            setShowToolbar(false);
        }
    }, [editor]);

    // 处理全部接受
    const handleAcceptAll = useCallback(() => {
        acceptAllChanges(editor);
    }, [acceptAllChanges, editor]);

    return (
        <div className="editor-wrapper" ref={editorRef} style={{ position: 'relative' }}>
            <EditorContent editor={editor} />

            {/* 加载指示器 */}
            {isRewriting && (
                <div className="ai-processing-status">
                    <div className="status-dot"></div>
                    <span>AI 分析中...</span>
                </div>
            )}

            {/* 选区工具栏 */}
            {showToolbar && !fullTextRewrite && (
                <SelectionToolbar
                    position={toolbarPosition}
                    editor={editor}
                    onGetSuggestion={handleGetSuggestion}
                />
            )}

            {/* 修订栏 */}
            {fullTextRewrite && ReactDOM.createPortal(
                <div
                    className="revision-dock-fixed"
                    style={{
                        left: editorRef.current
                            ? `${editorRef.current.getBoundingClientRect().left + editorRef.current.offsetWidth / 2}px`
                            : '50%',
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="revision-action-bar">
                        <div className="revision-info">
                            <span>修订模式</span>
                            <span className="badge">{pendingChangesCount} 处建议</span>
                        </div>
                        <div className="revision-buttons">
                            <button className="accept-all-btn" onClick={handleAcceptAll}>一键全收</button>
                            <button className="reject-all-btn" onClick={rejectAllChanges}>全部忽略</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 夸夸动效 */}
            <CinematicPraise />
        </div>
    );
}
