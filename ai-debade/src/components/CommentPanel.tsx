import { useEffect } from 'react';
import { RotateCcw, Wand2, Eye } from 'lucide-react';
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

    } catch (error) {
      console.error('❌ [FullText Revision] 改写失败:', error);
      alert('生成修订失败，请重试');
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
        const promises = characters.map(async (character, index) => {
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

    } catch (error) {
      console.error(error);
      alert('生成过程中出现了一些问题，请重试');
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

  const handleApplySuggestion = (suggestion: string) => {
    window.dispatchEvent(new CustomEvent('apply-suggestion-event', {
      detail: { text: suggestion }
    }));
  };
  // 处理选中文本的AI评论 & 修订
  const handleSelectionReview = async (selectedText: string, paragraphContext?: any) => {
    if (!selectedText || selectedText.trim().length === 0) return;

    // 开启两个loading状态
    setGeneratingComments(true);
    setIsRewriting(true); // 让编辑器显示 "AI正在后台修订中..."
    clearComments();
    setWorkflowStage('doctoring');

    console.log('🔍 [Selection] 开始处理选区:', { selectedTextLen: selectedText.length, context: paragraphContext });

    try {
      // 兼容旧接口，如果是单段落对象，包装成数组
      let paragraphs: { index: number; fullText: string; nodePos: number }[] = [];
      if (paragraphContext) {
        if (paragraphContext.paragraphs) {
          paragraphs = paragraphContext.paragraphs;
        } else if (paragraphContext.index !== undefined) {
          paragraphs = [paragraphContext];
        }
      }

      if (paragraphs.length > 0) {
        console.log('🎯 [Selection] 选中了', paragraphs.length, '个段落, 准备生成多段落内联修订...');
      } else {
        console.warn('⚠️ [Selection] 未检测到有效的段落上下文，将只生成评论。');
      }

      // 安全获取全文
      let fullContent = '';
      try {
        fullContent = htmlToPlainText(content);
      } catch (e) {
        console.error('Text conversion error:', e);
        fullContent = selectedText; // Fallback
      }

      // 1. 生成侧边栏评论 (并行)
      const commentsPromise = (async () => {
        const promises = characters.map(async (character, index) => {
          // 增加一点点延迟让动画更自然
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
            // suggestion 字段已移除，避免前端渲染冗余按钮
            timestamp: Date.now(),
          });
        });
        await Promise.all(promises);
      })();

      // 2. 生成内联修订 (并行)
      let rewritePromise = Promise.resolve();
      if (paragraphs.length > 0) {
        rewritePromise = (async () => {
          // 提取纯文本数组
          const sourceTexts = paragraphs.map(p => p.fullText);

          console.log('📝 [Selection] 请求AI改写多段落, 数量:', sourceTexts.length);

          // 请求AI改写 (返回结构化数据)
          const rewrittenParagraphs = await openRouterService.getMultiParagraphRewrite(sourceTexts);

          const newChanges: ParagraphChange[] = [];

          rewrittenParagraphs.forEach(item => {
            // 找到原始段落信息
            // 注意：item.index 是相对于 `sourceTexts` 数组的索引 (0, 1, 2...)
            // `paragraphs` 数组的第一个元素的 `index` 属性是它在全文中的全局索引
            // 所以，`paragraphs[0].index + item.index` 才是 AI 返回的段落对应的全局索引
            const originalP = paragraphs.find(p => p.index === paragraphs[0].index + item.index);
            // 如果找不到(AI乱改index)，尝试按顺序fallback
            const fallbackP = paragraphs[item.index];

            const targetP = originalP || fallbackP;

            if (!targetP) {
              console.warn(`[Diff] 无法匹配返回的段落 index=${item.index}`);
              return;
            }

            const originalText = targetP.fullText;
            const improvedText = item.text;
            const reason = item.reason || '优化表达'; // 使用AI生成的理由

            // 如果AI认为不需要修改，或者文本一样
            if (!hasSignificantChanges(originalText, improvedText)) {
              return;
            }

            // 计算内联 Diff
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
            console.log('✅ [Selection] 生成了', newChanges.length, '个修订补丁');
            setFullTextRewrite({
              id: `selection-rewrite-${Date.now()}`,
              originalText: fullContent,
              improvedText: fullContent, // 占位
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
      // 详细展示错误信息
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      alert('AI思考选中内容时出了点小差错:\n' + errorMsg + '\n(请截图反馈)');
    } finally {
      setGeneratingComments(false);
      setIsRewriting(false);
    }
  };

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
          const promises = characters.map(async (character, index) => {
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
        <div className="panel-title-wrapper">
          <h2 className="panel-title">AI嘚嘚</h2>
          {/* 全文修订按钮 - 永久可见 */}
          <button
            className="fulltext-revision-btn"
            onClick={startFullReview}
            disabled={isGeneratingComments || !content || content.trim().length < 50}
            title="全文修订"
          >
            <Wand2 size={14} />
            全文修订
          </button>
        </div>
        <div className="panel-actions">
          {/* 状态重置按钮 */}
          <button className="icon-btn" onClick={() => {
            setWorkflowStage('idle');
            setFullTextRewrite(null);
            clearComments();
          }} title="重置">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="comments-container">
        {/* 引导区域 */}
        {comments.length === 0 && !isGeneratingComments && (
          <div className="workflow-start">
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <Wand2 size={48} className="empty-icon" />
              </div>
              <p>点击下方按钮，召唤AI专家团</p>
              <button className="primary-btn pulse" onClick={startFullReview}>
                <Wand2 size={16} /> 开始全面优化
              </button>
            </div>
          </div>
        )}

        {/* 评论列表 */}
        {comments.map((comment) => {
          const character = getCharacter(comment.characterId);
          if (!character) return null;

          return (
            <div key={comment.id} className="comment-card" onClick={() => handleOnDemandRewrite(comment.content)} title="点击生成基于此建议的修订">
              <div className="comment-header">
                {/* Avatar is now a ReactNode, render directly */}
                {/* Avatar Rendering */}
                <div className="character-avatar-container">
                  {character.avatarUrl ? (
                    <img src={character.avatarUrl} alt={character.name} className="character-avatar-img" />
                  ) : (
                    <character.avatar size={20} />
                  )}
                </div>
                <div className="character-info">
                  <span className="character-name">{character.name}</span>
                  <span className="character-role">{character.style[0]}</span>
                </div>
                {/* 快捷操作区 */}
                <div className="card-mini-actions">
                  <button className="mini-btn" onClick={(e) => {
                    e.stopPropagation();
                    handleOnDemandRewrite(comment.content);
                  }} title="只看他的修改方案">
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <div className="comment-content markdown-body">
                <ReactMarkdown>{comment.content}</ReactMarkdown>
              </div>

              {/* Selection suggestion button removed */}
            </div>
          );
        })}

        {isGeneratingComments && (
          <div className="loading-state">
            <div className="loading-spinner-clean"></div>
            <p>专家团正在评审中...</p>
          </div>
        )}
      </div>
    </div>
  );
};
