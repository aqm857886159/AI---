/**
 * @module features/revision/trackChangesPlugin
 * @description 修订装饰插件 - 单一职责：渲染修订标记和处理DOM事件
 * 
 * 重要：此插件仅负责渲染，不持有业务状态
 * 所有状态来源于Store，通过transaction metadata传递
 */

import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { HOVER_PREVIEW_DELAY_MS } from '../../config/constants';
import type { ParagraphChange, TrackChangesState, TrackChangesAction } from './types';

/** 插件Key - 用于外部访问插件状态 */
export const trackChangesPluginKey = new PluginKey<TrackChangesState>('trackChanges');

/**
 * 创建TrackChanges插件
 * 工厂函数模式，每次调用返回新实例
 */
export function createTrackChangesPlugin(): Plugin {
    let hoverTimeout: number | null = null;

    return new Plugin({
        key: trackChangesPluginKey,

        state: {
            init(): TrackChangesState {
                return {
                    paragraphChanges: [],
                    preview: { id: null, type: null },
                };
            },

            apply(tr, oldState, _oldDocState, _newDocState): TrackChangesState {
                const action = tr.getMeta(trackChangesPluginKey) as TrackChangesAction | undefined;

                let nextState = { ...oldState };

                if (action) {
                    if (action.type === 'SET_CHANGES') {
                        nextState.paragraphChanges = action.changes;
                        nextState.preview = { id: null, type: null };
                    } else if (action.type === 'SET_PREVIEW') {
                        nextState.preview = { id: action.id, type: action.previewType };
                    }
                }

                if (nextState.paragraphChanges.length === 0) {
                    return {
                        paragraphChanges: [],
                        preview: { id: null, type: null },
                    };
                }

                // 需要重新计算装饰时
                if (action || !oldState.paragraphChanges.length) {
                    return nextState;
                }

                return oldState;
            },
        },

        props: {
            decorations(state) {
                const pluginState = this.getState(state);
                if (!pluginState || pluginState.paragraphChanges.length === 0) {
                    return DecorationSet.empty;
                }

                const decorations: Decoration[] = [];
                const doc = state.doc;

                let paragraphIndex = 0;
                doc.descendants((node, pos) => {
                    if (node.type.name === 'paragraph') {
                        if (node.textContent.trim().length === 0) {
                            return;
                        }

                        const change = pluginState.paragraphChanges.find(c => c.index === paragraphIndex);

                        if (change && change.type === 'modified' && change.inlineDiff) {
                            const decos = createParagraphDecorations(
                                pos,
                                node,
                                change,
                                pluginState.preview
                            );
                            decorations.push(...decos);
                        }
                        paragraphIndex++;
                    }
                });

                return DecorationSet.create(doc, decorations);
            },

            handleDOMEvents: {
                mouseover: (view, event) => {
                    const target = event.target as HTMLElement;
                    const btn = target.closest('.revision-btn');

                    if (btn instanceof HTMLElement) {
                        if (hoverTimeout) {
                            window.clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }

                        const changeId = btn.getAttribute('data-revision-id');
                        const type = btn.getAttribute('data-action') === 'accept' ? 'future' : 'past';

                        if (changeId) {
                            const tr = view.state.tr;
                            const currentState = trackChangesPluginKey.getState(view.state);
                            if (currentState?.preview.id !== changeId || currentState?.preview.type !== type) {
                                const action: TrackChangesAction = {
                                    type: 'SET_PREVIEW',
                                    id: changeId,
                                    previewType: type as 'future' | 'past',
                                };
                                tr.setMeta(trackChangesPluginKey, action);
                                view.dispatch(tr);
                            }
                            return true;
                        }
                    } else {
                        if (!hoverTimeout) {
                            const currentState = trackChangesPluginKey.getState(view.state);
                            if (currentState && currentState.preview.id) {
                                hoverTimeout = window.setTimeout(() => {
                                    const tr = view.state.tr;
                                    const action: TrackChangesAction = {
                                        type: 'SET_PREVIEW',
                                        id: null,
                                        previewType: null,
                                    };
                                    tr.setMeta(trackChangesPluginKey, action);
                                    view.dispatch(tr);
                                    hoverTimeout = null;
                                }, HOVER_PREVIEW_DELAY_MS);
                            }
                        }
                    }
                    return false;
                },

                mousedown: (_view, event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('.revision-btn')) {
                        event.preventDefault();
                        event.stopPropagation();
                        return true;
                    }
                    return false;
                },

                click: (_view, event) => {
                    const target = event.target as HTMLElement;
                    const btn = target.closest('.revision-btn');

                    if (btn instanceof HTMLElement) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (hoverTimeout) {
                            window.clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }

                        const changeId = btn.getAttribute('data-revision-id');
                        const actionName = btn.getAttribute('data-action');

                        if (changeId && actionName) {
                            const eventName = actionName === 'accept'
                                ? 'accept-paragraph-change'
                                : 'reject-paragraph-change';
                            console.log(`🚀 [TrackChanges] ${eventName} for ${changeId}`);
                            window.dispatchEvent(new CustomEvent(eventName, { detail: { changeId } }));
                            return true;
                        }
                    }
                    return false;
                },
            },
        },
    });
}

