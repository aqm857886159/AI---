/**
 * @module diffUtils
 * @description Diff计算工具 - 提供字符级差异对比和HTML转换功能
 */

import DiffMatchPatch from 'diff-match-patch';
import { SIGNIFICANT_CHANGE_RATIO } from '../../config/constants';

export interface InlineDiffPart {
    type: 'equal' | 'delete' | 'insert';
    text: string;
}

/**
 * 计算两段文本的字符级diff
 * @param originalText 原始文本
 * @param improvedText 改进后的文本
 * @returns diff片段数组
 */
export function computeInlineDiff(
    originalText: string,
    improvedText: string
): InlineDiffPart[] {
    // 防御性编程：diff-match-patch的diff_main不接受null/undefined
    // 当AI返回的revision缺少original或improved时，返回安全的默认值
    if (!originalText && !improvedText) {
        return [];
    }
    if (!originalText) {
        return [{ type: 'insert', text: improvedText }];
    }
    if (!improvedText) {
        return [{ type: 'delete', text: originalText }];
    }

    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(originalText, improvedText);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map(([type, text]) => ({
        type: type === 1 ? 'insert' : type === -1 ? 'delete' : 'equal',
        text,
    }));
}

/**
 * 将diff结果转换为带样式的HTML字符串
 * @param parts diff片段数组
 * @returns HTML字符串
 */
export function inlineDiffToHTML(parts: InlineDiffPart[]): string {
    return parts
        .map((part) => {
            if (part.type === 'delete') {
                return `<span class="inline-diff-delete" style="text-decoration: line-through; text-decoration-color: #000; text-decoration-thickness: 1.5px; color: #999;">${escapeHtml(
                    part.text
                )}</span>`;
            } else if (part.type === 'insert') {
                return `<span class="inline-diff-insert" style="background-color: #fff3cd; padding: 2px 0;">${escapeHtml(
                    part.text
                )}</span>`;
            } else {
                return escapeHtml(part.text);
            }
        })
        .join('');
}

/**
 * HTML转义，防止XSS
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 检查两段文本是否有实质性修改
 * 过滤掉微小的空格、标点差异
 * @param originalText 原始文本
 * @param improvedText 改进后的文本
 * @returns 是否有实质性修改
 */
export function hasSignificantChanges(
    originalText: string,
    improvedText: string
): boolean {
    // 归一化文本：去除多余空格、统一标点
    const normalize = (text: string) =>
        text
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    const normalizedOriginal = normalize(originalText);
    const normalizedImproved = normalize(improvedText);

    // 如果归一化后相同，则认为没有实质性修改
    if (normalizedOriginal === normalizedImproved) {
        return false;
    }

    // 计算差异比例
    const dmp = new DiffMatchPatch();
    const diffs = dmp.diff_main(normalizedOriginal, normalizedImproved);
    const changes = diffs.filter((d) => d[0] !== 0).reduce((sum, d) => sum + d[1].length, 0);
    const total = Math.max(normalizedOriginal.length, normalizedImproved.length);

    // 如果修改少于阈值比例，认为没有实质性修改
    return changes / total >= SIGNIFICANT_CHANGE_RATIO;
}
