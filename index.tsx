import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { App } from './src/App';
import './src/index.css';
import './src/assets/fonts/fonts.css';
import { TitleBar } from './src/components/TitleBar';

const root = createRoot(document.getElementById('root')!);
root.render(
  <ToastProvider>
    <AuthProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
        <TitleBar />
        <div className="flex-1 overflow-auto relative scrollbar-hide">
          <App />
        </div>
      </div>
    </AuthProvider>
  </ToastProvider>
);
