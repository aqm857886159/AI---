/**
 * 内联Diff服务
 * 用于在段落内部显示字符级别的修改
 */

import DiffMatchPatch from 'diff-match-patch';

export interface InlineDiffPart {
  type: 'equal' | 'delete' | 'insert';
  text: string;
}

/**
 * 计算段落内的字符级diff
 * 返回删除、插入、保留的文本片段
 */
export function computeInlineDiff(
  originalText: string,
  improvedText: string
): InlineDiffPart[] {
  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(originalText, improvedText);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map(([type, text]) => ({
    type: type === 1 ? 'insert' : type === -1 ? 'delete' : 'equal',
    text,
  }));
}

/**
 * 将内联diff转换为HTML字符串
 * 用于在编辑器中显示
 */
export function inlineDiffToHTML(parts: InlineDiffPart[]): string {
  return parts
    .map((part) => {
      if (part.type === 'delete') {
        // 删除的文字：黑色删除线 + 淡灰色
        return `<span class="inline-diff-delete" style="text-decoration: line-through; text-decoration-color: #000; text-decoration-thickness: 1.5px; color: #999;">${escapeHtml(
          part.text
        )}</span>`;
      } else if (part.type === 'insert') {
        // 插入的文字：淡黄色背景
        return `<span class="inline-diff-insert" style="background-color: #fff3cd; padding: 2px 0;">${escapeHtml(
          part.text
        )}</span>`;
      } else {
        // 保留的文字：正常显示
        return escapeHtml(part.text);
      }
    })
    .join('');
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 检查段落是否有实质性修改
 * 避免微小的空格、标点差异被标记为修改
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

  // 如果修改少于5%，认为没有实质性修改
  return changes / total >= 0.05;
}
