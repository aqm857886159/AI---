/**
 * @module features/ai-review
 * @description AI评论功能模块入口 - 统一导出
 */

export { useAIReview } from './useAIReview';
export type { UseAIReviewReturn } from './useAIReview';

export {
    generateCharacterReview,
    generateBatchReviews,
    generateSelectionSuggestions,
    generateParagraphRewrites,
} from './reviewService';

export type {
    AICharacter,
    Comment,
    CommentType,
    CharacterRevisionOutput,
    AISuggestion,
    WorkflowStage,
    TitleSuggestion,
    OpenRouterConfig,
} from './types';
