import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { openRouterService } from '../services/openrouter';
import { computeInlineDiff, hasSignificantChanges } from '../services/inlineDiff';
import type { FullTextRewrite, ParagraphChange } from '../types';
import { getCharacterSystemPrompt } from '../config/characters';
import ReactMarkdown from 'react-markdown';
import './CommentPanel.css';
import { htmlToPlainText } from '../utils/textUtils';

export const CommentPanel = () => {
  const {
    comments,
    characters,
    content,
    isGeneratingComments,
    setGeneratingComments,
    addComment,
    clearComments,
    setFullTextRewrite,
    fullTextRewrite,
    setWorkflowStage,
    setIsRewriting,
  } = useStore();

  // V18 Migration: Clear legacy character data from localStorage one time
  useEffect(() => {
    const hasMigrated = localStorage.getItem('v18_avatar_migration');
    if (!hasMigrated) {
      console.log('🔄 [V18] Clearing legacy characters to enforce new avatars...');
      localStorage.removeItem('ai_characters');
      localStorage.setItem('v18_avatar_migration', 'true');
      window.location.reload(); // Force reload to pick up new config
    }
  }, []);

  // 检查是否有未处理的修订
  const hasPendingChanges = () => {
    return fullTextRewrite && fullTextRewrite.paragraphChanges && fullTextRewrite.paragraphChanges.length > 0;
  };

  // 通用改写生成函数 (使用结构化API)
  const generateRewrite = async (guideline: string, sourceText: string) => {
    try {
      setIsRewriting(true);
      setFullTextRewrite(null);

      console.log('📝 [FullText Revision] 开始生成改写, 指导意见:', guideline.substring(0, 50));

      // 将全文按段落拆分
      const paragraphTexts = sourceText.split('\n').filter(p => p.trim().length > 0);

      console.log('📄 [FullText] 全文段落数:', paragraphTexts.length);

      // 使用结构化API（与选区修订一致）
      const rewrittenParagraphs = await openRouterService.getMultiParagraphRewrite(
        paragraphTexts,
        guideline
      );

      const paragraphChanges: ParagraphChange[] = [];

      rewrittenParagraphs.forEach((item, idx) => {
        const originalText = paragraphTexts[idx] || '';
        const improvedText = item.text;
        const reason = item.reason || '优化表达';

        if (!hasSignificantChanges(originalText, improvedText)) {
          return;
        }

        const inlineDiff = computeInlineDiff(originalText, improvedText);

        paragraphChanges.push({
          id: `fulltext-change-${idx}-${Date.now()}`,
          index: idx,
          type: 'modified',
          originalText: originalText,
          improvedText: improvedText,
          inlineDiff: inlineDiff,
          nodePos: 0, // Full-text mode doesn't have precise node positions
          reason: reason
        });
      });

      if (paragraphChanges.length === 0) {
        console.log('⚠️ [FullText] AI认为无需修改');
        alert('AI认为您的文章已经很棒了，无需修改！');
        return;
      }

      const improvedFullText = rewrittenParagraphs.map(p => p.text).join('\n');

      const rewrite: FullTextRewrite = {
        id: `rewrite-${Date.now()}`,
        originalText: sourceText,
        improvedText: improvedFullText,
        paragraphChanges,
        timestamp: Date.now(),
      };

      setFullTextRewrite(rewrite);
      console.log('💾 [FullText Revision] 改写完成, 修改数:', paragraphChanges.length);

    } catch (error: any) {
      console.error('❌ [FullText Revision] 改写失败:', error);
      if (error.message === 'KEY_LIMIT_EXCEEDED') {
        alert('⚠️ OpenRouter API Key 额度已用完或无效。\n\n请前往设置页面检查您的 API Key 状态，或充值 OpenRouter 账户。');
      } else {
        alert(`生成修订失败: ${error.message || '请重试'}`);
      }
    } finally {
      setIsRewriting(false);
    }
  };

  /**
   * 一键启动全流程：
   * 1. 并没有分阶段，而是所有角色并发生成评论。
   * 2. 同时生成一份“综合修订方案”。
   */
  const startFullReview = async () => {
    if (hasPendingChanges()) {
      alert('⚠️ 请先处理完当前的修订（全部接受或拒绝），再开始新的流程。');
      return;
    }

    if (!content || content.trim().length < 50) {
      alert('写点内容再让AI们看看吧~');
      return;
    }

    setGeneratingComments(true);
    clearComments();
    setWorkflowStage('doctoring'); // 复用状态，表示“正在评审中”

    // 获取最新纯文本
    const plainText = htmlToPlainText(content);

    try {
      // 任务A：所有角色并发评论
      const commentsPromise = (async () => {
        // 使用 Promise.all 并发执行，但为了避免速率限制，可以分组执行或者简单并发
        // 这里为了速度直接并发，OpenRouter通常能抗住
        const promises = characters
          .filter(c => !c.hiddenFromPanel)
          .map(async (character, index) => {
            // 加一点点随机延迟，避免所有请求毫秒级同时到达
            await new Promise(r => setTimeout(r, index * 200));

            const systemPrompt = getCharacterSystemPrompt(character, 'full');
            const commentContent = await openRouterService.getFullComment(plainText, systemPrompt);

            addComment({
              id: `${character.id}-${Date.now()}`,
              characterId: character.id,
              type: 'full',
              content: commentContent,
              timestamp: Date.now(),
            });
          });
        await Promise.all(promises);
      })();

      // 任务B：生成“综合修订版”
      // 我们请求AI做一个“全面的文章优化”，综合了纠错和润色
      const rewritePromise = generateRewrite(
        '请对文章进行全面优化：1.修正所有错别字和语病。2.在保持原意的前提下，优化语句的流畅性和文采。不要做过度的结构性改动。',
        plainText
      );

      await Promise.all([commentsPromise, rewritePromise]);

    } catch (error: any) {
      console.error(error);
      if (error.message === 'KEY_LIMIT_EXCEEDED') {
        alert('⚠️ OpenRouter API Key 额度已用完或无效。\n\n请前往设置页面检查您的 API Key 状态，或充值 OpenRouter 账户。');
      } else {
        alert(`生成过程中出现了一些问题: ${error.message || '请重试'}`);
      }
    } finally {
      setGeneratingComments(false);
    }
  };

  // 按需生成修订 (点击某个评论的修订按钮)
  const handleOnDemandRewrite = async (commentContent: string) => {
    if (hasPendingChanges()) {
      if (!confirm('⚠️ 当前已有未处理的修订，是否放弃它可以生成新的？')) return;
    }

    // 获取最新纯文本
    const plainText = htmlToPlainText(content);
    await generateRewrite(commentContent, plainText);
  };

  // Note: handleSelectionReview is inlined in useEffect below to avoid stale closure
  // handleApplySuggestion was removed as it's unused

  // 监听选区AI请求事件
  useEffect(() => {
    const handleEvent = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.selectedText) return;

      const selectedText = detail.selectedText;
      const paragraphContext = detail.paragraphContext;

      // === Inline version of handleSelectionReview to avoid stale closure ===
      if (!selectedText || selectedText.trim().length === 0) return;

      setGeneratingComments(true);
      setIsRewriting(true);
      clearComments();
      setWorkflowStage('doctoring');

      console.log('🔍 [Selection] 开始处理选区:', { selectedTextLen: selectedText.length, context: paragraphContext });

      try {
        let paragraphs: { index: number; fullText: string; nodePos: number }[] = [];
        if (paragraphContext) {
          if (paragraphContext.paragraphs) {
            paragraphs = paragraphContext.paragraphs;
          } else if (paragraphContext.index !== undefined) {
            paragraphs = [paragraphContext];
          }
        }

        if (paragraphs.length > 0) {
          console.log('🎯 [Selection] 选中了', paragraphs.length, '个段落');
        } else {
          console.warn('⚠️ [Selection] 未检测到段落上下文');
        }

        let fullContent = '';
        try {
          fullContent = htmlToPlainText(content);
        } catch (e) {
          console.error('Text conversion error:', e);
          fullContent = selectedText;
        }

        const commentsPromise = (async () => {
          const promises = characters
            .filter(c => !c.hiddenFromPanel)
            .map(async (character, index) => {
              await new Promise(r => setTimeout(r, index * 200 + 100));
              const systemPrompt = getCharacterSystemPrompt(character, 'selection');
              const { comment } = await openRouterService.getSelectionSuggestion(
                selectedText,
                systemPrompt,
                fullContent
              );
              addComment({
                id: `${character.id}-sel-${Date.now()}`,
                characterId: character.id,
                type: 'selection',
                content: comment,
                timestamp: Date.now(),
              });
            });
          await Promise.all(promises);
        })();

        let rewritePromise = Promise.resolve();
        if (paragraphs.length > 0) {
          rewritePromise = (async () => {
            const sourceTexts = paragraphs.map(p => p.fullText);
            console.log('📝 [Selection] 请求AI改写, 段落数:', sourceTexts.length);

            const rewrittenParagraphs = await openRouterService.getMultiParagraphRewrite(sourceTexts);
            const newChanges: ParagraphChange[] = [];

            rewrittenParagraphs.forEach(item => {
              const originalP = paragraphs.find(p => p.index === paragraphs[0].index + item.index);
              const fallbackP = paragraphs[item.index];
              const targetP = originalP || fallbackP;

              if (!targetP) {
                console.warn(`[Diff] 无法匹配段落 index=${item.index}`);
                return;
              }

              const originalText = targetP.fullText;
              const improvedText = item.text;
              const reason = item.reason || '优化表达';

              if (!hasSignificantChanges(originalText, improvedText)) {
                return;
              }

              const inlineDiff = computeInlineDiff(originalText, improvedText);

              newChanges.push({
                id: `sel-change-${targetP.index}-${Date.now()}`,
                index: targetP.index,
                type: 'modified',
                originalText: originalText,
                improvedText: improvedText,
                inlineDiff: inlineDiff,
                nodePos: targetP.nodePos,
                reason: reason
              });
            });

            if (newChanges.length > 0) {
              console.log('✅ [Selection] 生成了', newChanges.length, '个修订');
              setFullTextRewrite({
                id: `selection-rewrite-${Date.now()}`,
                originalText: fullContent,
                improvedText: fullContent,
                paragraphChanges: newChanges,
                timestamp: Date.now()
              });
            } else {
              console.log('⚠️ [Selection] AI认为无需修改');
            }
          })();
        }

        await Promise.all([commentsPromise, rewritePromise]);

      } catch (error: any) {
        console.error('AI Processing Error:', error);
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        alert('AI思考选中内容时出了点小差错:\n' + errorMsg + '\n(请截图反馈)');
      } finally {
        setGeneratingComments(false);
        setIsRewriting(false);
      }
    };

    window.addEventListener('get-selection-suggestion', handleEvent);
    return () => window.removeEventListener('get-selection-suggestion', handleEvent);
  }, [content, characters, setGeneratingComments, setIsRewriting, clearComments, setWorkflowStage, addComment, setFullTextRewrite]);

  const getCharacter = (characterId: string) => characters.find(c => c.id === characterId);



  return (
    <div className="comment-panel">
      <div className="panel-header">
        <div className="panel-title">
          <div className="title-icon" />
          <span>专家议事厅</span>
        </div>
        <div className="panel-actions">
          <button className="fulltext-revision-btn" onClick={startFullReview} title="开启 AI 分析">
            AI嘚吧嘚
          </button>

          <button
            className="action-icon-btn"
            onClick={() => {
              setWorkflowStage('idle');
              setFullTextRewrite(null);
              clearComments();
            }}
            title="清空"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="comments-container">
        {/* Empty State: The Void */}
        {comments.length === 0 && !isGeneratingComments && (
          <div className="empty-monolith">
            <p className="empty-text">开始写作后，点击上方按钮让 AI 专家团帮你分析</p>
          </div>
        )}

        {/* Comment Blocks */}
        {comments.map((comment) => {
          const character = getCharacter(comment.characterId);
          if (!character) return null;

          return (
            <div
              key={comment.id}
              className={`comment-card fade-in expert-${character.id}`}
              onClick={() => handleOnDemandRewrite(comment.content)}
            >
              <div className="comment-header">
                <div className="char-avatar-box">
                  {typeof character.avatar === 'string' ? character.avatar[0] : <character.avatar size={14} />}
                </div>
                <div className="char-meta">
                  <span className="char-name">{character.name}</span>
                </div>
              </div>

              <div className="comment-body markdown-content">
                <ReactMarkdown>{comment.content}</ReactMarkdown>
              </div>

              <div className="card-modular-actions">
                <button
                  className="modular-btn primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOnDemandRewrite(comment.content);
                  }}
                >
                  采纳
                </button>
              </div>
            </div>
          );
        })}

        {isGeneratingComments && (
          <div className="loading-state">
            <div className="shimmer-monolith" />
            <p className="empty-text" style={{ marginTop: '16px' }}>正在构建专家洞察...</p>
          </div>
        )}
      </div>
    </div>
  );
};
