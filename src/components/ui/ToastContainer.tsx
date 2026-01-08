
import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast, Toast, ToastType } from '../../context/ToastContext';
import { db } from '../../lib/db';
import { ToastPosition } from '../../types';

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto dismiss handle
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Wait for animation
  };

  // Progress bar logic
  useEffect(() => {
    if (!toast.duration) return;
    const step = 100 / (toast.duration / 100);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [toast.duration]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="text-emerald-500" size={24} />,
    error: <AlertCircle className="text-red-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
    warning: <AlertTriangle className="text-amber-500" size={24} />,
  };

  const borderColors: Record<ToastType, string> = {
    success: 'border-l-emerald-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
    warning: 'border-l-amber-500',
  };

  return (
    <div
      className={`
        relative w-full max-w-sm bg-white rounded-xl shadow-2xl border-l-4 p-4 mb-3 flex items-start gap-4 transition-all duration-300 transform 
        ${borderColors[toast.type]}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-in-right'}
      `}
      role="alert"
      style={{ direction: 'rtl' }}
    >
      <div className="shrink-0 pt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-800 text-sm">{toast.title}</h4>
        {toast.message && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{toast.message}</p>}
      </div>
      <button 
        onClick={handleDismiss} 
        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      >
        <X size={16} />
      </button>

      {/* Progress Bar */}
      {toast.duration && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full rounded-b-xl overflow-hidden">
           <div 
             className={`h-full transition-all linear duration-100 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'error' ? 'bg-red-500' :
                toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
             }`} 
             style={{ width: `${progress}%` }}
           ></div>
        </div>
      )}
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts } = useToast();
  const [position, setPosition] = useState<ToastPosition>(db.vehicleConfig.toastPosition);

  // Subscribe to DB changes to update position live
  useEffect(() => {
      const handleUpdate = () => {
          setPosition(db.vehicleConfig.toastPosition);
      };
      const unsubscribe = db.subscribe(handleUpdate);
      return () => unsubscribe();
  }, []);

  const getPositionClasses = () => {
      // Note: RTL Direction means 'right' is visually left in some contexts if not using absolute.
      // But fixed positioning ignores 'dir', it uses viewport.
      // We use standard CSS directions here.
      switch(position) {
          case 'top-left': return 'top-6 left-6 items-start';
          case 'top-right': return 'top-6 right-6 items-end';
          case 'bottom-left': return 'bottom-6 left-6 items-start';
          case 'bottom-right': return 'bottom-6 right-6 items-end';
          default: return 'top-6 left-6 items-start';
      }
  };

  return (
    <div className={`fixed z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none transition-all duration-300 ${getPositionClasses()}`}>
      <div className="pointer-events-auto w-full">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};
