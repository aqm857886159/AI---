import type { TitleSuggestion } from '../../types';

export interface ContentSlice {
    // State
    content: string;
    title: string;
    titleSuggestion: TitleSuggestion | null;
    isTitleGenerating: boolean;
    selectedTextRange: { from: number; to: number } | null;

    // Actions
    setContent: (content: string) => void;
    setTitle: (title: string) => void;
    setTitleSuggestion: (suggestion: TitleSuggestion | null) => void;
    setTitleGenerating: (generating: boolean) => void;
    setSelectedTextRange: (range: { from: number; to: number } | null) => void;
}

export const createContentSlice = (set: any): ContentSlice => ({
    content: '',
    title: '',
    titleSuggestion: null,
    isTitleGenerating: false,
    selectedTextRange: null,

    setContent: (content) => set({ content }),
    setTitle: (title) => set({ title }),
    setTitleSuggestion: (titleSuggestion) => set({ titleSuggestion }),
    setTitleGenerating: (isTitleGenerating) => set({ isTitleGenerating }),
    setSelectedTextRange: (selectedTextRange) => set({ selectedTextRange }),
});
