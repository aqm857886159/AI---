/**
 * @module features/revision/useRevision
 * @description 修订功能核心Hook - 单一职责：管理修订状态和操作
 * 
 * 职责：
 * - 提供修订的接受/拒绝操作
 * - 管理修订状态同步
 * - 处理编辑器文档更新
 */

import { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { adjustIndicesAfterAccept, removeRejectedChange } from './revisionService';
import type { ParagraphChange } from './types';

export interface UseRevisionReturn {
    /** 当前修订数据 */
    fullTextRewrite: ReturnType<typeof useStore.getState>['fullTextRewrite'];
    /** 是否正在改写 */
    isRewriting: boolean;
    /** 是否有待处理的修改 */
    hasPendingChanges: boolean;
    /** 待处理修改数量 */
    pendingChangesCount: number;
    /** 接受单个修改 */
    acceptChange: (changeId: string, editor: any) => void;
    /** 拒绝单个修改 */
    rejectChange: (changeId: string) => void;
    /** 接受所有修改 */
    acceptAllChanges: (editor: any) => void;
    /** 拒绝所有修改 */
    rejectAllChanges: () => void;
    /** 清除修订状态 */
    clearRevision: () => void;
}

/**
 * 修订功能Hook
 * 将修订逻辑从EditorNew.tsx中提取，实现关注点分离
 */
export function useRevision(): UseRevisionReturn {
    const fullTextRewrite = useStore(state => state.fullTextRewrite);
    const isRewriting = useStore(state => state.isRewriting);
    const setFullTextRewrite = useStore(state => state.setFullTextRewrite);
    const setContent = useStore(state => state.setContent);

    const hasPendingChanges = !!(fullTextRewrite?.paragraphChanges?.length);
    const pendingChangesCount = fullTextRewrite?.paragraphChanges?.length || 0;

    /**
     * 接受单个修改
     */
    const acceptChange = useCallback((changeId: string, editor: any) => {
        if (!fullTextRewrite?.paragraphChanges || !editor) {
            console.warn('[useRevision] No active revision session or editor');
            return;
        }

        const change = fullTextRewrite.paragraphChanges.find(c => c.id === changeId);
        if (!change) {
            console.warn(`[useRevision] Change ${changeId} not found`);
            return;
        }

        console.log('✅ [useRevision] 接受段落修改:', changeId);

        // 查找文档中的目标位置
        const targetInfo = findTargetParagraphPosition(editor, change);

        if (targetInfo) {
            applyChangeToDocument(editor, change, targetInfo);
        }

        // 更新状态
        const updatedChanges = adjustIndicesAfterAccept(
            fullTextRewrite.paragraphChanges,
            change
        );

        if (updatedChanges.length === 0) {
            console.log('🎉 [useRevision] 所有段落修订已处理');
            setFullTextRewrite(null);
            setTimeout(() => setContent(editor.getHTML()), 100);
        } else {
            setFullTextRewrite({
                ...fullTextRewrite,
                paragraphChanges: updatedChanges,
            });
        }
    }, [fullTextRewrite, setFullTextRewrite, setContent]);

    /**
     * 拒绝单个修改
     */
    const rejectChange = useCallback((changeId: string) => {
        if (!fullTextRewrite?.paragraphChanges) {
            console.warn('[useRevision] No active revision session');
            return;
        }

        console.log('❌ [useRevision] 拒绝段落修改:', changeId);

        const updatedChanges = removeRejectedChange(
            fullTextRewrite.paragraphChanges,
            changeId
        );

        if (updatedChanges.length === 0) {
            console.log('🎉 [useRevision] 所有段落修订已处理');
            setFullTextRewrite(null);
        } else {
            setFullTextRewrite({
                ...fullTextRewrite,
                paragraphChanges: updatedChanges,
            });
        }
    }, [fullTextRewrite, setFullTextRewrite]);

    /**
     * 接受所有修改
     */
    const acceptAllChanges = useCallback((editor: any) => {
        if (!fullTextRewrite?.paragraphChanges || !editor) {
            console.warn('[useRevision] No active revision or editor');
            return;
        }

        const tr = editor.state.tr;
        let paragraphIndex = 0;
        const changesByIndex = new Map(
            fullTextRewrite.paragraphChanges.map(c => [c.index, c])
        );
        const targets: { pos: number; size: number; change: ParagraphChange }[] = [];

        editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'paragraph') {
                if (node.textContent.trim().length === 0) return;

                const change = changesByIndex.get(paragraphIndex);
                if (change) {
                    targets.push({ pos, size: node.nodeSize, change });
                }
                paragraphIndex++;
            }
        });

        // 从后向前应用修改以保持位置正确
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
    }, [fullTextRewrite, setFullTextRewrite, setContent]);

    /**
     * 拒绝所有修改
     */
    const rejectAllChanges = useCallback(() => {
        setFullTextRewrite(null);
    }, [setFullTextRewrite]);

    /**
     * 清除修订状态
     */
    const clearRevision = useCallback(() => {
        setFullTextRewrite(null);
    }, [setFullTextRewrite]);

    return {
        fullTextRewrite,
        isRewriting,
        hasPendingChanges,
        pendingChangesCount,
        acceptChange,
        rejectChange,
        acceptAllChanges,
        rejectAllChanges,
        clearRevision,
    };
}

// ======== 内部辅助函数 ========

interface TargetInfo {
    pos: number;
    size: number;
}

/**
 * 在编辑器文档中查找目标段落位置
 */
function findTargetParagraphPosition(editor: any, change: ParagraphChange): TargetInfo | null {
    let paragraphIndex = 0;
    let result: TargetInfo | null = null;

    editor.state.doc.descendants((node: any, pos: number) => {
        if (result) return false;
        if (node.type.name === 'paragraph') {
            if (node.textContent.trim().length === 0) return;
            if (paragraphIndex === change.index) {
                result = { pos, size: node.nodeSize };
            }
            paragraphIndex++;
        }
    });

    return result;
}

/**
 * 应用修改到文档
 */
function applyChangeToDocument(editor: any, change: ParagraphChange, target: TargetInfo): void {
    const tr = editor.state.tr;

    if (change.type === 'modified' && change.improvedText) {
        tr.replaceWith(target.pos, target.pos + target.size, editor.schema.text(change.improvedText));
        editor.view.dispatch(tr);
    } else if (change.type === 'deleted') {
        tr.delete(target.pos, target.pos + target.size);
        editor.view.dispatch(tr);
    }
}
