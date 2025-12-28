/**
 * @module features/ai-review/useAIReview
 * @description AI评论功能核心Hook - 单一职责：管理AI评论生成流程
 * 
 * 职责：
 * - 管理评论生成状态
 * - 协调角色选择和评论生成
 * - 处理夸夸系统集成
 */

import { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { htmlToPlainText } from '../../services/utils/textUtils';
import {
    generateBatchReviews,
    generateSelectionSuggestions,
    generateParagraphRewrites,
} from './reviewService';
import {
    mergeRevisions,
    createParagraphChangesFromRewrite,
} from '../revision/revisionService';
import { praiseService } from '../praise/praiseService';
import { MIN_CONTENT_LENGTH } from '../../config/constants';
import type { Comment, AICharacter } from './types';
import type { FullTextRewrite, ParagraphChange } from '../revision/types';
import type { PraiseRecord } from '../praise/types';

export interface UseAIReviewReturn {
    /** 是否正在生成评论 */
    isGenerating: boolean;
    /** 评论列表 */
    comments: Comment[];
    /** 角色列表 */
    characters: AICharacter[];
    /** 开始全文评论 */
    startReview: (selectedCharacterIds: string[]) => Promise<void>;
    /** 开始选区评论 */
    startSelectionReview: (
        selectedText: string,
        paragraphContext?: { paragraphs: Array<{ index: number; fullText: string; nodePos: number }> }
    ) => Promise<void>;
    /** 根据评论生成改写 */
    generateRewriteFromComment: (commentContent: string) => Promise<void>;
    /** 清空评论 */
    clearComments: () => void;
    /** 检查是否有待处理的修订 */
    hasPendingRevisions: boolean;
}

/**
 * AI评论功能Hook
 * 将评论逻辑从CommentPanel.tsx中提取，实现关注点分离
 */
export function useAIReview(): UseAIReviewReturn {
    const content = useStore(state => state.content);
    const characters = useStore(state => state.characters);
    const comments = useStore(state => state.comments);
    const isGeneratingComments = useStore(state => state.isGeneratingComments);
    const fullTextRewrite = useStore(state => state.fullTextRewrite);

    const setGeneratingComments = useStore(state => state.setGeneratingComments);
    const addComment = useStore(state => state.addComment);
    const clearCommentsAction = useStore(state => state.clearComments);
    const setFullTextRewrite = useStore(state => state.setFullTextRewrite);
    const setWorkflowStage = useStore(state => state.setWorkflowStage);
    const setIsRewriting = useStore(state => state.setIsRewriting);
    const addPraiseRecord = useStore(state => state.addPraiseRecord);

    const hasPendingRevisions = !!(fullTextRewrite?.paragraphChanges?.length);

    /**
     * 开始全文评论
     */
    const startReview = useCallback(async (selectedCharacterIds: string[]) => {
        // 前置检查
        if (hasPendingRevisions) {
            alert('⚠️ 请先处理完当前的修订（全部接受或拒绝），再开始新的流程。');
            return;
        }

        if (!content || content.trim().length < MIN_CONTENT_LENGTH) {
            alert('写点内容再让AI们看看吧~');
            return;
        }

        if (selectedCharacterIds.length === 0) {
            alert('请至少选择一个专家');
            return;
        }

        setGeneratingComments(true);
        clearCommentsAction();
        setWorkflowStage('doctoring');

        try {
            const selectedCharacters = characters.filter(c =>
                selectedCharacterIds.includes(c.id)
            );

            // 生成评论和修订
            const allRevisions = await generateBatchReviews(
                selectedCharacters,
                content,
                addComment
            );

            // 生成夸夸
            await generatePraiseForContent(content, addPraiseRecord);

            // 合并修订并显示
            displayMergedRevisions(allRevisions, content, setFullTextRewrite);

        } catch (error: any) {
            handleReviewError(error);
        } finally {
            setGeneratingComments(false);
        }
    }, [
        content,
        characters,
        hasPendingRevisions,
        setGeneratingComments,
        clearCommentsAction,
        setWorkflowStage,
        addComment,
        setFullTextRewrite,
        addPraiseRecord,
    ]);

    /**
     * 开始选区评论
     */
    const startSelectionReview = useCallback(async (
        selectedText: string,
        paragraphContext?: { paragraphs: Array<{ index: number; fullText: string; nodePos: number }> }
    ) => {
        if (!selectedText || selectedText.trim().length === 0) return;

        setGeneratingComments(true);
        setIsRewriting(true);
        clearCommentsAction();
        setWorkflowStage('doctoring');

        console.log('🔍 [useAIReview] 开始处理选区:', {
            selectedTextLen: selectedText.length,
            paragraphCount: paragraphContext?.paragraphs?.length || 0,
        });

        try {
            const fullContent = htmlToPlainText(content);

            // 并行执行评论生成和改写生成
            const commentsPromise = generateSelectionSuggestions(
                selectedText,
                characters,
                fullContent,
                addComment
            );

            let rewritePromise = Promise.resolve();
            if (paragraphContext?.paragraphs && paragraphContext.paragraphs.length > 0) {
                rewritePromise = generateSelectionRewrite(
                    paragraphContext.paragraphs,
                    fullContent,
                    setFullTextRewrite
                );
            }

            await Promise.all([commentsPromise, rewritePromise]);

        } catch (error: any) {
            console.error('AI Processing Error:', error);
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
            alert('AI思考选中内容时出了点小差错:\n' + errorMsg + '\n(请截图反馈)');
        } finally {
            setGeneratingComments(false);
            setIsRewriting(false);
        }
    }, [
        content,
        characters,
        setGeneratingComments,
        setIsRewriting,
        clearCommentsAction,
        setWorkflowStage,
        addComment,
        setFullTextRewrite,
    ]);

    /**
     * 根据评论内容生成改写
     */
    const generateRewriteFromComment = useCallback(async (commentContent: string) => {
        if (hasPendingRevisions) {
            if (!confirm('⚠️ 当前已有未处理的修订，是否放弃它可以生成新的？')) return;
        }

        setIsRewriting(true);
        setFullTextRewrite(null);

        console.log('📝 [useAIReview] 开始生成改写, 指导意见:', commentContent.substring(0, 50));

        try {
            const plainText = htmlToPlainText(content);
            const paragraphTexts = plainText.split('\n').filter(p => p.trim().length > 0);

            console.log('📄 [useAIReview] 全文段落数:', paragraphTexts.length);

            const rewrittenParagraphs = await generateParagraphRewrites(
                paragraphTexts,
                commentContent
            );

            const paragraphChanges = createParagraphChangesFromRewrite(
                paragraphTexts,
                rewrittenParagraphs
            );

            if (paragraphChanges.length === 0) {
                console.log('⚠️ [useAIReview] AI认为无需修改');
                alert('AI认为您的文章已经很棒了，无需修改！');
                return;
            }

            const rewrite: FullTextRewrite = {
                id: `rewrite-${Date.now()}`,
                originalText: plainText,
                improvedText: rewrittenParagraphs.map(p => p.text).join('\n'),
                paragraphChanges,
                timestamp: Date.now(),
            };

            setFullTextRewrite(rewrite);
            console.log('💾 [useAIReview] 改写完成, 修改数:', paragraphChanges.length);

        } catch (error: any) {
            console.error('❌ [useAIReview] 改写失败:', error);
            if (error.message === 'KEY_LIMIT_EXCEEDED') {
                alert('⚠️ OpenRouter API Key 额度已用完或无效。\n\n请前往设置页面检查您的 API Key 状态，或充值 OpenRouter 账户。');
            } else {
                alert(`生成修订失败: ${error.message || '请重试'}`);
            }
        } finally {
            setIsRewriting(false);
        }
    }, [content, hasPendingRevisions, setIsRewriting, setFullTextRewrite]);

    /**
     * 清空评论
     */
    const clearComments = useCallback(() => {
        clearCommentsAction();
    }, [clearCommentsAction]);

    return {
        isGenerating: isGeneratingComments,
        comments,
        characters,
        startReview,
        startSelectionReview,
        generateRewriteFromComment,
        clearComments,
        hasPendingRevisions,
    };
}

// ======== 辅助函数 ========

/**
 * 生成夸夸内容
 */
async function generatePraiseForContent(
    content: string,
    addPraiseRecord: (record: PraiseRecord) => void
): Promise<void> {
    try {
        const plainText = htmlToPlainText(content);
        const praiseResult = await praiseService.generatePraise(plainText);

        if (praiseResult?.highlights && Array.isArray(praiseResult.highlights)) {
            console.log('✨ 夸夸系统生成了', praiseResult.highlights.length, '个高光');

            praiseResult.highlights.forEach((h, idx) => {
                const mapType = (highlightType: string) => {
                    if (highlightType === 'rhetoric') return 'golden_sentence';
                    if (highlightType === 'insight') return 'logic';
                    return highlightType as 'emotion' | 'logic' | 'golden_sentence';
                };

                const record: PraiseRecord = {
                    id: h.id || `praise-${Date.now()}-${idx}`,
                    timestamp: Date.now(),
                    wordCountWhen: plainText.length,
                    type: mapType(h.type),
                    quote: h.quote || '',
                    wow: h.wow || '很棒！',
                    reason: h.reason,
                };
                addPraiseRecord(record);
            });
        }
    } catch (e) {
        console.warn('夸夸系统执行失败:', e);
    }
}

/**
 * 显示合并后的修订
 */
function displayMergedRevisions(
    allRevisions: Array<{ characterId: string; characterName: string; revisions: any[] }>,
    content: string,
    setFullTextRewrite: (rewrite: FullTextRewrite | null) => void
): void {
    const mergedChanges = mergeRevisions(allRevisions);

    if (mergedChanges.length === 0) {
        console.log('⚠️ 所有AI认为无需修改');
        return;
    }

    const fullText = htmlToPlainText(content);

    // 将文档拆分为段落列表
    const paragraphs = fullText.split('\n').filter(p => p.trim().length > 0);
    console.log('📄 [displayMergedRevisions] 文档段落数:', paragraphs.length);

    // 为每个修订计算正确的段落索引
    const indexedChanges: ParagraphChange[] = [];

    mergedChanges.forEach(change => {
        // 在文档段落中查找匹配的原文
        const originalText = change.originalText.trim();
        let matchedIndex = -1;

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraphText = paragraphs[i].trim();
            // 精确匹配或包含匹配
            if (paragraphText === originalText || paragraphText.includes(originalText) || originalText.includes(paragraphText)) {
                matchedIndex = i;
                break;
            }
        }

        // 模糊匹配：如果精确匹配失败，尝试前N个字符匹配
        if (matchedIndex === -1 && originalText.length > 10) {
            const prefix = originalText.substring(0, Math.min(20, originalText.length));
            for (let i = 0; i < paragraphs.length; i++) {
                if (paragraphs[i].includes(prefix)) {
                    matchedIndex = i;
                    break;
                }
            }
        }

        if (matchedIndex !== -1) {
            indexedChanges.push({
                ...change,
                index: matchedIndex,
            });
            console.log(`✅ [displayMergedRevisions] 匹配成功: "${originalText.substring(0, 20)}..." → 段落 ${matchedIndex}`);
        } else {
            console.warn(`⚠️ [displayMergedRevisions] 无法匹配: "${originalText.substring(0, 30)}..."`);
        }
    });

    if (indexedChanges.length === 0) {
        console.log('⚠️ 所有修订都无法匹配到文档段落');
        return;
    }

    setFullTextRewrite({
        id: `merged-${Date.now()}`,
        originalText: fullText,
        improvedText: fullText,
        paragraphChanges: indexedChanges,
        timestamp: Date.now(),
    });

    console.log('✅ 合并了', indexedChanges.length, '个修订，来自', allRevisions.length, '个角色');
}

