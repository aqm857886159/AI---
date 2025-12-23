import { create } from 'zustand';
import type { AICharacter, Comment, TitleSuggestion, AISuggestion, FullTextRewrite } from '../types';
import { DEFAULT_CHARACTERS } from '../config/characters';

console.log('🗄️ [useStore] 模块加载');
console.log('🗄️ [useStore] DEFAULT_CHARACTERS:', DEFAULT_CHARACTERS);

interface AppState {
  // 编辑器内容
  content: string;
  setContent: (content: string) => void;

  // 标题
  title: string;
  setTitle: (title: string) => void;

  // 标题建议
  titleSuggestion: TitleSuggestion | null;
  setTitleSuggestion: (suggestion: TitleSuggestion | null) => void;
  isTitleGenerating: boolean;
  setTitleGenerating: (generating: boolean) => void;

  // AI角色
  characters: AICharacter[];
  addCharacter: (character: AICharacter) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, character: Partial<AICharacter>) => void;

  // 评论
  comments: Comment[];
  addComment: (comment: Comment) => void;
  clearComments: () => void;
  isGeneratingComments: boolean;
  setGeneratingComments: (generating: boolean) => void;

  // 选中的文本位置
  selectedTextRange: { from: number; to: number } | null;
  setSelectedTextRange: (range: { from: number; to: number } | null) => void;

  // AI建议（带diff的改写建议）
  aiSuggestions: AISuggestion[];
  addAISuggestion: (suggestion: AISuggestion) => void;
  removeAISuggestion: (id: string) => void;
  clearAISuggestions: () => void;

  // 全文改写（修订模式）
  fullTextRewrite: FullTextRewrite | null;
  setFullTextRewrite: (rewrite: FullTextRewrite | null) => void;
  acceptDiffMark: (markId: string) => void;
  rejectDiffMark: (markId: string) => void;

  // UI状态
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showCharacterManager: boolean;
  setShowCharacterManager: (show: boolean) => void;

  // 工作流状态
  workflowStage: 'idle' | 'doctoring' | 'polishing';
  setWorkflowStage: (stage: 'idle' | 'doctoring' | 'polishing') => void;
  isRewriting: boolean;
  setIsRewriting: (rewriting: boolean) => void;
}

console.log('🗄️ [useStore] 开始创建 Store');

export const useStore = create<AppState>((set) => {
  console.log('🗄️ [useStore] Store 初始化函数执行');

  // 初始化AI角色
  let initialCharacters: AICharacter[];
  try {
    const saved = localStorage.getItem('ai_characters');
    initialCharacters = saved ? JSON.parse(saved) : DEFAULT_CHARACTERS;
    console.log('✅ [useStore] 角色加载成功:', initialCharacters.length);
  } catch (error) {
    console.error('❌ [useStore] 角色加载失败:', error);
    initialCharacters = DEFAULT_CHARACTERS;
  }

  return {
    // 初始化内容
    content: '',
    setContent: (content) => set({ content }),

    // 标题
    title: '',
    setTitle: (title) => set({ title }),

    // 标题建议
    titleSuggestion: null,
    setTitleSuggestion: (titleSuggestion) => set({ titleSuggestion }),
    isTitleGenerating: false,
    setTitleGenerating: (isTitleGenerating) => set({ isTitleGenerating }),

    // AI角色
    characters: initialCharacters,

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

    // 评论
    comments: [],
    addComment: (comment) =>
      set((state) => ({ comments: [...state.comments, comment] })),
    clearComments: () => set({ comments: [] }),
    isGeneratingComments: false,
    setGeneratingComments: (isGeneratingComments) => set({ isGeneratingComments }),

    // 选中的文本
    selectedTextRange: null,
    setSelectedTextRange: (selectedTextRange) => set({ selectedTextRange }),

    // AI建议
    aiSuggestions: [],
    addAISuggestion: (suggestion) =>
      set((state) => ({ aiSuggestions: [...state.aiSuggestions, suggestion] })),
    removeAISuggestion: (id) =>
      set((state) => ({ aiSuggestions: state.aiSuggestions.filter((s) => s.id !== id) })),
    clearAISuggestions: () => set({ aiSuggestions: [] }),

    // 全文改写
    fullTextRewrite: null,
    setFullTextRewrite: (fullTextRewrite) => set({ fullTextRewrite }),
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

    // UI状态
    showSettings: false,
    setShowSettings: (showSettings) => set({ showSettings }),
    showCharacterManager: false,
    setShowCharacterManager: (showCharacterManager) => set({ showCharacterManager }),

    // 工作流状态
    workflowStage: 'idle',
    setWorkflowStage: (stage) => set({ workflowStage: stage }),
    isRewriting: false,
    setIsRewriting: (isRewriting) => set({ isRewriting }),
  };
});

console.log('✅ [useStore] Store 创建完成');
