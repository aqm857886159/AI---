/**
 * @module services/utils
 * @description 工具函数统一导出入口
 */

export {
    computeInlineDiff,
    inlineDiffToHTML,
    escapeHtml,
    hasSignificantChanges,
    type InlineDiffPart,
} from './diffUtils';

export {
    htmlToPlainText,
    cleanMarkdown,
    splitIntoParagraphs,
    countCharacters,
    truncateText,
} from './textUtils';
