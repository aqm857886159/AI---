/**
 * @module textUtils
 * @description 文本处理工具 - HTML转纯文本、Markdown清理等
 */

/**
 * 将HTML内容转换为纯文本，保留段落结构
 * 用于将编辑器内容传递给AI
 * @param htmlContent HTML字符串
 * @returns 纯文本字符串
 */
export function htmlToPlainText(htmlContent: string): string {
    if (!htmlContent) return '';

    const tempDiv = document.createElement('div');

    // 在每个块级元素后添加换行符，确保 textContent 不会将它们合并在一起
    const processedContent = htmlContent
        .replace(/<\/p>/gi, '\n</p>')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>/gi, '\n</div>')
        .replace(/<\/h[1-6]>/gi, '\n</h>');

    tempDiv.innerHTML = processedContent;
    return (tempDiv.textContent || tempDiv.innerText || '').trim();
}

/**
 * 清理Markdown格式，移除加粗、斜体等标记
 * 用于显示干净的评论内容
 * @param text Markdown文本
 * @returns 纯文本
 */
export function cleanMarkdown(text: string): string {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
        .replace(/`{3}[\s\S]*?`{3}/g, '[代码]') // Remove code blocks
        .replace(/`(.*?)`/g, '$1');      // Remove inline code
}

/**
 * 将文本按段落拆分（过滤空段落）
 * @param text 纯文本
 * @returns 段落数组
 */
export function splitIntoParagraphs(text: string): string[] {
    return text.split('\n').filter(p => p.trim().length > 0);
}

/**
 * 计算文本字符数（用于夸夸系统）
 * @param text 文本
 * @returns 字符数
 */
export function countCharacters(text: string): number {
    return text.length;
}

/**
 * 截断文本到指定长度，添加省略号
 * @param text 原文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}
