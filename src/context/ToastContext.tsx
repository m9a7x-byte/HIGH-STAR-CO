
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/db';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useTranslation();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type, title, message, duration = 4000, force = false }: Omit<Toast, 'id'> & { force?: boolean }) => {
    // Check Global Settings first, but allow forcing. Default to true if undefined.
    const isEnabled = db.vehicleConfig?.enableToasts !== false;
    if (!isEnabled && !force) return;

    let trTitle = title;
    let trMsg = message;

    if (title === 'تحديث حالة الطلب') {
        trTitle = t('notifications.status_update_title', 'تحديث حالة الطلب');
    } else if (title === 'قيد التحضير') {
        trTitle = t('notifications.in_production', 'قيد التحضير');
    } else if (title === 'تم التجهيز') {
        trTitle = t('notifications.completed', 'تم التجهيز');
    }

    if (message) {
        const statusMatch = message.match(/تم تغيير حالة طلبك #(\d+) إلى: (.+)/);
        if (statusMatch) {
            const statusArabic = statusMatch[2].trim();
            let trStatus = statusArabic;
            if (statusArabic === 'قيد الانتظار') trStatus = t('status.working', statusArabic) || t('batch4.k287', statusArabic);
            else if (statusArabic === 'في التصنيع') trStatus = t('status.working', statusArabic);
            else if (statusArabic === 'اكتمل') trStatus = t('status.completed', statusArabic);
            else if (statusArabic === 'مرفوض') trStatus = t('status.rejected', statusArabic);
            else trStatus = t(statusArabic, statusArabic);
            
            trMsg = t('notifications.status_change_msg', { orderId: statusMatch[1], status: trStatus, defaultValue: message });
        }
    }

    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, type, title: trTitle, message: trMsg, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast, t]);

  const success = (title: string, message?: string, options?: { force?: boolean }) => addToast({ type: 'success', title, message, ...options });
  const error = (title: string, message?: string, options?: { force?: boolean }) => addToast({ type: 'error', title, message, ...options });
  const info = (title: string, message?: string, options?: { force?: boolean }) => addToast({ type: 'info', title, message, ...options });
  const warning = (title: string, message?: string, options?: { force?: boolean }) => addToast({ type: 'warning', title, message, ...options });

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
    </ToastContext.Provider>
  );
};
