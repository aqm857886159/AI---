import { useState } from 'react';
import { useStore } from '../store/useStore';
import { openRouterService } from '../services/openrouter';
import { Sparkles, Loader2, Check, RefreshCw, Wand2 } from 'lucide-react';
import './TitleGenerator.css';

export const TitleGenerator = () => {
  const {
    title,
    setTitle,
    titleSuggestion,
    setTitleSuggestion,
    isTitleGenerating,
    setTitleGenerating,
    content,
  } = useStore();

  const [error, setError] = useState<string>('');

  const handleGenerate = async () => {
    if (!content || content.trim().length < 50) {
      setError('写点内容再生成标题吧~');
      return;
    }

    if (!openRouterService.hasApiKey()) {
      setError('请先配置 API Key');
      return;
    }

    setError('');
    setTitleGenerating(true);

    try {
      // 提取纯文本（去除HTML标签）
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      const suggestion = await openRouterService.generateTitle(plainText);
      setTitleSuggestion(suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，再试一次吧~');
    } finally {
      setTitleGenerating(false);
    }
  };

  const handleAccept = () => {
    if (titleSuggestion) {
      setTitle(titleSuggestion.title);
      setTitleSuggestion(null);
    }
  };

  const handleReject = () => {
    setTitleSuggestion(null);
    // 重新生成
    handleGenerate();
  };

  return (
    <div className="title-generator">
      <div className="title-input-wrapper">
        <input
          type="text"
          className="title-input"
          placeholder="给文章起个标题吧..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isTitleGenerating}
        >
          {isTitleGenerating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>想ing...</span>
            </>
          ) : (
            <>
              <Wand2 size={16} />
              <span>标题生成</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {titleSuggestion && (
        <div className="title-suggestion">
          <div className="suggestion-bubble">
            <p className="suggestion-reason">
              <Sparkles size={14} color="#F59E0B" style={{ display: 'inline', marginRight: 4 }} />
              {titleSuggestion.reason}
            </p>
            <div className="suggested-title">{titleSuggestion.title}</div>
          </div>
          <div className="suggestion-actions">
            <button className="accept-btn" onClick={handleAccept}>
              <Check size={16} /> 用这个
            </button>
            <button className="reject-btn" onClick={handleReject}>
              <RefreshCw size={16} /> 换一个
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
