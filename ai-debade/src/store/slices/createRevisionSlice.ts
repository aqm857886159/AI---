import type { FullTextRewrite } from '../../types';

export interface RevisionSlice {
    // State
    fullTextRewrite: FullTextRewrite | null;
    isRewriting: boolean;
    workflowStage: 'idle' | 'doctoring' | 'polishing';

    // Actions
    setFullTextRewrite: (rewrite: FullTextRewrite | null) => void;
    setIsRewriting: (rewriting: boolean) => void;
    setWorkflowStage: (stage: 'idle' | 'doctoring' | 'polishing') => void;

    // Legacy Diff Mark Actions (Backward Compatibility)
    acceptDiffMark: (markId: string) => void;
    rejectDiffMark: (markId: string) => void;
}

export const createRevisionSlice = (set: any): RevisionSlice => ({
    fullTextRewrite: null,
    isRewriting: false,
    workflowStage: 'idle',

    setFullTextRewrite: (fullTextRewrite) => set({ fullTextRewrite }),
    setIsRewriting: (isRewriting) => set({ isRewriting }),
    setWorkflowStage: (stage) => set({ workflowStage: stage }),

    acceptDiffMark: (markId) =>
        set((state) => {
            if (!state.fullTextRewrite || !state.fullTextRewrite.diffMarks) return state;
            return {
                fullTextRewrite: {
                    ...state.fullTextRewrite,
                    diffMarks: state.fullTextRewrite.diffMarks.filter((m) => m.id !== markId),
                },
            };
        }),

    rejectDiffMark: (markId) =>
        set((state) => {
            if (!state.fullTextRewrite || !state.fullTextRewrite.diffMarks) return state;
            return {
                fullTextRewrite: {
                    ...state.fullTextRewrite,
                    diffMarks: state.fullTextRewrite.diffMarks.filter((m) => m.id !== markId),
                },
            };
        }),
});
