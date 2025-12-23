import { useStore } from './store/useStore';
import { TitleGenerator } from './components/TitleGenerator';
import { EditorNew as Editor } from './components/EditorNew';
import { CommentPanel } from './components/CommentPanel';
import { Settings as SettingsModal } from './components/Settings';
import { CharacterManager } from './components/CharacterManager';
import { DebugInfo } from './debug';
import { Settings, Sparkles } from 'lucide-react';
import './App.css';

console.log('🎭 [App.tsx] 模块加载');

import { useState, useRef, useCallback, useEffect } from 'react';

function App() {
  console.log('🎭 [App] 组件渲染开始');

  try {
    const { setShowSettings } = useStore();
    const [sidebarWidth, setSidebarWidth] = useState(380);
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
        <DebugInfo />

        {/* Glass Header */}
        <header className="app-header">
          <div className="header-blur-bg" />
          <div className="header-content">
            <div className="logo">
              <h1 className="logo-text">AI 嘚吧嘚</h1>
            </div>
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              title="设置"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="main-viewport">
          {/* Main Editing Area (Scrollable) */}
          <div className="editor-canvas">
            <div className="editor-container-width">
              <div className="title-wrapper">
                <TitleGenerator />
              </div>
              <Editor />
            </div>
          </div>

          {/* Resizer Handle */}
          <div
            className={`resizer ${isResizing ? 'resizing' : ''}`}
            onMouseDown={startResizing}
          />

          {/* Docked Sidebar (Fixed) */}
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
