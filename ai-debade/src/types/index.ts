/**
 * @module types
 * @description 类型定义汇总导出 - 保持向后兼容
 * 
 * 注意：此文件为了向后兼容保留，新代码应从各自的features模块导入类型
 */

// Re-export from features/revision
export type {
  ParagraphChange,
  ParagraphChangeType,
  RevisionItem,
  FullTextRewrite,
  RevisionPreview,
  TrackChangesState,
  TrackChangesAction,
} from '../features/revision/types';

export type { InlineDiffPart } from '../services/utils/diffUtils';

// Re-export from features/praise
export type {
  PraiseType,
  PraiseHighlight,
  PraiseRecord,
  WritingStats,
  IncrementalPraiseResponse,
  PraiseResponse,
  WordCountState,
  PraisePluginState,
  PraiseAction,
} from '../features/praise/types';

// Re-export from features/ai-review
export type {
  AICharacter,
  Comment,
  CommentType,
  CharacterRevisionOutput,
  AISuggestion,
  WorkflowStage,
  TitleSuggestion,
  OpenRouterConfig,
} from '../features/ai-review/types';

// Legacy exports that may still be needed
export interface DiffPart {
  type: 'equal' | 'delete' | 'insert';
  text: string;
}

export interface DiffMark {
  id: string;
  characterId: string;
  characterName: string;
  original: string;
  improved: string;
  reason: string;
  diff: DiffPart[];
  from: number;
  to: number;
  timestamp: number;
}
