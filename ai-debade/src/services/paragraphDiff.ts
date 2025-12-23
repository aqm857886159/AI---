/**
 * 段落级Diff服务
 * 参考Notion的实现，按段落进行比较而非字符级
 */

export interface ParagraphDiff {
  id: string;
  index: number;           // 段落索引
  type: 'unchanged' | 'modified' | 'added' | 'deleted';
  originalText: string;
  improvedText?: string;
  position: {
    from: number;          // ProseMirror position
    to: number;
  };
}

/**
 * 将文本分割为段落
 */
function splitIntoParagraphs(text: string): string[] {
  // 按双换行或单换行分段
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * 计算段落级的diff
 * 返回每个段落的修改状态
 */
export function computeParagraphDiff(
  originalText: string,
  improvedText: string
): ParagraphDiff[] {
  const originalParas = splitIntoParagraphs(originalText);
  const improvedParas = splitIntoParagraphs(improvedText);

  const diffs: ParagraphDiff[] = [];
  const maxLen = Math.max(originalParas.length, improvedParas.length);

  let currentPos = 0; // 当前在ProseMirror文档中的位置

  for (let i = 0; i < maxLen; i++) {
    const original = originalParas[i] || '';
    const improved = improvedParas[i] || '';

    // 计算段落位置（每个<p>标签占2个position，内容占text.length）
    const from = currentPos;
    const to = currentPos + original.length;

    if (!original && improved) {
      // 新增段落
      diffs.push({
        id: `para-${i}-${Date.now()}`,
        index: i,
        type: 'added',
        originalText: '',
        improvedText: improved,
        position: { from, to: from },
      });
    } else if (original && !improved) {
      // 删除段落
      diffs.push({
        id: `para-${i}-${Date.now()}`,
        index: i,
        type: 'deleted',
        originalText: original,
        position: { from, to },
      });
      currentPos = to + 2; // +2 for <p> tags
    } else if (original !== improved) {
      // 修改段落（使用相似度判断，避免微小差异也算修改）
      const similarity = calculateSimilarity(original, improved);

      if (similarity < 0.95) { // 95%以上相似度认为是同一段
        diffs.push({
          id: `para-${i}-${Date.now()}`,
          index: i,
          type: 'modified',
          originalText: original,
          improvedText: improved,
          position: { from, to },
        });
      } else {
        // 相似度太高，认为没有修改
        diffs.push({
          id: `para-${i}-${Date.now()}`,
          index: i,
          type: 'unchanged',
          originalText: original,
          position: { from, to },
        });
      }
      currentPos = to + 2;
    } else {
      // 未修改段落
      diffs.push({
        id: `para-${i}-${Date.now()}`,
        index: i,
        type: 'unchanged',
        originalText: original,
        position: { from, to },
      });
      currentPos = to + 2;
    }
  }

  return diffs.filter(d => d.type !== 'unchanged');
}

/**
 * 计算两段文本的相似度（简单的Levenshtein距离）
 */
function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein距离算法
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

/**
 * 将段落diff应用到编辑器
 * 返回需要高亮显示的段落位置
 */
export function getParagraphPositions(
  editorContent: string,
  diffs: ParagraphDiff[]
): Map<number, ParagraphDiff> {
  const positions = new Map<number, ParagraphDiff>();

  // 解析编辑器HTML，找到每个段落的实际位置
  const parser = new DOMParser();
  const doc = parser.parseFromString(editorContent, 'text/html');
  const paragraphs = doc.querySelectorAll('p');

  diffs.forEach((diff, index) => {
    if (index < paragraphs.length) {
      positions.set(index, diff);
    }
  });

  return positions;
}
