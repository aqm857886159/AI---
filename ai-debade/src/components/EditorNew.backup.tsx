import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useStore } from '../store/useStore';
import { SelectionToolbar } from './SelectionToolbar';
import type { ParagraphChange, PraiseHighlight } from '../types';
import { praiseService } from '../services/praiseService';
import { CinematicPraise } from './CinematicPraise'; // V15.0 Engine
import './Editor.css';

// Plugin State Interface
interface TrackChangesState {
  paragraphChanges: ParagraphChange[];
  preview: {
    id: string | null;
    type: 'future' | 'past' | null;
  };
  decorations: DecorationSet;
}

// Plugin Action Interface
type TrackChangesAction =
  | { type: 'SET_CHANGES'; changes: ParagraphChange[] }
  | { type: 'SET_PREVIEW'; id: string | null; previewType: 'future' | 'past' | null };

// Track Changes Plugin - Paragraph Level
const trackChangesPluginKey = new PluginKey<TrackChangesState>('trackChanges');

// Praise Plugin Interface
interface PraiseState {
  highlights: PraiseHighlight[];
  decorations: DecorationSet;
}

type PraiseAction =
  | { type: 'SET_PRAISE'; highlights: PraiseHighlight[] }
  | { type: 'CLEAR_PRAISE' }
  | { type: 'UPDATE_READ_STATUS' };

const praisePluginKey = new PluginKey<PraiseState>('praise');

