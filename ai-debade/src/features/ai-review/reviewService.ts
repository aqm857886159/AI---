/**
 * @module features/ai-review/reviewService
 * @description AI评论服务 - 单一职责：封装AI评论生成相关的API调用
 */

import { openRouterService } from '../../services/openrouter';
import { getCharacterSystemPrompt } from '../../config/characters';
import { htmlToPlainText } from '../../services/utils/textUtils';
import type { AICharacter, Comment } from './types';
import type { RevisionItem } from '../revision/types';

/**
 * 生成单个角色的评论和修订
 * @param character AI角色
 * @param content HTML内容
 * @returns 评论和修订结果
 */
export async function generateCharacterReview(
    character: AICharacter,
    content: string
): Promise<{ comment: Comment; revisions: RevisionItem[] }> {
    const plainText = htmlToPlainText(content);
    const systemPrompt = getCharacterSystemPrompt(character, 'full');

    const result = await openRouterService.getCommentWithRevisions(plainText, systemPrompt);

    const comment: Comment = {
        id: `${character.id}-${Date.now()}`,
        characterId: character.id,
        type: 'full',
        content: result.comment,
        timestamp: Date.now(),
    };

    return {
        comment,
        revisions: result.revisions || [],
    };
}

/**
 * 批量生成多个角色的评论
 * @param characters AI角色列表
 * @param content HTML内容
 * @param onCommentReady 评论生成完成回调
 * @returns 所有角色的修订结果
 */
export async function generateBatchReviews(
    characters: AICharacter[],
    content: string,
    onCommentReady: (comment: Comment) => void
): Promise<Array<{ characterId: string; characterName: string; revisions: RevisionItem[] }>> {
    const plainText = htmlToPlainText(content);

    const promises = characters.map(async (character, index) => {
        // 错开请求避免并发限制
        await new Promise(r => setTimeout(r, index * 200));

        const systemPrompt = getCharacterSystemPrompt(character, 'full');
        const result = await openRouterService.getCommentWithRevisions(plainText, systemPrompt);

        // 立即回调评论
        onCommentReady({
            id: `${character.id}-${Date.now()}`,
            characterId: character.id,
            type: 'full',
            content: result.comment,
            timestamp: Date.now(),
        });

        return {
            characterId: character.id,
            characterName: character.name,
            revisions: result.revisions || [],
        };
    });

    return Promise.all(promises);
}

/**
 * 生成选区建议
 * @param selectedText 选中的文本
 * @param characters AI角色列表
 * @param fullContent 全文内容
 * @param onCommentReady 评论生成完成回调
 */
export async function generateSelectionSuggestions(
    selectedText: string,
    characters: AICharacter[],
    fullContent: string,
    onCommentReady: (comment: Comment) => void
): Promise<void> {
    const promises = characters
        .filter(c => !c.hiddenFromPanel)
        .map(async (character, index) => {
            await new Promise(r => setTimeout(r, index * 200 + 100));

            const systemPrompt = getCharacterSystemPrompt(character, 'selection');
            const { comment } = await openRouterService.getSelectionSuggestion(
                selectedText,
                systemPrompt,
                fullContent
            );

            onCommentReady({
                id: `${character.id}-sel-${Date.now()}`,
                characterId: character.id,
                type: 'selection',
                content: comment,
                timestamp: Date.now(),
            });
        });

    await Promise.all(promises);
}

/**
 * 生成多段落改写
 * @param paragraphTexts 段落文本列表
 * @param guideline 改写指导（可选）
 * @returns 改写结果
 */
export async function generateParagraphRewrites(
    paragraphTexts: string[],
    guideline?: string
): Promise<Array<{ index: number; text: string; reason: string }>> {
    return openRouterService.getMultiParagraphRewrite(paragraphTexts, guideline);
}
