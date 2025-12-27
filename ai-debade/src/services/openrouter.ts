import type { OpenRouterConfig } from '../types';

const DEFAULT_CONFIG: OpenRouterConfig = {
  apiKey: '',
  model: 'deepseek/deepseek-v3.2', // DeepSeek V3.2 - 高性价比模型
  baseURL: 'https://openrouter.ai/api/v1',
};

class OpenRouterService {
  private config: OpenRouterConfig;

  constructor() {
    // 从 localStorage 读取配置
    const savedConfig = localStorage.getItem('openrouter_config');
    this.config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
  }

  // 保存配置
  saveConfig(config: Partial<OpenRouterConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('openrouter_config', JSON.stringify(this.config));
  }

  // 获取当前配置
  getConfig(): OpenRouterConfig {
    return { ...this.config };
  }

  // 检查API Key是否已配置
  hasApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.trim().length > 0;
  }

  // 调用OpenRouter API
  async chat(messages: Array<{ role: string; content: string }>, temperature = 0.7): Promise<string> {
    if (!this.hasApiKey()) {
      throw new Error('请先配置 OpenRouter API Key');
    }

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI-Debade',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('OpenRouter API调用失败:', error);

      // 增强错误信息，透传给UI层
      if (error.message && (error.message.includes('Key limit exceeded') || error.message.includes('403'))) {
        throw new Error('KEY_LIMIT_EXCEEDED');
      }

      throw error;
    }
  }

  // 生成标题
  async generateTitle(content: string): Promise<{ title: string; reason: string }> {
    const prompt = `请为以下文章生成一个吸引人的标题。

【要求】
1. 标题要简洁有力，最好在15字以内
2. 要能抓住文章的核心亮点
3. 可以使用一些有趣的修辞手法
4. 不要太标题党，但也不要太平淡

【待分析文章内容】
<article_content>
${content.substring(0, 3000)}
</article_content>

【回复格式】
请直接以JSON格式回复，格式如下：
{
  "title": "标题内容",
  "reason": "为什么推荐这个标题（1句话，要有趣友好）"
}`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ], 0.8);

    try {
      // 清理可能的markdown代码块包装
      let cleanedResponse = response.trim();

      // 移除 ```json 和 ``` 包装
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      // 尝试解析JSON响应
      const parsed = JSON.parse(cleanedResponse.trim());
      return parsed;
    } catch (error) {
      console.error('解析标题JSON失败:', error, '原始响应:', response);
      // 如果不是JSON，返回默认格式
      return {
        title: response.trim().substring(0, 50),
        reason: '这个标题很有画面感~'
      };
    }
  }

  // 获取全文评论
  async getFullComment(content: string, systemPrompt: string): Promise<string> {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `文章内容：\n\n${content}` }
    ];

    return await this.chat(messages, 0.7);
  }

  // 获取选中文本的建议
  async getSelectionSuggestion(
    selectedText: string,
    systemPrompt: string,
    fullContext?: string
  ): Promise<{ comment: string; suggestion?: string }> {
    const contextInfo = fullContext
      ? `\n\n完整文章上下文：\n${fullContext}\n\n选中的文字：\n${selectedText}`
      : selectedText;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextInfo }
    ];

    const response = await this.chat(messages, 0.7);

    try {
      // 清理可能的markdown代码块包装
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      // 尝试解析JSON响应
      const parsed = JSON.parse(cleanedResponse);
      return parsed;
    } catch {
      // 如果不是JSON，返回默认格式
      return {
        comment: response.trim()
      };
    }
  }

  // 获取AI改写建议（用于diff对比）
  async getRewriteSuggestion(
    originalText: string,
    fullContext?: string
  ): Promise<string> {
    const systemPrompt = `你是专业的文字润色助手。你的任务是改写文本，使其更加流畅、准确、优美。

【重要规则】
1. 只输出改写后的文本，不要添加任何前缀、后缀、解释或说明
2. 不要使用markdown格式，不要加代码块标记
3. 保持原文的基本结构和段落
4. 修正所有错别字、语病、标点符号问题
5. 优化表达，但不要改变原意
6. 直接输出纯文本，不要说"改写如下"、"修改后"等话

【示例】
用户输入：今天天气很好的，我和朋友去了公园玩。
正确输出：今天天气很好，我和朋友去公园玩。

错误输出❌：
改写如下：今天天气很好，我和朋友去公园玩。
修改后的文本是：今天天气很好，我和朋友去公园玩。`;

    const userPrompt = fullContext
      ? `【完整文章】\n${fullContext}\n\n【需要改写的内容】\n${originalText}`
      : originalText;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.chat(messages, 0.5); // 降低温度，使输出更确定

    // 清理可能的多余文字
    let cleaned = response.trim();

    // 移除常见的前缀
    const prefixes = [
      '改写如下：', '改写后：', '修改后：', '润色后：',
      '修改如下：', '优化后：', '改进后：',
      '改写如下\n', '改写后\n', '修改后\n'
    ];

    for (const prefix of prefixes) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    }

    return cleaned;
  }

  // 获取多段落改写建议（返回结构化数据，防止合并）
  async getMultiParagraphRewrite(
    paragraphs: string[],
    guideline?: string
  ): Promise<{ index: number; text: string; reason: string }[]> {
    const inputJSON = JSON.stringify(paragraphs.map((p, i) => ({ index: i, text: p })));

    const systemPrompt = `你是一个专业的文本修订API。你的任务是逐段优化用户提供的文本段落。
    
【输入格式】
用户将提供一个JSON数组，包含若干个需要修改的段落：
[{"index": 0, "text": "一段..."}, {"index": 1, "text": "二段..."}]

【输出格式】
请务必返回一个合法的 JSON 数组，格式如下：
[
  {
    "index": 0, // 对应输入的index
    "text": "优化后的文本...", 
    "reason": "简短的修改理由(50字以内)" 
  }
]

【严格规则】
1. **结构对应**：必须为每一个输入的 paragraphs 生成对应的输出项，不要合并段落，不要拆分段落。
2. **修改原则**：修正错别字、语病，优化表达流畅度。如果某段无需修改，请返回原文本，理由填"保持原样"。
3. **Reason字段**：必须提供具体的修改理由，50字以内，例如"修正错别字"、"优化语句通顺"、"增强语气"等。禁止使用"选区优化"这种笼统的词。
4. **纯JSON**：只输出JSON，不要markdown代码块，不要其他废话。`;

    const userPrompt = `【特别指导意见】\n${guideline || '请优化这段文字，使其更通顺专业。'}\n\n【待修改段落】\n${inputJSON}`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.3); // 低温度保证格式稳定

    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      throw new Error('Response is not an array');
    } catch (e) {
      console.error('JSON Parsing failed for multi-paragraph rewrite:', e, response);
      // Fallback: 如果解析失败，返回原文本，避免报错
      return paragraphs.map((p, i) => ({ index: i, text: p, reason: 'AI响应格式错误，已保留原文' }));
    }
  }
}

export const openRouterService = new OpenRouterService();