export const EditorNew = () => {
  const { content, setContent, fullTextRewrite, setFullTextRewrite, isRewriting, readPraises, markPraiseAsRead } = useStore();

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  // const [praiseTooltip, setPraiseTooltip] = useState<{ x: number, y: number, highlight: PraiseHighlight } | null>(null); // Removed V15
  const [isPraising, setIsPraising] = useState(false);
  const [revisionBarCenterX, setRevisionBarCenterX] = useState<number>(0); // 修订栏居中位置

  const editorRef = useRef<HTMLDivElement>(null);

  // Create track changes plugin - Paragraph Level
  const trackChangesPlugin = useMemo(() => {
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
            // console.log('🔄 [Plugin] Action:', action.type);

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
          // We recompute ONLY if action occurred OR doc changed
          // But for simplicity/correctness with preview updates, we recompute when action occurs.
          // If doc changed but no action, we map.

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
                      // Events are dispatched directly in handlers below

                      // Add hover listeners to buttons for Time Machine
                      acceptBtn.onmouseenter = () => {
                        const event = new CustomEvent('preview-change-request', { detail: { changeId: change.id, type: 'future', active: true } });
                        window.dispatchEvent(event);
                      };
                      rejectBtn.onmouseenter = () => {
                        const event = new CustomEvent('preview-change-request', { detail: { changeId: change.id, type: 'past', active: true } });
                        window.dispatchEvent(event);
                      };

                      // Mouse Leave (The parent handles the debounce, so simple leave is fine here)
                      panel.onmouseleave = () => {
                        const event = new CustomEvent('preview-change-request', { detail: { changeId: change.id, active: false } }); // Type irrelevant
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
            // Return valid state with decorations
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
          // console.log('Plugin State:', pluginState); // Debug
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

  }, []);


  // AI Praise Plugin
  const praisePlugin = useMemo(() => {
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
                  if (fullTextRewrite) {
                    console.log('[Praise] 修订模式激活中，暂时禁用夸夸显示');
                    event.preventDefault();
                    event.stopPropagation();
                    return true; // 直接返回，不触发CinematicPraise
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
    // Dependency on readPraises to trigger re-render of decorations when state changes?
    // Actually, Prosemirror plugins don't auto-update on React state changes unless we force it.
    // We'll handle this in a useEffect below.
  }, []); // Empty deps, logic handled via transaction dispatch if needed

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写点什么吧...',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
    onCreate: ({ editor }) => {
      // Register track changes plugin
      editor.registerPlugin(trackChangesPlugin);
      editor.registerPlugin(praisePlugin);
    },
    onUpdate: ({ editor }) => {
      // 只有不在改写模式下才自动同步内容，避免冲突
      if (!fullTextRewrite) {
        const html = editor.getHTML();
        setContent(html);
      }
    },
  });

  // Conflict Resolution: Clear Praise when in Revision Mode
  useEffect(() => {
    if (!editor) return;

    if (fullTextRewrite) {
      // User Feedback: "Don't mix Praise with Revision"
      // Hide Ambient Praise when doing heavy lifting
      const tr = editor.state.tr;
      tr.setMeta(praisePluginKey, { type: 'CLEAR_PRAISE' });
      editor.view.dispatch(tr);
    }
    // No else needed
  }, [fullTextRewrite, editor]);

  // 修订栏Fixed居中：动态计算编辑器中心位置
  useEffect(() => {
    if (!fullTextRewrite) {
      setRevisionBarCenterX(0);
      return;
    }

    const calculateCenter = () => {
      const container = document.querySelector('.editor-container-width');
      if (container) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        setRevisionBarCenterX(centerX);
      }
    };

    calculateCenter();
    window.addEventListener('resize', calculateCenter);
    window.addEventListener('scroll', calculateCenter);

    return () => {
      window.removeEventListener('resize', calculateCenter);
      window.removeEventListener('scroll', calculateCenter);
    };
  }, [fullTextRewrite]);

  // Apply Changes Effect (Keep strict sync logic)
  useEffect(() => {
    if (!editor || !fullTextRewrite) {
      // 清空decorations
      if (editor) {
        const tr = editor.state.tr;
        const action: TrackChangesAction = { type: 'SET_CHANGES', changes: [] };
        tr.setMeta(trackChangesPluginKey, action);
        editor.view.dispatch(tr);
      }
      return;
    }

    console.log('🎨 [EditorNew] 进入段落级修订模式（内联diff）');
    console.log('📦 [EditorNew] 段落修改数量:', fullTextRewrite.paragraphChanges?.length || 0);

    // 只应用段落级装饰
    if (fullTextRewrite.paragraphChanges && fullTextRewrite.paragraphChanges.length > 0) {
      const tr = editor.state.tr;
      const action: TrackChangesAction = {
        type: 'SET_CHANGES',
        changes: fullTextRewrite.paragraphChanges
      };
      tr.setMeta(trackChangesPluginKey, action);
      editor.view.dispatch(tr);
    }

    // 注意：不锁定编辑器，因为需要保留选择功能用于划词
    // Widget装饰已经替换了段落内容，用户无法直接编辑修订的段落
  }, [fullTextRewrite, editor]);

  // FIX V15: Dedicated handling for Read Status Updates (Burn After Reading)
  useEffect(() => {
    if (!editor) return;
    const tr = editor.state.tr;
    tr.setMeta(praisePluginKey, { type: 'UPDATE_READ_STATUS' });
    editor.view.dispatch(tr);
  }, [readPraises, editor]);

  // Handle Accept Single Paragraph
  const handleAcceptParagraph = useCallback((changeId: string) => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    console.log('✅ [EditorNew] 接受段落修改:', changeId);

    // 找到对应的修改
    const change = fullTextRewrite.paragraphChanges.find(c => c.id === changeId);
    if (!change) return;

    // ROBUST SEARCH: Use Decorations instead of scanning paragraphs by index
    // This allows us to find the correct paragraph even if indices are shifted.
    const pluginState = trackChangesPluginKey.getState(editor.state);
    if (!pluginState) return;

    const decorations = pluginState.decorations.find();
    // Find decoration for this changeId.
    // We look for the "container" decoration which is a 'node' decoration with the data attribute.
    const targetDeco = decorations.find(d =>
      d.spec['data-revision-id'] === changeId
    );

    let targetPos = -1;
    let targetSize = 0;

    if (targetDeco) {
      targetPos = targetDeco.from;
      targetSize = targetDeco.to - targetDeco.from;
      console.log(`🎯 [Position Found] via Decoration: ${targetPos} - ${targetDeco.to}`);
    } else {
      console.warn('⚠️ [Position Warning] Decoration not found, falling back to index scan (unreliable)');
      // Fallback (Logic from before, just in case)
      let paragraphIndex = 0;
      let found = false;
      editor.state.doc.descendants((node, pos) => {
        if (found) return false;
        if (node.type.name === 'paragraph') {
          if (node.textContent.trim().length === 0) return;
          if (paragraphIndex === change.index) {
            targetPos = pos;
            targetSize = node.nodeSize;
            found = true;
          }
          paragraphIndex++;
        }
      });
    }

    if (targetPos !== -1) {
      if (change.type === 'modified' && change.improvedText) {
        // 替换段落内容 (Modification usually keeps 1 paragraph -> 1 paragraph)
        const tr = editor.state.tr;
        // Use replaceWith to swap content.
        tr.replaceWith(targetPos, targetPos + targetSize, editor.schema.text(change.improvedText));
        editor.view.dispatch(tr);
      } else if (change.type === 'deleted') {
        // 删除段落 (Count decreases!)
        const tr = editor.state.tr;
        tr.delete(targetPos, targetPos + targetSize);
        editor.view.dispatch(tr);
      }
    }

    // INDEX FIX: Re-calculate indices for remaining changes
    // If we deleted a paragraph, subsequent indices must shift down.
    // Assuming 'deleted' reduces count by 1. 'modified' keeps count.
    const isDeletion = change.type === 'deleted';

    // 从列表中移除已处理的修改
    let updatedChanges = fullTextRewrite.paragraphChanges.filter(c => c.id !== changeId);

    if (isDeletion) {
      console.log('📉 [Index Shift] Detected Deletion, adjusting indices for subsequent changes...');
      updatedChanges = updatedChanges.map(c => {
        if (c.index > change.index) {
          return { ...c, index: c.index - 1 };
        }
        return c;
      });
    }

    // 如果所有修改都处理完了，清空修订状态
    if (updatedChanges.length === 0) {
      console.log('🎉 [EditorNew] 所有段落修订已处理');
      setFullTextRewrite(null);
      setTimeout(() => setContent(editor.getHTML()), 100);
    } else {
      setFullTextRewrite({
        ...fullTextRewrite,
        paragraphChanges: updatedChanges,
      });
    }
  }, [fullTextRewrite, editor, setFullTextRewrite, setContent]);

  // Handle Reject Single
  const handleRejectParagraph = useCallback((changeId: string) => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    console.log('❌ [EditorNew] 拒绝段落修改:', changeId);

    // ROBUST SEARCH: Use Decorations
    const pluginState = trackChangesPluginKey.getState(editor.state);
    if (!pluginState) return;

    const decorations = pluginState.decorations.find();
    // Find decoration for this changeId.
    const targetDeco = decorations.find(d =>
      d.spec['data-revision-id'] === changeId
    );

    if (targetDeco) {
      console.log(`🎯 [Reject Position Found] via Decoration: ${targetDeco.from}`);
      // No DOM manipulation needed for reject, just state update
    } else {
      console.warn('⚠️ [Reject Warning] Decoration not found');
    }

    // 从列表中移除被拒绝的修改（保持原文不变）
    // Index shifting is NOT required for Rejection because we keep the original paragraph
    // So 1 paragraph -> 1 paragraph. Count preserved. Indices stable.
    const updatedChanges = fullTextRewrite.paragraphChanges.filter(c => c.id !== changeId);

    // 如果所有修改都处理完了，清空修订状态
    if (updatedChanges.length === 0) {
      console.log('🎉 [EditorNew] 所有段落修订已处理');
      setFullTextRewrite(null);
      setTimeout(() => setContent(editor.getHTML()), 100);
    } else {
      setFullTextRewrite({
        ...fullTextRewrite,
        paragraphChanges: updatedChanges,
      });
    }
  }, [fullTextRewrite, editor, setFullTextRewrite, setContent]);

  // Handle Accept ALL
  const handleAcceptAll = useCallback(() => {
    if (!fullTextRewrite?.paragraphChanges || !editor) return;

    const tr = editor.state.tr;
    let paragraphIndex = 0;
    const changesByIndex = new Map(fullTextRewrite.paragraphChanges.map(c => [c.index, c]));
    const targets: { pos: number, size: number, change: ParagraphChange }[] = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        if (node.textContent.trim().length === 0) return;

        const change = changesByIndex.get(paragraphIndex);
        if (change) {
          targets.push({ pos, size: node.nodeSize, change });
        }
        paragraphIndex++;
      }
    });

    // Apply changes from last to first to preserve positions
    for (let i = targets.length - 1; i >= 0; i--) {
      const { pos, size, change } = targets[i];
      if (change.type === 'modified' && change.improvedText) {
        tr.replaceWith(pos, pos + size, editor.schema.text(change.improvedText));
      } else if (change.type === 'deleted') {
        tr.delete(pos, pos + size);
      }
    }

    editor.view.dispatch(tr);
    setFullTextRewrite(null);
    setTimeout(() => setContent(editor.getHTML()), 100);

  }, [fullTextRewrite, editor, setFullTextRewrite, setContent]);

  // Handle Reject All
  const handleRejectAll = useCallback(() => {
    setFullTextRewrite(null);
  }, [setFullTextRewrite]);

  // Event Listeners
  useEffect(() => {
    const handleAccept = (e: Event) => handleAcceptParagraph((e as CustomEvent).detail.changeId);
    const handleReject = (e: Event) => handleRejectParagraph((e as CustomEvent).detail.changeId);

    const handleApplySuggestion = (e: Event) => {
      const text = (e as CustomEvent).detail.text;
      if (editor && text) {
        // Insert at selection or replace selection
        editor.commands.insertContent(text);
      }
    };

    const handlePraiseClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      /* Removed V15 Legacy Tooltip Logic */
    };

    // Remove legacy Time Machine event listener because we handle it via plugin HandleDOMEvents now
    // But we still need these Custom Events for the buttons
    window.addEventListener('accept-paragraph-change', handleAccept);
    window.addEventListener('reject-paragraph-change', handleReject);
    window.addEventListener('apply-suggestion', handleApplySuggestion);
    // window.addEventListener('praise-click', handlePraiseClick); // Moved to CinematicPraise

    return () => {
      window.removeEventListener('accept-paragraph-change', handleAccept);
      window.removeEventListener('reject-paragraph-change', handleReject);
      window.removeEventListener('apply-suggestion', handleApplySuggestion);
      // window.removeEventListener('praise-click', handlePraiseClick);
    };
  }, [handleAcceptParagraph, handleRejectParagraph, editor]);

  // Handle Praise Generation
  // Internal function to be called by debounce

  // Ambient Trigger Strategy: Debounce on content change
  // Trigger 4 seconds after typing stops, if content length > 50
  // To save tokens, we might only do this once per session or on specific milestones
  // For this MVP, we will use a "Reflective Pause" trigger.

  // Ref to track last content to avoid duplicate checks
  const lastAnalyzedContent = useRef('');

  useEffect(() => {
    if (!editor || fullTextRewrite) return;

    const timer = setTimeout(async () => {
      const text = editor.getText();
      // LOWERED THRESHOLD FOR TESTING: 10 chars
      if (text.length > 10 && text !== lastAnalyzedContent.current && !isPraising) {
        // Only auto-trigger if significant change?
        // Or maybe just use a subtle manual trigger like a keyboard shortcut?
        // User said "Interactive on demand" is okay, but hated the button.
        // Let's rely on the "Selection Toolbar" or a very subtle status indicator.
        // Actually, "Ambient" implies it happens like magic.
        // Let's assume we trigger it.

        setIsPraising(true);
        try {
          const { characters } = useStore.getState();
          const praiseChar = characters.find(c => c.id === 'praise');
          if (praiseChar) {
            const result = await praiseService.generatePraise(text);
            if (result && result.highlights) {
              const tr = editor.state.tr;
              tr.setMeta(praisePluginKey, { type: 'SET_PRAISE', highlights: result.highlights });
              editor.view.dispatch(tr);
              lastAnalyzedContent.current = text;
            }
          }
        } catch (e) { console.error(e); } finally { setIsPraising(false); }
      }
    }, 4000); // 4 seconds pause

    return () => clearTimeout(timer);
  }, [editor?.state.doc.content.size, fullTextRewrite]); // Depend on content size change


  // Handle text selection for toolbar
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      try {
        const { from, to } = editor.state.selection;
        if (from === to) {
          setShowToolbar(false);
          return;
        }

        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!selectedText || selectedText.trim().length === 0) {
          setShowToolbar(false);
          return;
        }

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const domRange = selection.getRangeAt(0);
          const rect = domRange.getBoundingClientRect();

          setToolbarPosition({
            x: rect.left + rect.width / 2,
            y: rect.top,
          });
          setShowToolbar(true);
        }
      } catch (error) {
        console.error('❌ Selection error:', error);
        setShowToolbar(false);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, fullTextRewrite]);

  const handleGetSuggestion = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    if (selectedText && selectedText.trim().length > 0) {
      // 尝试找到包含选区的(多个)段落
      let overlappingParagraphs: { index: number; fullText: string; nodePos: number }[] = [];
      let paragraphIndex = 0;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph') {
          // 必须跳过空段落，以保持索引与 plugin 索引保持一致
          if (node.textContent.trim().length > 0) {
            const nodeStart = pos;
            const nodeEnd = pos + node.nodeSize;

            // 简单的重叠检测: Start < End && End > Start
            // 选区 [from, to] 与 节点 [nodeStart, nodeEnd] 是否重叠
            const overlap = Math.max(from, nodeStart) < Math.min(to, nodeEnd);

            if (overlap) {
              overlappingParagraphs.push({
                index: paragraphIndex,
                fullText: node.textContent,
                nodePos: nodeStart
              });
            }

            paragraphIndex++;
          }
        }
      });

      const event = new CustomEvent('get-selection-suggestion', {
        detail: {
          selectedText,
          // 发送段落范围上下文
          paragraphContext: overlappingParagraphs.length > 0 ? { paragraphs: overlappingParagraphs } : null
        },
      });
      window.dispatchEvent(event);
      setShowToolbar(false);
    }
  }, [editor]);

  /* Legacy UseEffect Removed */

  return (
    <div className="editor-wrapper" ref={editorRef} style={{ position: 'relative' }}>
      <EditorContent editor={editor} />

      {/* Non-Blocking Loading Indicator */}
      {isRewriting && (
        <div className="ai-processing-status">
          <div className="status-dot"></div>
          <span>AI 分析中...</span>
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && !fullTextRewrite && (
        <SelectionToolbar position={toolbarPosition} editor={editor} onGetSuggestion={handleGetSuggestion} />
      )}

      {/* 修订栏Fixed悬浮 - Portal到body，始终可见 */}
      {fullTextRewrite && revisionBarCenterX > 0 && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: `${revisionBarCenterX}px`,
          transform: 'translateX(-50%)',
          zIndex: 10000,
        }}>
          <div className="revision-action-bar">
            <div className="revision-info">
              <span>修订模式</span>
              <span className="badge">{fullTextRewrite.paragraphChanges?.length || 0} 处建议</span>
            </div>
            <div className="revision-buttons">
              <button className="accept-all-btn" onClick={handleAcceptAll}>全部采纳</button>
              <button className="reject-all-btn" onClick={handleRejectAll}>全部忽略</button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* V15.0: Cinematic Praise (The 12-Effect Engine) */}
      <CinematicPraise />

    </div>
  );
};

