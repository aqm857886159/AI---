/**
 * @module features/revision/revisionService
 * @description 修订服务 - 单一职责：处理修订相关的业务逻辑计算
 */

import { computeInlineDiff, hasSignificantChanges } from '../../services/utils/diffUtils';
import { splitIntoParagraphs } from '../../services/utils/textUtils';
import type { ParagraphChange, RevisionItem, FullTextRewrite } from './types';

/**
 * 从AI修订结果生成段落修改
 * @param revisions AI返回的修订列表
 * @param characterId 角色ID
 * @param characterName 角色名称
 * @returns 段落修改列表
 */
export function createParagraphChangesFromRevisions(
    revisions: RevisionItem[],
    characterId: string,
    characterName: string
): ParagraphChange[] {
    return revisions.map((rev, idx) => {
        const inlineDiff = computeInlineDiff(rev.original, rev.improved);

        return {
            id: `${characterId}-${idx}-${Date.now()}`,
            sourceCharacterId: characterId,
            sourceCharacterName: characterName,
            originalText: rev.original,
            improvedText: rev.improved,
            inlineDiff: inlineDiff,
            reason: rev.reason,
            index: 0, // 将在合并时重新计算
            type: 'modified' as const,
            nodePos: 0,
        };
    });
}

/**
 * 从多段落改写结果生成段落修改
 * @param paragraphTexts 原始段落列表
 * @param rewrittenParagraphs AI改写后的段落
 * @returns 段落修改列表
 */
export function createParagraphChangesFromRewrite(
    paragraphTexts: string[],
    rewrittenParagraphs: Array<{ index: number; text: string; reason: string }>
): ParagraphChange[] {
    const changes: ParagraphChange[] = [];

    rewrittenParagraphs.forEach((item, idx) => {
        const originalText = paragraphTexts[idx] || '';
        const improvedText = item.text;
        const reason = item.reason || '优化表达';

        // 过滤无实质性修改
        if (!hasSignificantChanges(originalText, improvedText)) {
            return;
        }

        const inlineDiff = computeInlineDiff(originalText, improvedText);

        changes.push({
            id: `fulltext-change-${idx}-${Date.now()}`,
            index: idx,
            type: 'modified',
            originalText: originalText,
            improvedText: improvedText,
            inlineDiff: inlineDiff,
            nodePos: 0,
            reason: reason,
        });
    });

    return changes;
}

/**
 * 创建FullTextRewrite对象
 * @param originalText 原始全文
 * @param paragraphChanges 段落修改列表
 * @returns FullTextRewrite对象
 */
export function createFullTextRewrite(
    originalText: string,
    paragraphChanges: ParagraphChange[]
): FullTextRewrite | null {
    if (paragraphChanges.length === 0) {
        return null;
    }

    // 计算改进后的全文
    const paragraphs = splitIntoParagraphs(originalText);
    const improvedParagraphs = [...paragraphs];

    paragraphChanges.forEach(change => {
        if (change.type === 'modified' && change.improvedText && change.index < improvedParagraphs.length) {
            improvedParagraphs[change.index] = change.improvedText;
        }
    });

    return {
        id: `rewrite-${Date.now()}`,
        originalText,
        improvedText: improvedParagraphs.join('\n'),
        paragraphChanges,
        timestamp: Date.now(),
    };
}

/**
 * 合并多个角色的修订
 * @param allRevisions 所有角色的修订结果
 * @returns 合并后的段落修改列表
 */
export function mergeRevisions(
    allRevisions: Array<{ characterId: string; characterName: string; revisions: RevisionItem[] }>
): ParagraphChange[] {
    const mergedChanges: ParagraphChange[] = [];

    allRevisions.forEach(({ characterId, characterName, revisions }) => {
        const changes = createParagraphChangesFromRevisions(revisions, characterId, characterName);
        mergedChanges.push(...changes);
    });

    return mergedChanges;
}

/**
 * 处理接受修改后的索引调整
 * @param changes 当前修改列表
 * @param acceptedChange 被接受的修改
 * @returns 调整后的修改列表
 */
export function adjustIndicesAfterAccept(
    changes: ParagraphChange[],
    acceptedChange: ParagraphChange
): ParagraphChange[] {
    const isDeletion = acceptedChange.type === 'deleted';
    let updatedChanges = changes.filter(c => c.id !== acceptedChange.id);

    if (isDeletion) {
        // 删除操作会导致后续索引需要减1
        updatedChanges = updatedChanges.map(c => {
            if (c.index > acceptedChange.index) {
                return { ...c, index: c.index - 1 };
            }
            return c;
        });
    }

    return updatedChanges;
}

/**
 * 处理拒绝修改（仅移除，不调整索引）
 * @param changes 当前修改列表
 * @param rejectedChangeId 被拒绝的修改ID
 * @returns 更新后的修改列表
 */
export function removeRejectedChange(
    changes: ParagraphChange[],
    rejectedChangeId: string
): ParagraphChange[] {
    return changes.filter(c => c.id !== rejectedChangeId);
}
