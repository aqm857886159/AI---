import DiffMatchPatch from 'diff-match-patch';
import type { DiffMark } from '../types';

const dmp = new DiffMatchPatch();

export interface DiffPart {
  type: 'equal' | 'delete' | 'insert';
  text: string;
}

/**
 * 计算两段文本之间的差异
 * @param original 原始文本
 * @param improved AI改进后的文本
 * @returns 差异数组
 */
export function computeDiff(original: string, improved: string): DiffPart[] {
  const diffs = dmp.diff_main(original, improved);
  dmp.diff_cleanupSemantic(diffs); // 让diff更符合人类直觉

  return diffs.map(([operation, text]) => {
    if (operation === 0) {
      return { type: 'equal', text };
    } else if (operation === -1) {
      return { type: 'delete', text };
    } else {
      return { type: 'insert', text };
    }
  });
}

/**
 * 将diff结果转换为HTML用于显示
 * @param diffs 差异数组
 * @returns HTML字符串
 */
export function diffToHTML(diffs: DiffPart[]): string {
  return diffs
    .map((part) => {
      if (part.type === 'equal') {
        return part.text;
      } else if (part.type === 'delete') {
        // 删除的部分显示为灰色删除线
        return `<span class="diff-delete">${escapeHtml(part.text)}</span>`;
      } else {
        // 插入的部分显示为紫色高亮
        return `<span class="diff-insert">${escapeHtml(part.text)}</span>`;
      }
    })
    .join('');
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 应用建议：将原始文本替换为改进后的文本
 * @param diffs 差异数组
 * @returns 应用建议后的纯文本
 */
export function applyDiff(diffs: DiffPart[]): string {
  return diffs
    .filter((part) => part.type !== 'delete')
    .map((part) => part.text)
    .join('');
}

/**
 * 拒绝建议：保留原始文本
 * @param diffs 差异数组
 * @returns 原始文本
 */
export function rejectDiff(diffs: DiffPart[]): string {
  return diffs
    .filter((part) => part.type !== 'insert')
    .map((part) => part.text)
    .join('');
}

/**
 * 将diff转换为独立的修改标记点
 * 这些标记点可以在编辑器中独立交互（接受/拒绝）
 * @param diffs 差异数组
 * @returns 修改标记数组
 */
export function diffToMarks(diffs: DiffPart[]): DiffMark[] {
  const marks: DiffMark[] = [];
  let position = 0; // 当前在原文中的位置

  for (let i = 0; i < diffs.length; i++) {
    const current = diffs[i];

    if (current.type === 'equal') {
      // 相等的部分，更新位置
      position += current.text.length;
    } else if (current.type === 'delete') {
      // 查看下一个是否是insert（替换操作）
      const next = diffs[i + 1];
      if (next && next.type === 'insert') {
        // 这是一个替换操作
        marks.push({
          id: `mark-${marks.length}-${Date.now()}`,
          type: 'replace',
          originalText: current.text,
          newText: next.text,
          position: {
            from: position,
            to: position + current.text.length,
          },
        });
        position += current.text.length;
        i++; // 跳过下一个insert
      } else {
        // 纯删除操作
        marks.push({
          id: `mark-${marks.length}-${Date.now()}`,
          type: 'delete',
          originalText: current.text,
          position: {
            from: position,
            to: position + current.text.length,
          },
        });
        position += current.text.length;
      }
    } else if (current.type === 'insert') {
      // 纯插入操作（在当前位置插入新内容）
      marks.push({
        id: `mark-${marks.length}-${Date.now()}`,
        type: 'insert',
        newText: current.text,
        position: {
          from: position,
          to: position, // 插入点，from和to相同
        },
      });
      // 插入不改变原文位置
    }
  }

  return marks;
}
