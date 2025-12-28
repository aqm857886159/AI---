/**
 * @module app/App
 * @description 应用主入口 - 单一职责：布局和全局状态
 */

import { useState, useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';

// Components
import { TitleGenerator } from '../components/TitleGenerator';
import { Editor } from '../components/editor/Editor';
import { CommentPanel } from '../components/panel/CommentPanel';
import { Settings as SettingsModal } from '../components/Settings';
import { CharacterManager } from '../components/CharacterManager';

// Config
import {
    SIDEBAR_MIN_WIDTH,
    SIDEBAR_MAX_WIDTH,
    SIDEBAR_DEFAULT_WIDTH,
} from '../config/constants';

// Styles
import './App.css';

console.log('🎭 [App.tsx] 模块加载');

function App() {
    console.log('🎭 [App] 组件渲染开始');

    try {
        const { setShowSettings } = useStore();
        const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
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
                    if (newWidth > SIDEBAR_MIN_WIDTH && newWidth < SIDEBAR_MAX_WIDTH) {
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
                                调调
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