// ======== 装饰创建辅助函数 ========

/**
 * 为单个段落创建所有装饰
 */
function createParagraphDecorations(
    pos: number,
    node: any,
    change: ParagraphChange,
    preview: { id: string | null; type: 'future' | 'past' | null }
): Decoration[] {
    const decorations: Decoration[] = [];
    const changeId = change.id;
    let currentOffset = 1;

    // 容器装饰
    let containerClass = 'revision-paragraph-unified-top';
    if (preview.id === changeId) {
        if (preview.type === 'future') {
            containerClass += ' preview-future';
        } else if (preview.type === 'past') {
            containerClass += ' preview-past';
        }
    }

    decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
            class: containerClass,
            'data-revision-id': changeId,
        })
    );

    // 内联diff装饰
    change.inlineDiff!.forEach(part => {
        if (part.type === 'delete') {
            decorations.push(
                Decoration.inline(pos + currentOffset, pos + currentOffset + part.text.length, {
                    class: 'inline-diff-delete',
                })
            );
            currentOffset += part.text.length;
        } else if (part.type === 'insert') {
            decorations.push(
                Decoration.widget(pos + currentOffset, () => {
                    const span = document.createElement('span');
                    span.className = 'inline-diff-insert-widget';
                    span.textContent = part.text;
                    return span;
                }, { side: 1 })
            );
        } else {
            currentOffset += part.text.length;
        }
    });

    // 控制面板装饰
    decorations.push(
        Decoration.widget(pos + 1, () => createControlPanel(change), { side: 1 })
    );

    return decorations;
}

/**
 * 创建段落控制面板
 */
function createControlPanel(change: ParagraphChange): HTMLElement {
    const panel = document.createElement('div');
    const isPraise = change.type === 'praise' ||
        (change.reason && (change.reason.includes('金句') || change.reason.includes('亮点')));

    panel.className = 'revision-control-floating-tab';

    // 原因部分
    const reasonContainer = document.createElement('div');
    reasonContainer.className = 'revision-reason-container';

    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'revision-toggle-btn';
    toggleBtn.innerHTML = isPraise ? '🏆' : '✨';
    toggleBtn.title = '点击查看修改原因';
    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        panel.classList.toggle('expanded');
    };

    const reasonText = document.createElement('div');
    reasonText.className = 'revision-reason-text-hidden';
    reasonText.textContent = change.reason || (isPraise ? 'AI 识别到的精彩表达' : '优化语句通顺');

    reasonContainer.appendChild(reasonText);
    reasonContainer.appendChild(toggleBtn);
    panel.appendChild(reasonContainer);

    // 按钮部分
    const btnContainer = document.createElement('div');
    btnContainer.className = 'revision-btn-group';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'revision-btn accept';
    acceptBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
    acceptBtn.setAttribute('data-revision-id', change.id);
    acceptBtn.setAttribute('data-action', 'accept');

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'revision-btn reject';
    rejectBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
    rejectBtn.setAttribute('data-revision-id', change.id);
    rejectBtn.setAttribute('data-action', 'reject');

    btnContainer.appendChild(acceptBtn);
    btnContainer.appendChild(rejectBtn);
    panel.appendChild(btnContainer);

    return panel;
}