/**
 * 生成选区改写
 */
async function generateSelectionRewrite(
    paragraphs: Array<{ index: number; fullText: string; nodePos: number }>,
    fullContent: string,
    setFullTextRewrite: (rewrite: FullTextRewrite | null) => void
): Promise<void> {
    const sourceTexts = paragraphs.map(p => p.fullText);
    console.log('📝 [Selection] 请求AI改写, 段落数:', sourceTexts.length);

    const rewrittenParagraphs = await generateParagraphRewrites(sourceTexts);
    const newChanges: ParagraphChange[] = [];

    rewrittenParagraphs.forEach(item => {
        const originalP = paragraphs.find(p => p.index === paragraphs[0].index + item.index);
        const fallbackP = paragraphs[item.index];
        const targetP = originalP || fallbackP;

        if (!targetP) {
            console.warn(`[Diff] 无法匹配段落 index=${item.index}`);
            return;
        }

        const change = createParagraphChangesFromRewrite(
            [targetP.fullText],
            [{ index: 0, text: item.text, reason: item.reason || '优化表达' }]
        )[0];

        if (change) {
            newChanges.push({
                ...change,
                id: `sel-change-${targetP.index}-${Date.now()}`,
                index: targetP.index,
                nodePos: targetP.nodePos,
            });
        }
    });

    if (newChanges.length > 0) {
        console.log('✅ [Selection] 生成了', newChanges.length, '个修订');
        setFullTextRewrite({
            id: `selection-rewrite-${Date.now()}`,
            originalText: fullContent,
            improvedText: fullContent,
            paragraphChanges: newChanges,
            timestamp: Date.now(),
        });
    } else {
        console.log('⚠️ [Selection] AI认为无需修改');
    }
}

/**
 * 处理评论错误
 */
function handleReviewError(error: any): void {
    console.error(error);
    if (error.message === 'KEY_LIMIT_EXCEEDED') {
        alert('⚠️ OpenRouter API Key 额度已用完或无效。\n\n请前往设置页面检查您的 API Key 状态，或充值 OpenRouter 账户。');
    } else {
        alert(`生成过程中出现了一些问题: ${error.message || '请重试'}`);
    }
}
