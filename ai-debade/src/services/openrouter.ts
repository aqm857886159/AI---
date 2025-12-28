/**
 * @module services/openrouter
 * @description OpenRouter API服务 - 单一职责：与OpenRouter API交互
 */

import {
  DEFAULT_AI_MODEL,
  OPENROUTER_BASE_URL,
  DEFAULT_TEMPERATURE,
  STORAGE_KEYS,
} from '../config/constants';
import type { OpenRouterConfig, CharacterRevisionOutput } from '../features/ai-review/types';

const DEFAULT_CONFIG: OpenRouterConfig = {
  apiKey: '',
  model: DEFAULT_AI_MODEL,
  baseURL: OPENROUTER_BASE_URL,
};

class OpenRouterService {
  private config: OpenRouterConfig;

  constructor() {
    const savedConfig = localStorage.getItem(STORAGE_KEYS.OPENROUTER_CONFIG);
    this.config = savedConfig ? { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) } : DEFAULT_CONFIG;
  }

  saveConfig(config: Partial<OpenRouterConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem(STORAGE_KEYS.OPENROUTER_CONFIG, JSON.stringify(this.config));
  }

  getConfig(): OpenRouterConfig {
    return { ...this.config };
  }

  hasApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    temperature = DEFAULT_TEMPERATURE
  ): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('API Key 未配置，请前往设置页面配置您的 OpenRouter API Key');
    }

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
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
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402 || errorData?.error?.code === 'insufficient_quota') {
          throw new Error('KEY_LIMIT_EXCEEDED');
        }
        throw new Error(errorData?.error?.message || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      if (error.message === 'KEY_LIMIT_EXCEEDED') throw error;
      console.error('OpenRouter API Error:', error);
      throw new Error('网络请求失败，请检查网络连接');
    }
  }

  async generateTitle(content: string): Promise<{ title: string; reason: string }> {
    const systemPrompt = `你是一位资深的文章标题策划师。
根据文章内容，生成一个吸引读者的标题。

要求：
1. 标题要简洁有力，10-20个字
2. 抓住文章核心主题
3. 具有一定的吸引力
4. 给出取这个标题的理由（简短）

请以JSON格式回复：
{
  "title": "你起的标题",
  "reason": "取这个标题的理由"
}`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为以下内容起一个标题：\n\n${content.slice(0, 2000)}` },
    ]);

    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      return JSON.parse(cleaned);
    } catch {
      return { title: '无标题', reason: '解析失败' };
    }
  }

  async getFullComment(content: string, systemPrompt: string): Promise<string> {
    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请评论以下文章：\n\n${content}` },
    ]);
    return response;
  }

  async getSelectionSuggestion(
    selectedText: string,
    systemPrompt: string,
    fullContext?: string
  ): Promise<{ comment: string; suggestion?: string }> {
    const contextHint = fullContext
      ? `\n\n[上下文]：\n${fullContext.slice(0, 1000)}`
      : '';

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `用户选中了以下文字：\n\n"${selectedText}"${contextHint}` },
    ]);

    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const data = JSON.parse(cleaned);
      return {
        comment: data.comment || response,
        suggestion: data.suggestion,
      };
    } catch {
      return { comment: response };
    }
  }

  async getRewriteSuggestion(originalText: string, fullContext?: string): Promise<string> {
    const systemPrompt = `你是一位专业的文字润色师。
请对给定的段落进行润色优化，使其更加流畅、准确、有感染力。

要求：
1. 保持原意不变
2. 修正语法错误
3. 优化表达方式
4. 不要添加无关内容
5. 直接输出润色后的文字，不要任何解释`;

    const contextHint = fullContext
      ? `\n\n[全文上下文]：\n${fullContext.slice(0, 1500)}`
      : '';

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请润色以下段落：\n\n"${originalText}"${contextHint}` },
    ]);

    return response.replace(/^["']|["']$/g, '').trim();
  }

  async getMultiParagraphRewrite(
    paragraphs: string[],
    guideline?: string
  ): Promise<{ index: number; text: string; reason: string }[]> {
    const systemPrompt = `你是一位专业的文字编辑。
请对给定的多个段落分别进行改写优化。

${guideline ? `【改写指导】：${guideline}\n` : ''}
要求：
1. 对每个段落独立处理
2. 保持原意和段落结构
3. 若某段无需修改，原样返回
4. 给出每处修改的简短理由（5-10字）

请以JSON数组格式回复：
[
  { "index": 0, "text": "改写后的段落1", "reason": "修改理由" },
  { "index": 1, "text": "改写后的段落2", "reason": "无需修改" }
]`;

    const userContent = paragraphs.map((p, i) => `[段落${i}]: ${p}`).join('\n\n');

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], 0.5);

    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      return JSON.parse(cleaned);
    } catch {
      console.error('段落改写解析失败:', response);
      return paragraphs.map((text, index) => ({
        index,
        text,
        reason: '解析失败，保持原文',
      }));
    }
  }

  async getCommentWithRevisions(
    text: string,
    systemPrompt: string
  ): Promise<CharacterRevisionOutput> {
    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请分析以下文章并返回评论和修订建议：\n\n${text}` },
    ]);

    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const data = JSON.parse(cleaned);
      return {
        comment: data.comment || '',
        revisions: data.revisions || [],
      };
    } catch {
      return {
        comment: response,
        revisions: [],
      };
    }
  }
}

export const openRouterService = new OpenRouterService();
