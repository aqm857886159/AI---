/**
 * @module features
 * @description 业务功能模块统一入口
 */

// AI Review Feature
export {
    useAIReview,
    generateCharacterReview,
    generateBatchReviews,
    generateSelectionSuggestions,
    generateParagraphRewrites,
} from './ai-review';

export type {
    UseAIReviewReturn,
    AICharacter,
    Comment,
    CommentType,
    CharacterRevisionOutput,
    AISuggestion,
    WorkflowStage,
    TitleSuggestion,
    OpenRouterConfig,
} from './ai-review';

// Revision Feature
export {
    useRevision,
    createParagraphChangesFromRevisions,
    createParagraphChangesFromRewrite,
    createFullTextRewrite,
    mergeRevisions,
    adjustIndicesAfterAccept,
    removeRejectedChange,
    createTrackChangesPlugin,
    trackChangesPluginKey,
} from './revision';

export type {
    UseRevisionReturn,
    ParagraphChange,
    ParagraphChangeType,
    RevisionItem,
    FullTextRewrite,
    RevisionPreview,
    TrackChangesState,
    TrackChangesAction,
} from './revision';

// Praise Feature
export {
    usePraise,
    useAutoPraise,
    praiseService,
    createPraisePlugin,
    praisePluginKey,
} from './praise';

export type {
    UsePraiseReturn,
    PraiseType,
    PraiseHighlight,
    PraiseRecord,
    WritingStats,
    IncrementalPraiseResponse,
    PraiseResponse,
    WordCountState,
    PraisePluginState,
    PraiseAction,
} from './praise';
