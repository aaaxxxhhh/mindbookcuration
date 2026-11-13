import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';

// /admin 주소로 들어오면 관리자 화면, 그 외에는 서비스 화면
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'));
const path = window.location.pathname.replace(/\/+$/, '');
const isAdmin = path === '/admin';

// 없는 주소(예: /abc)는 검색 결과에 잡히지 않도록 noindex 표시 (소프트 404 방지)
if (path !== '' && !isAdmin) {
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex';
  document.head.appendChild(robots);
}

createRoot(document.getElementById('root')!).render(
  isAdmin ? <Suspense fallback={null}><AdminApp /></Suspense> : <App />
);
