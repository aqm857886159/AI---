import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { ParagraphChange } from '../../types';

// Plugin State Interface
export interface TrackChangesState {
    paragraphChanges: ParagraphChange[];
    preview: {
        id: string | null;
        type: 'future' | 'past' | null;
    };
    decorations: DecorationSet;
}

// Plugin Action Interface
export type TrackChangesAction =
    | { type: 'SET_CHANGES'; changes: ParagraphChange[] }
    | { type: 'SET_PREVIEW'; id: string | null; previewType: 'future' | 'past' | null };

// Track Changes Plugin Key
export const trackChangesPluginKey = new PluginKey<TrackChangesState>('trackChanges');

// Helper to check if revision mode is active via Store access if needed
// Or we can rely on transaction metadata.

export const createTrackChangesPlugin = () => {
    let hoverTimeout: number | null = null; // Sticky Hover Timer

    return new Plugin({
        key: trackChangesPluginKey,

        state: {
            init(): TrackChangesState {
                return {
                    paragraphChanges: [],
                    preview: { id: null, type: null },
                    decorations: DecorationSet.empty
                };
            },

            apply(tr, oldState, _oldDocState, newDocState) {
                // Check for metadata actions
                const action = tr.getMeta(trackChangesPluginKey) as TrackChangesAction | undefined;

                let nextState = { ...oldState };

                // Handle Actions
                if (action) {
                    if (action.type === 'SET_CHANGES') {
                        nextState.paragraphChanges = action.changes;
                        // Reset preview when content changes
                        nextState.preview = { id: null, type: null };
                    } else if (action.type === 'SET_PREVIEW') {
                        // Only update preview state, keep content changes
                        nextState.preview = { id: action.id, type: action.previewType };
                    }
                }

                // If no changes at all, return empty decoration set
                if (nextState.paragraphChanges.length === 0) {
                    return {
                        paragraphChanges: [],
                        preview: { id: null, type: null },
                        decorations: DecorationSet.empty
                    };
                }

                // Compute Decorations based on nextState
                if (action || !oldState.decorations) {
                    const decorations: Decoration[] = [];
                    const doc = newDocState.doc;

                    // 遍历文档中的所有段落节点
                    let paragraphIndex = 0;
                    doc.descendants((node, pos) => {
                        if (node.type.name === 'paragraph') {
                            // IMPORTANT: 必须跳过空段落，以保持索引与 paragraphDiff.ts 一致
                            if (node.textContent.trim().length === 0) {
                                return;
                            }

                            // 查找该段落是否有对应的修改
                            const change = nextState.paragraphChanges.find(c => c.index === paragraphIndex);

                            if (change && change.type === 'modified' && change.inlineDiff) {
                                const changeId = change.id;
                                let currentOffset = 1; // Start inside paragraph

                                // Determine CSS classes based on PREVIEW STATE
                                let containerClass = 'revision-paragraph-unified-top';

                                // Check if this paragraph is being previewed
                                if (nextState.preview.id === changeId) {
                                    if (nextState.preview.type === 'future') {
                                        containerClass += ' preview-future';
                                    } else if (nextState.preview.type === 'past') {
                                        containerClass += ' preview-past';
                                    }
                                }

                                // Add unified top wrapper decoration to the paragraph
                                decorations.push(
                                    Decoration.node(pos, pos + node.nodeSize, {
                                        class: containerClass,
                                        'data-revision-id': changeId,
                                    })
                                );

                                change.inlineDiff!.forEach(part => {
                                    if (part.type === 'delete') {
                                        // 1. Mark original text as deleted (strikethrough)
                                        decorations.push(
                                            Decoration.inline(pos + currentOffset, pos + currentOffset + part.text.length, {
                                                class: 'inline-diff-delete',
                                            })
                                        );
                                        currentOffset += part.text.length;
                                    } else if (part.type === 'insert') {
                                        // 2. Add as an inline widget next to the text
                                        decorations.push(
                                            Decoration.widget(pos + currentOffset, () => {
                                                const span = document.createElement('span');
                                                span.className = 'inline-diff-insert-widget';
                                                span.textContent = part.text;
                                                return span;
                                            }, { side: 1 })
                                        );
                                        // Don't advance offset for insertions as they don't exist in original doc
                                    } else {
                                        currentOffset += part.text.length;
                                    }
                                });

                                // 3. Add Floating Tab Control Panel (Top-Right)
                                // Widget is inserted at pos+1 (inside paragraph) for correct anchoring
                                decorations.push(
                                    Decoration.widget(pos + 1, () => {
                                        const panel = document.createElement('div');

                                        // Check for Praise (Golden Touch)
                                        const isPraise = change.type === 'praise' || (change.reason && (change.reason.includes('金句') || change.reason.includes('亮点')));

                                        panel.className = 'revision-control-floating-tab'; // NEW Class Name

                                        // REASON SECTION (Sparkle + Text)
                                        const reasonContainer = document.createElement('div');
                                        reasonContainer.className = 'revision-reason-container';

                                        // 1. Sparkle Toggle Button
                                        const toggleBtn = document.createElement('div');
                                        toggleBtn.className = 'revision-toggle-btn';
                                        toggleBtn.innerHTML = isPraise ? '🏆' : '✨'; // Gold Cup for Praise, Sparkle for others
                                        toggleBtn.title = '点击查看修改原因';

                                        // Toggle Logic: Click sparkle to show text
                                        toggleBtn.onclick = (e) => {
                                            e.stopPropagation(); // Prevent editor focus loss
                                            e.preventDefault();
                                            panel.classList.toggle('expanded'); // Toggle class on PARENT
                                        };

                                        // 2. The Reason Text (Hidden by default)
                                        const reasonText = document.createElement('div');
                                        reasonText.className = 'revision-reason-text-hidden';
                                        reasonText.textContent = change.reason || (isPraise ? "AI 识别到的精彩表达" : "优化语句通顺");

                                        reasonContainer.appendChild(reasonText);
                                        reasonContainer.appendChild(toggleBtn);

                                        panel.appendChild(reasonContainer);

                                        // ACTION BUTTONS SECTION
                                        const btnContainer = document.createElement('div');
                                        btnContainer.className = 'revision-btn-group';

                                        // Accept Button
                                        const acceptBtn = document.createElement('button');
                                        acceptBtn.className = 'revision-btn accept';
                                        acceptBtn.innerHTML = `
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    `;
                                        acceptBtn.setAttribute('data-revision-id', change.id);
                                        acceptBtn.setAttribute('data-action', 'accept'); // For delegation

                                        // Reject Button
                                        const rejectBtn = document.createElement('button');
                                        rejectBtn.className = 'revision-btn reject';
                                        rejectBtn.innerHTML = `
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    `;
                                        rejectBtn.setAttribute('data-revision-id', change.id);
                                        rejectBtn.setAttribute('data-action', 'reject'); // For delegation

                                        btnContainer.appendChild(acceptBtn);
                                        btnContainer.appendChild(rejectBtn);
                                        panel.appendChild(btnContainer);

                                        // Sticky Hover Events (Forwarding to View)
                                        acceptBtn.onmouseenter = () => {
                                            const event = new CustomEvent('preview-change-request', { detail: { changeId: change.id, type: 'future', active: true } });
                                            window.dispatchEvent(event);
                                        };
                                        rejectBtn.onmouseenter = () => {
                                            const event = new CustomEvent('preview-change-request', { detail: { changeId: change.id, type: 'past', active: true } });
                                            window.dispatchEvent(event);
                                        };

                                        // Mouse Leave
                                        panel.onmouseleave = () => {
                                            const event = new CustomEvent('preview-change-request', { detail: { changeId: change.id, active: false } });
                                            window.dispatchEvent(event);
                                        };

                                        return panel;
                                    }, { side: 1 })
                                );
                            }
                            paragraphIndex++;
                        }
                    });

                    const decorationSet = DecorationSet.create(doc, decorations);
                    return {
                        decorations: decorationSet,
                        paragraphChanges: nextState.paragraphChanges,
                        preview: nextState.preview
                    };
                }

                // If no action, but doc changed, map decorations
                if (tr.docChanged && oldState.decorations) {
                    return {
                        ...oldState,
                        decorations: oldState.decorations.map(tr.mapping, tr.doc)
                    };
                }

                return oldState;
            },
        },

        props: {
            decorations(state) {
                const pluginState = this.getState(state);
                return pluginState ? pluginState.decorations : DecorationSet.empty;
            },

            // GLOBAL EVENT DELEGATION - With Sticky Hover
            handleDOMEvents: {
                mouseover: (view, event) => {
                    const target = event.target as HTMLElement;
                    const btn = target.closest('.revision-btn');

                    if (btn instanceof HTMLElement) {
                        // 1. Cancel any pending clear timer (Sticky!)
                        if (hoverTimeout) {
                            window.clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }

                        // FIX: Use 'data-revision-id' to match creation
                        const changeId = btn.getAttribute('data-revision-id');
                        const type = btn.getAttribute('data-action') === 'accept' ? 'future' : 'past';

                        if (changeId) {
                            // Dispatch directly to View (Synchronous & Fast)
                            const tr = view.state.tr;
                            // Only dispatch if state is different to avoid thrashing
                            const currentState = trackChangesPluginKey.getState(view.state);
                            if (currentState?.preview.id !== changeId || currentState?.preview.type !== type) {
                                const action: TrackChangesAction = {
                                    type: 'SET_PREVIEW',
                                    id: changeId,
                                    previewType: type as 'future' | 'past'
                                };
                                tr.setMeta(trackChangesPluginKey, action);
                                view.dispatch(tr);
                            }
                            return true;
                        }
                    } else {
                        // 2. STICKY HOVER: Don't clear immediately. Wait 300ms.
                        // If user moves back to a button, we cancel this timer.
                        if (!hoverTimeout) {
                            const currentState = trackChangesPluginKey.getState(view.state);
                            if (currentState && currentState.preview.id) {
                                hoverTimeout = window.setTimeout(() => {
                                    const tr = view.state.tr;
                                    const action: TrackChangesAction = {
                                        type: 'SET_PREVIEW',
                                        id: null,
                                        previewType: null
                                    };
                                    tr.setMeta(trackChangesPluginKey, action);
                                    view.dispatch(tr);
                                    hoverTimeout = null;
                                }, 300); // 300ms grace period
                            }
                        }
                    }
                    return false;
                },

                // Use mousedown to prevent default selection behaviors
                mousedown: (_view, event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest('.revision-btn')) {
                        event.preventDefault();
                        event.stopPropagation();
                        return true;
                    }
                    return false;
                },

                // Handle Clicks
                click: (_view, event) => {
                    const target = event.target as HTMLElement;
                    const btn = target.closest('.revision-btn');

                    if (btn instanceof HTMLElement) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (hoverTimeout) { window.clearTimeout(hoverTimeout); hoverTimeout = null; }

                        const changeId = btn.getAttribute('data-revision-id');
                        const actionName = btn.getAttribute('data-action');

                        if (changeId && actionName) {
                            // Dispatch Custom Event for React to handle the Business Logic
                            const eventName = actionName === 'accept' ? 'accept-paragraph-change' : 'reject-paragraph-change';
                            console.log(`🚀 [Delegated Click] ${eventName} for ${changeId}`);
                            window.dispatchEvent(new CustomEvent(eventName, { detail: { changeId } }));
                            return true;
                        }
                    }
                    return false;
                }
            }
        },
    });
};
