import type { AICharacter, Comment, AISuggestion } from '../../types';
import { DEFAULT_CHARACTERS } from '../../config/characters';

export interface AISlice {
    // State
    characters: AICharacter[];
    comments: Comment[];
    isGeneratingComments: boolean;
    aiSuggestions: AISuggestion[];

    // UI State (Related to AI Settings)
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

export const createAISlice = (set: any, get: any): AISlice => ({
    // Initialize with DEFAULT_CHARACTERS from config
    characters: DEFAULT_CHARACTERS,
    comments: [],
    isGeneratingComments: false,
    aiSuggestions: [],
    showSettings: false,
    showCharacterManager: false,

    addCharacter: (character) =>
        set((state) => {
            const newCharacters = [...state.characters, character];
            localStorage.setItem('ai_characters', JSON.stringify(newCharacters));
            return { characters: newCharacters };
        }),

    removeCharacter: (id) =>
        set((state) => {
            const newCharacters = state.characters.filter((c) => c.id !== id);
            localStorage.setItem('ai_characters', JSON.stringify(newCharacters));
            return { characters: newCharacters };
        }),

    updateCharacter: (id, updates) =>
        set((state) => {
            const newCharacters = state.characters.map((c) =>
                c.id === id ? { ...c, ...updates } : c
            );
            localStorage.setItem('ai_characters', JSON.stringify(newCharacters));
            return { characters: newCharacters };
        }),

    addComment: (comment) =>
        set((state) => ({ comments: [...state.comments, comment] })),

    clearComments: () => set({ comments: [] }),

    setGeneratingComments: (isGeneratingComments) => set({ isGeneratingComments }),

    addAISuggestion: (suggestion) =>
        set((state) => ({ aiSuggestions: [...state.aiSuggestions, suggestion] })),

    removeAISuggestion: (id) =>
        set((state) => ({ aiSuggestions: state.aiSuggestions.filter((s) => s.id !== id) })),

    clearAISuggestions: () => set({ aiSuggestions: [] }),

    setShowSettings: (showSettings) => set({ showSettings }),
    setShowCharacterManager: (showCharacterManager) => set({ showCharacterManager }),
});
