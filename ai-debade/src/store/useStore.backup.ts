import { create } from 'zustand';
import type { AICharacter, Comment, TitleSuggestion, AISuggestion, FullTextRewrite, PraiseRecord, WritingStats } from '../types';
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

  // 夸夸 V5: 已读状态
  readPraises: Set<string>;
  markPraiseAsRead: (id: string) => void;
  clearReadPraises: () => void;

  // V17: 增量夸夸系统
  praiseHistory: PraiseRecord[];
  addPraiseRecord: (record: PraiseRecord) => void;
  getWritingStats: () => WritingStats;
  wordCountState: {
    total: number;
    lastPraisedAt: number;
    threshold: number;
  };
  updateWordCount: (total: number) => void;
  resetPraiseTracking: () => void;
}

console.log('🗄️ [useStore] 开始创建 Store');

export const useStore = create<AppState>((set) => {
  console.log('🗄️ [useStore] Store 初始化函数执行');

  // 初始角色数据 (V18: Anthropomorphic Personas)
  const initialCharacters: AICharacter[] = [
    {
      id: 'logic',
      name: 'Prof. Logic',
      avatar: '/avatars/avatar_logic_prof.png', // Local public path
      personality: 'academic',
      style: ['rational', 'structured'],
      systemPrompt: 'You are Prof. Logic, an academic expert focusing on logical structure and argumentation.',
      isCustom: false
    },
    {
      id: 'emotion',
      name: 'Emma',
      avatar: '/avatars/avatar_emotion_emma.png', // Local public path
      personality: 'warm',
      style: ['empathetic', 'gentle'],
      systemPrompt: 'You are Emma, a warm and empathetic poet who focuses on emotional resonance.',
      isCustom: false
    },
    {
      id: 'fluency',
      name: 'Editor Dan',
      // Placeholder until generation succeeds
      avatar: 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-370-456322.png',
      personality: 'professional',
      style: ['clear', 'concise'],
      systemPrompt: 'You are Editor Dan, a professional editor focused on clarity and fluency.',
      isCustom: false
    },
    {
      id: 'critic',
      name: 'Max',
      // Placeholder until generation succeeds
      avatar: 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-372-456324.png',
      personality: 'critical',
      style: ['sharp', 'insightful'],
      systemPrompt: 'You are Max, a critical thinker who challenges assumptions.',
      isCustom: false
    },
    {
      id: 'praise',
      name: 'Clara',
      // Placeholder until generation succeeds
      avatar: 'https://cdn.iconscout.com/icon/free/png-256/free-avatar-375-456327.png',
      personality: 'cheerleader',
      style: ['enthusiastic', 'supportive'],
      systemPrompt: 'You are Clara, a supportive cheerleader who highlights strengths.',
      isCustom: false,
      hiddenFromPanel: true // Clara only appears in Epilogue
    }
  ];

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

    // 初始化AI角色 (强制使用最新 V18 数据)
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

    // 夸夸已读管理
    readPraises: new Set(),
    markPraiseAsRead: (id) => set((state) => {
      const newSet = new Set(state.readPraises);
      newSet.add(id);
      return { readPraises: newSet };
    }),
    clearReadPraises: () => set({ readPraises: new Set() }),

    // V17: 增量夸夸（简化版，无统计面板）
    praiseHistory: [],
    wordCountState: {
      total: 0,
      lastPraisedAt: 0,
      threshold: 300,
    },

    addPraiseRecord: (record) =>
      set((state) => ({
        praiseHistory: [...state.praiseHistory, record],
      })),

    getWritingStats: () => {
      const state = useStore.getState();
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

    updateWordCount: (total) =>
      set((state) => ({
        wordCountState: { ...state.wordCountState, total },
      })),

    resetPraiseTracking: () =>
      set({
        praiseHistory: [],
        wordCountState: { total: 0, lastPraisedAt: 0, threshold: 300 },
      }),
  };
});

console.log('✅ [useStore] Store 创建完成');
