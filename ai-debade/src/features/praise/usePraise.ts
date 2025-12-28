/**
 * @module features/praise/usePraise
 * @description 夸夸功能核心Hook - 单一职责：管理夸夸触发和状态
 * 
 * 职责：
 * - 监控字数变化，触发增量夸夸
 * - 管理夸夸记录
 * - 同步夸夸到编辑器装饰
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { praiseService } from './praiseService';
import { PRAISE_TRIGGER_THRESHOLD, PRAISE_DEBOUNCE_MS } from '../../config/constants';
import type { PraiseRecord, PraiseHighlight } from './types';

export interface UsePraiseReturn {
    /** 是否正在生成夸夸 */
    isPraising: boolean;
    /** 夸夸历史记录 */
    praiseHistory: PraiseRecord[];
    /** 已读夸夸ID集合 */
    readPraises: Set<string>;
    /** 手动触发夸夸生成 */
    triggerPraise: (content: string) => Promise<void>;
    /** 标记夸夸为已读 */
    markAsRead: (id: string) => void;
    /** 转换记录为高亮格式（用于插件） */
    getHighlightsFromHistory: () => PraiseHighlight[];
}

/**
 * 夸夸功能Hook
 * 将夸夸逻辑从EditorNew.tsx中提取，实现关注点分离
 */
export function usePraise(): UsePraiseReturn {
    const praiseHistory = useStore(state => state.praiseHistory);
    const readPraises = useStore(state => state.readPraises);
    const addPraiseRecord = useStore(state => state.addPraiseRecord);
    const markPraiseAsRead = useStore(state => state.markPraiseAsRead);
    const wordCountState = useStore(state => state.wordCountState);
    const setWordCount = useStore(state => state.setWordCount);

    const [isPraising, setIsPraising] = useState(false);

    /**
     * 手动触发夸夸生成
     */
    const triggerPraise = useCallback(async (content: string) => {
        if (isPraising || !content || content.length < 10) return;

        setIsPraising(true);
        try {
            const result = await praiseService.generateIncrementalPraise(
                content,
                wordCountState.lastPraisedAt
            );

            if (result?.praises) {
                processPraiseResult(result.praises, content.length, addPraiseRecord);
                setWordCount(content.length, wordCountState.lastPraisedAt);
            }
        } catch (e) {
            console.error('[usePraise] triggerPraise failed:', e);
        } finally {
            setIsPraising(false);
        }
    }, [isPraising, wordCountState, addPraiseRecord, setWordCount]);

    /**
     * 标记夸夸为已读
     */
    const markAsRead = useCallback((id: string) => {
        markPraiseAsRead(id);
    }, [markPraiseAsRead]);

    /**
     * 将记录转换为高亮格式（用于插件同步）
     */
    const getHighlightsFromHistory = useCallback((): PraiseHighlight[] => {
        return praiseHistory.map(r => ({
            id: r.id,
            quote: r.quote || '',
            type: r.type,
            wow: r.wow,
            reason: r.reason,
        }));
    }, [praiseHistory]);

    return {
        isPraising,
        praiseHistory,
        readPraises,
        triggerPraise,
        markAsRead,
        getHighlightsFromHistory,
    };
}

/**
 * 自动夸夸Hook - 用于编辑器中的自动触发
 * @param editor 编辑器实例
 * @param enabled 是否启用
 */
export function useAutoPraise(editor: any, enabled: boolean = true) {
    const fullTextRewrite = useStore(state => state.fullTextRewrite);
    const wordCountState = useStore(state => state.wordCountState);
    const addPraiseRecord = useStore(state => state.addPraiseRecord);
    const setWordCount = useStore(state => state.setWordCount);

    const isPraisingRef = useRef(false);

    useEffect(() => {
        if (!editor || !enabled || fullTextRewrite || isPraisingRef.current) return;

        const timer = setTimeout(async () => {
            const text = editor.getText();
            const currentLength = text.length;

            const { total: lastCount } = wordCountState;
            const increment = currentLength - lastCount;

            console.log(`📊 [AutoPraise] Current: ${currentLength}, Last: ${lastCount}, Increment: ${increment}`);

            if (increment >= PRAISE_TRIGGER_THRESHOLD && currentLength > 10) {
                console.log('✨ [AutoPraise] Threshold reached! Generating...');
                isPraisingRef.current = true;

                try {
                    let result;

                    // 大量文字输入（>500字）使用批量夸夸，更多夸奖点
                    if (increment >= 500) {
                        // 每300字约1个夸夸，最少3个，最多8个
                        const targetCount = Math.min(8, Math.max(3, Math.floor(increment / 300)));
                        console.log(`📝 [AutoPraise] 检测到大量输入(${increment}字)，使用批量夸夸，目标${targetCount}个`);
                        result = await praiseService.generateBulkPraise(text, targetCount);
                    } else {
                        result = await praiseService.generateIncrementalPraise(text, lastCount);
                    }

                    if (result?.praises) {
                        console.log(`✨ [AutoPraise] 生成了 ${result.praises.length} 个夸夸`);
                        processPraiseResult(result.praises, currentLength, addPraiseRecord);
                        setWordCount(currentLength, lastCount);

                        // 触发视觉效果
                        result.praises.forEach((praise: any, index: number) => {
                            setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('showPraise', {
                                    detail: {
                                        text: praise.wow,
                                        effect: 'confetti',
                                    },
                                }));
                            }, index * 500);
                        });
                    }
                } catch (e) {
                    console.error('[AutoPraise] Generation failed:', e);
                } finally {
                    isPraisingRef.current = false;
                }
            }
        }, PRAISE_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [editor?.state.doc.content.size, fullTextRewrite, enabled, wordCountState, addPraiseRecord, setWordCount]);
}

// ======== 辅助函数 ========

/**
 * 处理夸夸结果，添加到Store
 */
function processPraiseResult(
    praises: Array<{ type: string; quote?: string; wow: string; reason: string }>,
    currentLength: number,
    addPraiseRecord: (record: PraiseRecord) => void
) {
    praises.forEach((praise, index) => {
        const record: PraiseRecord = {
            id: `praise-${Date.now()}-${index}`,
            timestamp: Date.now(),
            wordCountWhen: currentLength,
            type: (praise.type as PraiseRecord['type']) || 'progress',
            quote: praise.quote || '',
            wow: praise.wow || '不错！',
            reason: praise.reason || '',
        };

        addPraiseRecord(record);
    });
}
