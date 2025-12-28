/**
 * @module store/slices/createAISlice
 * @description AI角色和评论状态管理 - 单一职责：管理AI角色和评论列表
 */

import { DEFAULT_CHARACTERS } from '../../config/characters';
import { STORAGE_KEYS } from '../../config/constants';
import type { AICharacter, Comment, AISuggestion } from '../../features/ai-review/types';

export interface AISlice {
    // State
    characters: AICharacter[];
    comments: Comment[];
    isGeneratingComments: boolean;
    aiSuggestions: AISuggestion[];

    // UI State
    showSettings: boolean;
    showCharacterManager: boolean;

    // Actions
    addCharacter: (character: AICharacter) => void;
    removeCharacter: (id: string) => void;
    updateCharacter: (id: string, character: Partial<AICharacter>) => void;

    addComment: (comment: Comment) => void;
    clearComments: () => void;
    setGeneratingComments: (generating: boolean) => void;

    addAISuggestion: (suggestion: AISuggestion) => void;
    removeAISuggestion: (id: string) => void;
    clearAISuggestions: () => void;

    setShowSettings: (show: boolean) => void;
    setShowCharacterManager: (show: boolean) => void;
}

export const createAISlice = (set: any, _get: any, _store: any): AISlice => ({
    characters: DEFAULT_CHARACTERS,
    comments: [],
    isGeneratingComments: false,
    aiSuggestions: [],
    showSettings: false,
    showCharacterManager: false,

    addCharacter: (character) =>
        set((state: AISlice) => {
            const newCharacters = [...state.characters, character];
            localStorage.setItem(STORAGE_KEYS.AI_CHARACTERS, JSON.stringify(newCharacters));
            return { characters: newCharacters };
        }),

    removeCharacter: (id) =>
        set((state: AISlice) => {
            const newCharacters = state.characters.filter((c: AICharacter) => c.id !== id);
            localStorage.setItem(STORAGE_KEYS.AI_CHARACTERS, JSON.stringify(newCharacters));
            return { characters: newCharacters };
        }),

    updateCharacter: (id, updates) =>
        set((state: AISlice) => {
            const newCharacters = state.characters.map((c: AICharacter) =>
                c.id === id ? { ...c, ...updates } : c
            );
            localStorage.setItem(STORAGE_KEYS.AI_CHARACTERS, JSON.stringify(newCharacters));
            return { characters: newCharacters };
        }),

    addComment: (comment) =>
        set((state: AISlice) => ({ comments: [...state.comments, comment] })),

    clearComments: () => set({ comments: [] }),

    setGeneratingComments: (isGeneratingComments) => set({ isGeneratingComments }),

    addAISuggestion: (suggestion) =>
        set((state: AISlice) => ({ aiSuggestions: [...state.aiSuggestions, suggestion] })),

    removeAISuggestion: (id) =>
        set((state: AISlice) => ({
            aiSuggestions: state.aiSuggestions.filter((s: AISuggestion) => s.id !== id),
        })),

    clearAISuggestions: () => set({ aiSuggestions: [] }),

    setShowSettings: (showSettings) => set({ showSettings }),
    setShowCharacterManager: (showCharacterManager) => set({ showCharacterManager }),
});
