import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';

// /admin 주소로 들어오면 관리자 화면, 그 외에는 서비스 화면
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'));
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin';

createRoot(document.getElementById('root')!).render(
  isAdmin ? <Suspense fallback={null}><AdminApp /></Suspense> : <App />
);
