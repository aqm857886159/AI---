import type { PraiseRecord, WritingStats } from '../../types';

export interface PraiseSlice {
    // State
    praiseHistory: PraiseRecord[];
    wordCountState: {
        total: number;
        lastPraisedAt: number;
        threshold: number;
    };
    readPraises: Set<string>;

    // Actions
    addPraiseRecord: (record: PraiseRecord) => void;
    updateWordCount: (total: number) => void;
    resetPraiseTracking: () => void;
    markPraiseAsRead: (id: string) => void;
    clearReadPraises: () => void;

    // Selectors/Computed
    getWritingStats: () => WritingStats;
}

export const createPraiseSlice = (set: any, get: any): PraiseSlice => ({
    praiseHistory: [],
    wordCountState: {
        total: 0,
        lastPraisedAt: 0,
        threshold: 300,
    },
    readPraises: new Set(),

    addPraiseRecord: (record) =>
        set((state) => ({
            praiseHistory: [...state.praiseHistory, record],
        })),

    updateWordCount: (total) =>
        set((state) => ({
            wordCountState: { ...state.wordCountState, total },
        })),

    resetPraiseTracking: () =>
        set({
            praiseHistory: [],
            wordCountState: { total: 0, lastPraisedAt: 0, threshold: 300 },
        }),

    markPraiseAsRead: (id) =>
        set((state) => {
            const newSet = new Set(state.readPraises);
            newSet.add(id);
            return { readPraises: newSet };
        }),

    clearReadPraises: () => set({ readPraises: new Set() }),

    getWritingStats: () => {
        const state = get();
        const breakdown = state.praiseHistory.reduce(
            (acc, record) => {
                if (record.type === 'golden_sentence') acc.golden++;
                else if (record.type === 'fluency') acc.fluency++;
                else if (record.type === 'logic') acc.logic++;
                else if (record.type === 'emotion') acc.emotion++;
                else if (record.type === 'progress') acc.progress++;
                return acc;
            },
            { golden: 0, fluency: 0, logic: 0, emotion: 0, progress: 0 }
        );

        return {
            totalWords: state.wordCountState.total,
            praiseCount: state.praiseHistory.length,
            breakdown,
        };
    },
});
