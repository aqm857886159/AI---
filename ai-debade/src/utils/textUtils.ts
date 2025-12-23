/**
 * 将HTML内容转换为纯文本，保留段落结构
 * 用于将编辑器内容传递给AI
 */
export function htmlToPlainText(htmlContent: string): string {
    if (!htmlContent) return '';

    const tempDiv = document.createElement('div');

    // 在每个块级元素后添加换行符，确保 textContent 不会将它们合并在一起
    // 简单粗暴但有效的方法：将 </p> 替换为 \n</p>
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
