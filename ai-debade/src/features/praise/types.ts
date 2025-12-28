/**
 * @module features/praise/types
 * @description 夸夸功能的类型定义 - 单一职责：定义夸夸相关的所有类型
 */

/**
 * 夸夸类型枚举
 */
export type PraiseType =
    | 'golden_sentence'  // 金句
    | 'fluency'          // 流畅
    | 'logic'            // 逻辑
    | 'emotion'          // 情感
    | 'progress'         // 进步
    | 'rhetoric'         // 修辞（旧版兼容）
    | 'insight';         // 洞察（旧版兼容）

/**
 * 夸夸高亮数据（用于编辑器装饰）
 */
export interface PraiseHighlight {
    /** 唯一标识符 */
    id: string;
    /** 夸夸类型 */
    type: PraiseType;
    /** 原文引用 */
    quote: string;
    /** 深度理由 */
    reason: string;
    /** 大白话夸奖（可选） */
    wow?: string;
}

/**
 * 夸夸记录（存储在Store中）
 */
export interface PraiseRecord {
    /** 唯一标识符 */
    id: string;
    /** 生成时间戳 */
    timestamp: number;
    /** 夸夸类型 */
    type: PraiseType;
    /** 原文引用（仅golden_sentence需要） */
    quote?: string;
    /** 大白话夸奖 */
    wow: string;
    /** 深度理由 */
    reason: string;
    /** 触发时的字数 */
    wordCountWhen: number;
}

/**
 * 写作统计数据
 */
export interface WritingStats {
    /** 总字数 */
    totalWords: number;
    /** 夸夸总数 */
    praiseCount: number;
    /** 分类统计 */
    breakdown: {
        golden: number;
        fluency: number;
        logic: number;
        emotion: number;
        progress: number;
    };
}

/**
 * 增量夸夸API响应
 */
export interface IncrementalPraiseResponse {
    praises: Array<{
        type: PraiseType;
        quote?: string;
        wow: string;
        reason: string;
    }>;
}

/**
 * 批量夸夸API响应
 */
export interface PraiseResponse {
    highlights: PraiseHighlight[];
}

/**
 * 字数状态
 */
export interface WordCountState {
    /** 当前总字数 */
    total: number;
    /** 上次触发夸夸时的字数 */
    lastPraisedAt: number;
    /** 触发阈值 */
    threshold: number;
}

/**
 * Praise插件状态
 */
export interface PraisePluginState {
    /** 高亮列表 */
    highlights: PraiseHighlight[];
}

/**
 * Praise插件Action
 */
export type PraiseAction =
    | { type: 'SET_PRAISE'; highlights: PraiseHighlight[] }
    | { type: 'CLEAR_PRAISE' }
    | { type: 'UPDATE_READ_STATUS' };
