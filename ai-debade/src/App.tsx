import { useStore } from './store/useStore';
import { TitleGenerator } from './components/TitleGenerator';
import { EditorNew as Editor } from './components/EditorNew';
import { CommentPanel } from './components/CommentPanel';
import { Settings as SettingsModal } from './components/Settings';
import { CharacterManager } from './components/CharacterManager';
import { ClaraEpilogue } from './components/ClaraEpilogue';
import './App.css';

console.log('🎭 [App.tsx] 模块加载');

import { useState, useCallback, useEffect } from 'react';

function App() {
  console.log('🎭 [App] 组件渲染开始');

  try {
    const { setShowSettings } = useStore();
    const [sidebarWidth, setSidebarWidth] = useState(340);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
      setIsResizing(false);
    }, []);

    const resize = useCallback(
      (e: MouseEvent) => {
        if (isResizing) {
          const newWidth = document.body.clientWidth - e.clientX;
          if (newWidth > 250 && newWidth < 800) {
            setSidebarWidth(newWidth);
          }
        }
      },
      [isResizing]
    );

    useEffect(() => {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }, [resize, stopResizing]);

    return (
      <div
        className="app"
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
        <header className="app-header">
          <div className="header-content">
            <div className="logo" title="AI-DEBADE 2.0">
              <div className="logo-icon" />
              <h1 className="logo-text">AI 嘚吧嘚</h1>
            </div>

            <div className="header-actions">
              <button
                className="action-btn"
                onClick={() => setShowSettings(true)}
              >
                设置
              </button>
            </div>
          </div>
        </header>

        <div className="main-viewport">
          <div className="editor-canvas">
            <div className="editor-container-width fade-in">
              <div className="title-wrapper">
                <TitleGenerator />
              </div>
              <Editor />
              <div id="revision-dock" style={{ zIndex: 100, position: 'relative' }}></div>
              <ClaraEpilogue />
            </div>
          </div>

          <div
            className={`resizer ${isResizing ? 'resizing' : ''}`}
            onMouseDown={startResizing}
          />

          <aside className="ai-sidebar" style={{ width: sidebarWidth }}>
            <CommentPanel />
          </aside>
        </div>

        <SettingsModal />
        <CharacterManager />
      </div>
    );
  } catch (error) {
    console.error('❌ [App] 渲染错误:', error);
    return (
      <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
        <h1>❌ 加载错误</h1>
        <pre>{String(error)}</pre>
        <p>请查看控制台获取详细错误信息</p>
      </div>
    );
  }
}

export default App;
