/**
 * @module store/slices/createRevisionSlice
 * @description 修订状态管理 - 单一职责：管理全文改写状态
 */

import type { FullTextRewrite } from '../../features/revision/types';
import type { WorkflowStage } from '../../features/ai-review/types';

export interface RevisionSlice {
    // State
    fullTextRewrite: FullTextRewrite | null;
    isRewriting: boolean;
    workflowStage: WorkflowStage;

    // Actions
    setFullTextRewrite: (rewrite: FullTextRewrite | null) => void;
    setIsRewriting: (rewriting: boolean) => void;
    setWorkflowStage: (stage: WorkflowStage) => void;
}

export const createRevisionSlice = (set: any, _get: any, _store: any): RevisionSlice => ({
    fullTextRewrite: null,
    isRewriting: false,
    workflowStage: 'idle',

    setFullTextRewrite: (fullTextRewrite) => set({ fullTextRewrite }),
    setIsRewriting: (isRewriting) => set({ isRewriting }),
    setWorkflowStage: (stage) => set({ workflowStage: stage }),
});
