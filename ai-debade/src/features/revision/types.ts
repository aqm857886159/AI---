/**
 * @module features/revision/types
 * @description 修订功能的类型定义 - 单一职责：定义修订相关的所有类型
 */

import type { InlineDiffPart } from '../../services/utils/diffUtils';

/**
 * 段落修改类型
 */
export type ParagraphChangeType = 'modified' | 'added' | 'deleted' | 'praise';

/**
 * 段落级修改（带内联diff）
 */
export interface ParagraphChange {
    /** 唯一标识符 */
    id: string;
    /** 段落索引（在文档中的位置） */
    index: number;
    /** 修改类型 */
    type: ParagraphChangeType;
    /** 原始文本 */
    originalText: string;
    /** 改进后的文本 */
    improvedText?: string;
    /** 段落内的字符级diff */
    inlineDiff?: InlineDiffPart[];
    /** 修改理由 */
    reason?: string;
    /** ProseMirror节点位置 */
    nodePos: number;
    /** 来源角色ID */
    sourceCharacterId?: string;
    /** 来源角色名称 */
    sourceCharacterName?: string;
}

/**
 * 单个修订条目（来自AI）
 */
export interface RevisionItem {
    /** 修订类型 */
    type: 'replace' | 'insert_after' | 'delete' | 'suggest';
    /** 原始文本 */
    original: string;
    /** 改进后的文本 */
    improved: string;
    /** 修改理由 */
    reason: string;
}

/**
 * 全文改写数据结构
 */
export interface FullTextRewrite {
    /** 唯一标识符 */
    id: string;
    /** 原始全文 */
    originalText: string;
    /** 改进后的全文 */
    improvedText: string;
    /** 段落级修改列表 */
    paragraphChanges: ParagraphChange[];
    /** 时间戳 */
    timestamp: number;
}

/**
 * 修订预览状态
 */
export interface RevisionPreview {
    /** 当前预览的修改ID */
    id: string | null;
    /** 预览类型：future=显示改后，past=显示改前 */
    type: 'future' | 'past' | null;
}

/**
 * TrackChanges插件状态
 */
export interface TrackChangesState {
    /** 段落修改列表 */
    paragraphChanges: ParagraphChange[];
    /** 预览状态 */
    preview: RevisionPreview;
}

/**
 * TrackChanges插件Action
 */
export type TrackChangesAction =
    | { type: 'SET_CHANGES'; changes: ParagraphChange[] }
    | { type: 'SET_PREVIEW'; id: string | null; previewType: 'future' | 'past' | null };
