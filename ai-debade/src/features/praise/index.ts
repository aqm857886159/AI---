/**
 * @module features/praise
 * @description 夸夸功能模块入口 - 统一导出
 */

export { usePraise, useAutoPraise } from './usePraise';
export type { UsePraiseReturn } from './usePraise';

export { praiseService } from './praiseService';

export { createPraisePlugin, praisePluginKey } from './praisePlugin';

export type {
    PraiseType,
    PraiseHighlight,
    PraiseRecord,
    WritingStats,
    IncrementalPraiseResponse,
    PraiseResponse,
    WordCountState,
    PraisePluginState,
    PraiseAction,
} from './types';
