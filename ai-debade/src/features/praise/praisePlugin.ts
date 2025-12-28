/**
 * @module features/praise/praisePlugin
 * @description 夸夸装饰插件 - 单一职责：渲染夸夸高亮和处理点击事件
 * 
 * 重要：此插件仅负责渲染，不持有业务状态
 * 所有状态来源于Store，通过transaction metadata传递
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useStore } from '../../store/useStore';
import type { PraisePluginState, PraiseAction } from './types';

/** 插件Key - 用于外部访问插件状态 */
export const praisePluginKey = new PluginKey<PraisePluginState>('praise');

/**
 * 创建Praise插件
 * 工厂函数模式，每次调用返回新实例
 */
export function createPraisePlugin(): Plugin {
    return new Plugin({
        key: praisePluginKey,

        state: {
            init(): PraisePluginState {
                return { highlights: [] };
            },

            apply(tr, oldState): PraisePluginState {
                const action = tr.getMeta(praisePluginKey) as PraiseAction | undefined;

                if (action) {
                    if (action.type === 'CLEAR_PRAISE') {
                        return { highlights: [] };
                    }

                    if (action.type === 'SET_PRAISE' || action.type === 'UPDATE_READ_STATUS') {
                        const highlightsToProcess = action.type === 'SET_PRAISE'
                            ? action.highlights
                            : oldState.highlights;

                        return { highlights: highlightsToProcess };
                    }
                }

                return oldState;
            },
        },

        props: {
            decorations(state) {
                const pluginState = this.getState(state);
                if (!pluginState || pluginState.highlights.length === 0) {
                    return DecorationSet.empty;
                }

                const doc = state.doc;
                const decos: Decoration[] = [];
                const freshRead = useStore.getState().readPraises;

                pluginState.highlights.forEach(h => {
                    const text = h.quote?.trim();
                    if (!text || text.length < 2) return;

                    const positions = findTextPositions(doc, text);

                    positions.forEach(({ from, to }) => {
                        // 已读则不显示
                        if (freshRead.has(h.id)) return;

                        decos.push(
                            Decoration.inline(from, to, {
                                class: 'ai-praise-highlight',
                                'data-praise-id': h.id,
                                'data-praise-type': h.type,
                            })
                        );
                    });
                });

                return DecorationSet.create(doc, decos);
            },

            handleDOMEvents: {
                click: (view, event) => {
                    const target = event.target as HTMLElement;
                    const praiseElement = target.closest('.ai-praise-highlight');

                    if (praiseElement) {
                        const praiseId = praiseElement.getAttribute('data-praise-id');
                        if (praiseId) {
                            const pluginState = praisePluginKey.getState(view.state);
                            const praise = pluginState?.highlights.find(h => h.id === praiseId);

                            if (praise) {
                                // 修订模式时阻止交互
                                if (useStore.getState().fullTextRewrite) {
                                    console.log('🔒 [Praise] 修订模式激活中，交互被阻止');
                                    event.preventDefault();
                                    event.stopPropagation();
                                    return true;
                                }

                                // 派发点击事件
                                const rect = (target as HTMLElement).getBoundingClientRect();
                                const centerX = rect.left + rect.width / 2;

                                const paragraph = praiseElement.closest('p') ||
                                    praiseElement.closest('[data-node-type="paragraph"]') ||
                                    praiseElement.parentElement;

                                const paraRect = paragraph ? paragraph.getBoundingClientRect() : rect;
                                const topY = paraRect.top;

                                window.dispatchEvent(new CustomEvent('praise-click', {
                                    detail: {
                                        x: centerX,
                                        y: topY,
                                        highlight: praise,
                                    },
                                }));

                                event.preventDefault();
                                event.stopPropagation();
                                return true;
                            }
                        }
                    }
                    return false;
                },

                mouseover: () => false,
                mouseout: () => false,
            },
        },
    });
}

// ======== 辅助函数 ========

/**
 * 在文档中查找文本位置
 */
function findTextPositions(
    doc: any,
    text: string
): Array<{ from: number; to: number }> {
    const positions: Array<{ from: number; to: number }> = [];
    const normalize = (str: string) => str.replace(/[^\w\u4e00-\u9fa5]/g, '');
    const normalizedGoal = normalize(text);

    try {
        doc.descendants((node: any, nodePos: number) => {
            if (node.isText && node.text) {
                // 精确匹配
                let index = node.text.indexOf(text);
                let matchLength = text.length;

                // 模糊匹配
                if (index === -1) {
                    const normalizedNode = normalize(node.text);
                    const fuzzyIndex = normalizedNode.indexOf(normalizedGoal);
                    if (fuzzyIndex !== -1) {
                        const startSnippet = text.substring(0, Math.min(text.length, 5));
                        if (startSnippet.length > 0) {
                            const startIndex = node.text.indexOf(startSnippet);
                            if (startIndex !== -1) {
                                index = startIndex;
                                matchLength = text.length;
                            }
                        }
                    }
                }

                if (index !== -1) {
                    positions.push({
                        from: nodePos + index,
                        to: nodePos + index + matchLength,
                    });
                }
            }
        });
    } catch (e) {
        console.error('[praisePlugin] findTextPositions error:', e);
    }

    return positions;
}
