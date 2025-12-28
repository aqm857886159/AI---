/**
 * @module features/revision
 * @description 修订功能模块入口 - 统一导出
 */

export { useRevision } from './useRevision';
export type { UseRevisionReturn } from './useRevision';

export {
    createParagraphChangesFromRevisions,
    createParagraphChangesFromRewrite,
    createFullTextRewrite,
    mergeRevisions,
    adjustIndicesAfterAccept,
    removeRejectedChange,
} from './revisionService';

export {
    createTrackChangesPlugin,
    trackChangesPluginKey,
} from './trackChangesPlugin';

export type {
    ParagraphChange,
    ParagraphChangeType,
    RevisionItem,
    FullTextRewrite,
    RevisionPreview,
    TrackChangesState,
    TrackChangesAction,
} from './types';
