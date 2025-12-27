import { create } from 'zustand';

import { createContentSlice } from './slices/createContentSlice';
import type { ContentSlice } from './slices/createContentSlice';

import { createAISlice } from './slices/createAISlice';
import type { AISlice } from './slices/createAISlice';

import { createRevisionSlice } from './slices/createRevisionSlice';
import type { RevisionSlice } from './slices/createRevisionSlice';

import { createPraiseSlice } from './slices/createPraiseSlice';
import type { PraiseSlice } from './slices/createPraiseSlice';

// Combine all slice interfaces
export type AppState = ContentSlice & AISlice & RevisionSlice & PraiseSlice;

console.log('🗄️ [useStore] 加载模块: 正在构建 Slice Pattern Store');

export const useStore = create<AppState>()((...a) => ({
  ...createContentSlice(...a),
  ...createAISlice(...a),
  ...createRevisionSlice(...a),
  ...createPraiseSlice(...a),
}));

console.log('✅ [useStore] Store 构建完成');
