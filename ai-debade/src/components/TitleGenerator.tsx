import { useState } from 'react';
import { useStore } from '../store/useStore';
import { openRouterService } from '../services/openrouter';
import { Loader2 } from 'lucide-react';
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
    } catch (err: any) {
      const errorMessage = err.message === 'KEY_LIMIT_EXCEEDED'
        ? 'API 额度不足，请检查 OpenRouter 设置'
        : (err.message || '生成失败，再试一次吧~');
      setError(errorMessage);
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
        <textarea
          className="title-input"
          placeholder="无标题"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            // 自动调整高度
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          rows={1}
        />
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isTitleGenerating}
        >
          {isTitleGenerating ? (
            <>
              <Loader2 className="animate-spin" size={12} />
              <span className="generating-pulse">正在生成...</span>
            </>
          ) : (
            <span>起个好名</span>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          [System Error]: {error}
        </div>
      )}

      {titleSuggestion && (
        <div className="title-suggestion">
          <div className="suggestion-bubble">
            <p className="suggestion-reason">
              <span style={{ marginRight: '6px' }}>💡</span>
              <strong>思考脉络：</strong>{titleSuggestion.reason}
            </p>
            <div className="suggested-title">{titleSuggestion.title}</div>
          </div>
          <div className="suggestion-actions">
            <button className="accept-btn" onClick={handleAccept}>
              就它了
            </button>
            <button className="reject-btn" onClick={handleReject}>
              再想想
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
