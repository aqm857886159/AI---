/**
 * @module constants
 * @description 全局常量配置 - 集中管理魔法数字和配置项
 */

// ========================
// AI 相关配置
// ========================

/** OpenRouter 默认模型 */
export const DEFAULT_AI_MODEL = 'deepseek/deepseek-v3.2';

/** OpenRouter API 基础URL */
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/** API 请求默认温度 */
export const DEFAULT_TEMPERATURE = 0.7;

/** 高创意温度（用于夸夸系统） */
export const HIGH_CREATIVITY_TEMPERATURE = 0.8;

// ========================
// 夸夸系统配置
// ========================

/** 增量夸夸触发阈值（字符数） */
export const PRAISE_TRIGGER_THRESHOLD = 300;

/** 夸夸检测防抖时间（毫秒） */
export const PRAISE_DEBOUNCE_MS = 2000;

/** 批量夸夸分析的最大字符数 */
export const BULK_PRAISE_MAX_CHARS = 5000;

/** 增量夸夸滑动窗口大小（字符数） */
export const INCREMENTAL_PRAISE_WINDOW = 500;

// ========================
// 修订系统配置
// ========================

/** 有效修改的最小变更比例 */
export const SIGNIFICANT_CHANGE_RATIO = 0.05;

/** 悬停预览延迟清除时间（毫秒） */
export const HOVER_PREVIEW_DELAY_MS = 300;

// ========================
// UI 配置
// ========================

/** 侧边栏最小宽度 */
export const SIDEBAR_MIN_WIDTH = 250;

/** 侧边栏最大宽度 */
export const SIDEBAR_MAX_WIDTH = 800;

/** 侧边栏默认宽度 */
export const SIDEBAR_DEFAULT_WIDTH = 340;

/** 最小内容长度（触发AI分析） */
export const MIN_CONTENT_LENGTH = 50;

// ========================
// 评论字数限制
// ========================

/** 评论最大字符数 */
export const MAX_COMMENT_LENGTH = 50;

/** 修改原因最大字符数 */
export const MAX_REASON_LENGTH = 15;

// ========================
// 本地存储键名
// ========================

export const STORAGE_KEYS = {
    OPENROUTER_CONFIG: 'openrouter_config',
    AI_CHARACTERS: 'ai_characters',
    V19_AVATAR_FIX: 'v19_avatar_fix',
} as const;
