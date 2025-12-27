import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { openRouterService } from '../services/openrouter';
import './Settings.css';

export const Settings = () => {
  const { showSettings, setShowSettings } = useStore();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (showSettings) {
      const config = openRouterService.getConfig();
      setApiKey(config.apiKey);
      setModel(config.model);
      setSaved(false);
    }
  }, [showSettings]);

  const handleSave = () => {
    openRouterService.saveConfig({
      apiKey,
      model,
    });
    setSaved(true);
    setTimeout(() => {
      setShowSettings(false);
    }, 1000);
  };

  if (!showSettings) return null;

  return (
    <div className="settings-overlay" onClick={() => setShowSettings(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>偏好设置</h2>
          <button className="close-btn" onClick={() => setShowSettings(false)}>
            ✕
          </button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">
              API 密钥 (OpenRouter)
              <span className="required">*</span>
            </label>
            <input
              type="password"
              className="setting-input"
              placeholder="sk-or-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="setting-hint">
              在 <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                OpenRouter
              </a> 获取你的 API Key
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">模型选择</label>
            <select
              className="setting-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="deepseek/deepseek-v3.2">DeepSeek V3.2（推荐 - 高性价比）</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku（快速）</option>
              <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
              <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo（便宜）</option>
            </select>
            <p className="setting-hint">
              不同模型的价格和性能不同，DeepSeek V3.2 性价比最高
            </p>
          </div>
        </div>

        <div className="settings-footer">
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!apiKey}
          >
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};
