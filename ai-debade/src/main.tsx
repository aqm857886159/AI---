import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('🚀 [main.tsx] 应用启动');
console.log('📍 [main.tsx] React版本:', StrictMode);

const rootElement = document.getElementById('root');
console.log('📍 [main.tsx] Root元素:', rootElement);

if (!rootElement) {
  console.error('❌ [main.tsx] 找不到 root 元素!');
} else {
  try {
    console.log('📍 [main.tsx] 开始渲染应用...');
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('✅ [main.tsx] 应用渲染完成');
  } catch (error) {
    console.error('❌ [main.tsx] 渲染失败:', error);
  }
}
