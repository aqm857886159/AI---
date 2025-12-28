/**
 * @module store/slices/createPraiseSlice
 * @description 夸夸状态管理 - 单一职责：管理夸夸历史和字数状态
 */

import type { PraiseRecord, WritingStats, WordCountState } from '../../features/praise/types';
import { PRAISE_TRIGGER_THRESHOLD } from '../../config/constants';

export interface PraiseSlice {
    // State
    praiseHistory: PraiseRecord[];
    wordCountState: WordCountState;
    readPraises: Set<string>;

    // Actions
    addPraiseRecord: (record: PraiseRecord) => void;
    setPraiseRecord: (record: PraiseRecord) => void;
    updateWordCount: (total: number) => void;
    setWordCount: (total: number, lastPraisedAt: number) => void;
    resetPraiseTracking: () => void;
    markPraiseAsRead: (id: string) => void;
    clearReadPraises: () => void;

    // Selectors
    getWritingStats: () => WritingStats;
}

export const createPraiseSlice = (set: any, get: any, _store: any): PraiseSlice => ({
    praiseHistory: [],
    wordCountState: {
        total: 0,
        lastPraisedAt: 0,
        threshold: PRAISE_TRIGGER_THRESHOLD,
    },
    readPraises: new Set(),

    addPraiseRecord: (record) =>
        set((state: PraiseSlice) => ({
            praiseHistory: [...state.praiseHistory, record],
        })),

    setPraiseRecord: (record) =>
        set((state: PraiseSlice) => ({
            praiseHistory: [...state.praiseHistory, record],
        })),

    updateWordCount: (total) =>
        set((state: PraiseSlice) => ({
            wordCountState: { ...state.wordCountState, total },
        })),

    setWordCount: (total, lastPraisedAt) =>
        set((state: PraiseSlice) => ({
            wordCountState: { ...state.wordCountState, total, lastPraisedAt },
        })),

    resetPraiseTracking: () =>
        set({
            praiseHistory: [],
            wordCountState: { total: 0, lastPraisedAt: 0, threshold: PRAISE_TRIGGER_THRESHOLD },
        }),

    markPraiseAsRead: (id) =>
        set((state: PraiseSlice) => {
            const newSet = new Set(state.readPraises);
            newSet.add(id);
            return { readPraises: newSet };
        }),

    clearReadPraises: () => set({ readPraises: new Set() }),

    getWritingStats: () => {
        const state = get();
        const breakdown = state.praiseHistory.reduce(
            (acc: any, record: PraiseRecord) => {
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
