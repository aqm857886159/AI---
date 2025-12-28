/**
 * @module features/ai-review/types
 * @description AI评论功能的类型定义 - 单一职责：定义AI评论相关的所有类型
 */

import type { RevisionItem } from '../revision/types';

/**
 * AI角色定义
 */
export interface AICharacter {
    /** 唯一标识符 */
    id: string;
    /** 显示名称 */
    name: string;
    /** 图标组件或字符串 */
    avatar: string | React.ElementType;
    /** 头像图片URL */
    avatarUrl?: string;
    /** 人设描述 */
    personality: string;
    /** 风格标签 */
    style: string[];
    /** 系统提示词 */
    systemPrompt: string;
    /** 是否自定义角色 */
    isCustom: boolean;
    /** 是否在面板中隐藏 */
    hiddenFromPanel?: boolean;
}

/**
 * 评论类型
 */
export type CommentType = 'full' | 'selection';

/**
 * 评论数据
 */
export interface Comment {
    /** 唯一标识符 */
    id: string;
    /** 所属角色ID */
    characterId: string;
    /** 评论类型 */
    type: CommentType;
    /** 评论内容 */
    content: string;
    /** 选区位置（仅selection类型） */
    position?: {
        from: number;
        to: number;
    };
    /** 改写建议（可选） */
    suggestion?: string;
    /** 时间戳 */
    timestamp: number;
}

/**
 * 角色评论+修订的统一输出
 */
export interface CharacterRevisionOutput {
    /** 文本评论（显示在面板） */
    comment: string;
    /** 结构化修订（显示在编辑器） */
    revisions: RevisionItem[];
}

/**
 * AI建议（选中文本级别）
 */
export interface AISuggestion {
    /** 唯一标识符 */
    id: string;
    /** 所属角色ID */
    characterId: string;
    /** 原始文本 */
    originalText: string;
    /** 改进后的文本 */
    improvedText: string;
    /** 差异对比 */
    diff: Array<{
        type: 'equal' | 'delete' | 'insert';
        text: string;
    }>;
    /** 评论内容 */
    comment: string;
    /** 位置信息 */
    position: {
        from: number;
        to: number;
    };
    /** 时间戳 */
    timestamp: number;
}

/**
 * 工作流阶段
 */
export type WorkflowStage = 'idle' | 'doctoring' | 'polishing';

/**
 * 标题生成结果
 */
export interface TitleSuggestion {
    /** 建议标题 */
    title: string;
    /** 理由 */
    reason: string;
}

/**
 * OpenRouter配置
 */
export interface OpenRouterConfig {
    /** API密钥 */
    apiKey: string;
    /** 模型名称 */
    model: string;
    /** API基础URL */
    baseURL: string;
}
