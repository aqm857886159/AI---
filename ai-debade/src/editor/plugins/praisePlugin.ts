import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { PraiseHighlight } from '../../types';
import { useStore } from '../../store/useStore';

// Praise Plugin Interface
export interface PraiseState {
    highlights: PraiseHighlight[];
    decorations: DecorationSet;
}

export type PraiseAction =
    | { type: 'SET_PRAISE'; highlights: PraiseHighlight[] }
    | { type: 'CLEAR_PRAISE' }
    | { type: 'UPDATE_READ_STATUS' };

export const praisePluginKey = new PluginKey<PraiseState>('praise');

export const createPraisePlugin = () => {
    return new Plugin({
        key: praisePluginKey,
        state: {
            init(): PraiseState {
                return { highlights: [], decorations: DecorationSet.empty };
            },
            apply(tr, oldState): PraiseState {
                const action = tr.getMeta(praisePluginKey) as PraiseAction | undefined;

                if (action) {
                    if (action.type === 'CLEAR_PRAISE') {
                        return { highlights: [], decorations: DecorationSet.empty };
                    }
                    // Logic reused for SET_PRAISE and UPDATE_READ_STATUS
                    if (action.type === 'SET_PRAISE' || action.type === 'UPDATE_READ_STATUS') {
                        const doc = tr.doc;
                        const decos: Decoration[] = [];
                        // Use new highlights (SET) or existing highlights (UPDATE)
                        const highlightsToProcess = action.type === 'SET_PRAISE' ? action.highlights : oldState.highlights;
                        const freshRead = useStore.getState().readPraises; // Direct Access to latest state

                        highlightsToProcess.forEach(h => {
                            const text = h.quote.trim();
                            if (!text || text.length < 2) return;

                            // Helper: Normalize text for fuzzy matching
                            const normalize = (str: string) => str.replace(/[^\w\u4e00-\u9fa5]/g, '');
                            const normalizedGoal = normalize(text);

                            // Search in doc
                            try {
                                doc.descendants((node, nodePos) => {
                                    if (node.isText && node.text) {
                                        // 1. Try Exact Match
                                        let index = node.text.indexOf(text);
                                        let matchLength = text.length;

                                        // 2. Fuzzy Match Logic
                                        if (index === -1) {
                                            const normalizedNode = normalize(node.text);
                                            const fuzzyIndex = normalizedNode.indexOf(normalizedGoal);
                                            if (fuzzyIndex !== -1) {
                                                // Snippet matching strategy
                                                const startSnippet = text.substring(0, Math.min(text.length, 5));
                                                if (startSnippet.length > 0) {
                                                    const startIndex = node.text.indexOf(startSnippet);
                                                    if (startIndex !== -1) {
                                                        index = startIndex;
                                                        matchLength = text.length; // Approx
                                                    }
                                                }
                                            }
                                        }

                                        if (index !== -1) {
                                            const from = nodePos + index;
                                            const to = from + matchLength;

                                            // CONSUME LOGIC: Hide if read
                                            const isRead = freshRead.has(h.id);

                                            if (!isRead) {
                                                decos.push(Decoration.inline(from, to, {
                                                    class: 'ai-praise-highlight',
                                                    'data-praise-id': h.id,
                                                    'data-praise-type': h.type
                                                }));
                                            }
                                        }
                                    }
                                });
                            } catch (e) {
                                console.error('Praise deco generation error', e);
                            }
                        });

                        return {
                            highlights: highlightsToProcess,
                            decorations: DecorationSet.create(doc, decos)
                        };
                    }
                }

                if (tr.docChanged && oldState.decorations) {
                    return {
                        ...oldState,
                        decorations: oldState.decorations.map(tr.mapping, tr.doc)
                    };
                }

                return oldState;
            }
        },
        props: {
            decorations(state) {
                return this.getState(state)?.decorations;
            },
            // GLOBAL EVENT DELEGATION
            handleDOMEvents: {
                click: (view, event) => {
                    const target = event.target as HTMLElement;
                    // Check if clicked ON or INSIDE a praise highlight (V5.4 New Class)
                    const praiseElement = target.closest('.ai-praise-highlight');

                    if (praiseElement) {
                        const praiseId = praiseElement.getAttribute('data-praise-id');
                        if (praiseId) {
                            // 1. Find the praise data
                            const pluginState = praisePluginKey.getState(view.state);
                            const praise = pluginState?.highlights.find((h: PraiseHighlight) => h.id === praiseId);

                            if (praise) {
                                // 架构解耦：修订模式激活时，禁用夸夸显示以避免UI冲突
                                // Strict Mode: Block interactions if Revision is active
                                if (useStore.getState().fullTextRewrite) {
                                    console.log('🔒 [Praise] 修订模式激活中，交互被阻止 (Strict Mode)');
                                    event.preventDefault();
                                    event.stopPropagation();
                                    return true;
                                }

                                // 2. Dispatch Custom Event (React Handle)
                                // Calculate position: Find paragraph TOP to position text in gap ABOVE
                                const rect = target.getBoundingClientRect();
                                const centerX = rect.left + rect.width / 2;

                                // Find the paragraph containing this praise element
                                const paragraph = praiseElement.closest('p') ||
                                    praiseElement.closest('[data-node-type="paragraph"]') ||
                                    praiseElement.parentElement;

                                const paraRect = paragraph ? paragraph.getBoundingClientRect() : rect;
                                const topY = paraRect.top; // Position at paragraph TOP

                                window.dispatchEvent(new CustomEvent('praise-click', {
                                    detail: {
                                        x: centerX,
                                        y: topY,  // Use paragraph top to place text ABOVE
                                        highlight: praise
                                    }
                                }));

                                event.preventDefault();
                                event.stopPropagation();
                                return true;
                            }
                        }
                    }
                    return false;
                },
                mouseover: () => false, // Disable Hover
                mouseout: () => false   // Disable Hover
            }
        }
    }); // End Plugin
};
