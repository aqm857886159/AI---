// 调试辅助组件
import { useEffect } from 'react';
import { useStore } from './store/useStore';

export function DebugInfo() {
  const store = useStore();

  useEffect(() => {
    console.group('🔍 [调试] 应用状态检查');
    console.log('✅ Store 加载成功');
    console.log('📝 当前内容长度:', store.content.length);
    console.log('🎭 AI角色数量:', store.characters.length);
    console.log('💬 评论数量:', store.comments.length);
    console.log('📋 完整 Store:', store);
    console.groupEnd();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        background: '#000',
        color: '#0f0',
        padding: '10px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        borderRadius: '4px',
        maxWidth: '300px',
      }}
    >
      <div>✅ App 已加载</div>
      <div>🎭 角色: {store.characters.length}</div>
      <div>💬 评论: {store.comments.length}</div>
      <div>📝 内容: {store.content.length} 字符</div>
    </div>
  );
}
