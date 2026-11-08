import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

import React, { useState, useEffect } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { useAuth } from './context/AuthContext';
import { UserRole } from './types';
import { Layout } from './layout/Layout';
import { LandingPage } from './pages/LandingPage';
// import { LoginPage } from './pages/LoginPage'; // Deprecated
import { AgentLoginPage } from './pages/AgentLoginPage';
import { AgentPortalPage } from './pages/AgentPortalPage';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ConfirmEmailPage } from './pages/ConfirmEmailPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { MagicLinkPage } from './pages/MagicLinkPage';
import { ConfirmEmailChangePage } from './pages/ConfirmEmailChangePage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AgentDashboard } from './features/agent/AgentDashboard';
import { ProfileTab } from './features/shared/ProfileTab';
import { ToastContainer } from './components/ui/ToastContainer';
import { OfflineOverlay } from './components/shared/OfflineOverlay';
import { UpdateNotification } from './components/UpdateNotification';

import { OperationSuccessPage } from './pages/OperationSuccessPage';
import { OperationFailedPage } from './pages/OperationFailedPage';

// APP_MODE: 'admin' = نسخة الإدارة, 'agent' = نسخة الوكلاء, 'all' = النسخة الكاملة
const APP_MODE = (import.meta.env.VITE_APP_MODE || 'all') as 'admin' | 'agent' | 'all';

// تحديد الواجهة الافتراضية حسب وضع التطبيق
const getInitialView = () => {
  if (APP_MODE === 'agent') return 'LOGIN_AGENT' as const;
  if (APP_MODE === 'admin') return 'LOGIN_STAFF' as const;
  return 'LANDING' as const;
};

export const App = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [adminActiveTab, setAdminActiveTab] = useState('overview');
  const [view, setView] = useState<'LANDING' | 'AGENT_PORTAL' | 'LOGIN_AGENT' | 'LOGIN_STAFF' | 'FORGOT_PASSWORD' | 'FORGOT_PASSWORD_AGENT_PORTAL' | 'RESET_PASSWORD' | 'EMAIL_CHANGE_SUCCESS' | 'AUTH_ERROR' | 'CONFIRM_EMAIL' | 'ACCEPT_INVITE' | 'MAGIC_LINK' | 'CONFIRM_EMAIL_CHANGE'>(getInitialView());
  const [errorDetails, setErrorDetails] = useState({ title: '', message: '' });

  useEffect(() => {
    // Check URL for special routes
    const path = window.location.pathname;
    if (path === '/reset-password' || path === '/auth/reset-password') {
      setView('RESET_PASSWORD');
    } else if (path === '/accept-invite' || path === '/auth/accept-invite') {
      setView('ACCEPT_INVITE');
    } else if (path === '/magic-link' || path === '/auth/magic-link') {
      setView('MAGIC_LINK');
    } else if (path === '/agent-voga') {
      setView('AGENT_PORTAL');
    }

    // Check for hash params from Supabase
    const hash = window.location.hash;
    if (hash) {
      if (hash.includes('error=')) {
        // Handle Errors (Expired link, etc)
        // Example: #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
        const params = new URLSearchParams(hash.substring(1)); // Remove #
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        let title = t('login.error_occurred');
        let message = t('login.invalid_link');

        if (errorCode === 'otp_expired') {
          title = t('login.link_expired');
          message = t('login.link_expired_msg');
        } else if (errorDesc) {
          message = errorDesc.replace(/\+/g, ' ');
        }

        setErrorDetails({ title, message });
        setView('AUTH_ERROR');

      } else if (hash.includes('type=recovery')) {
        setView('RESET_PASSWORD');
      } else if (hash.includes('type=email_change')) {
        setView('CONFIRM_EMAIL_CHANGE');
      } else if (hash.includes('type=signup')) {
        setView('CONFIRM_EMAIL');
      } else if (hash.includes('type=invite')) {
        setView('ACCEPT_INVITE');
      } else if (hash.includes('type=magiclink')) {
        setView('MAGIC_LINK');
      }
    }
  }, []);

  // فحص صلاحية الدور حسب وضع التطبيق (APP_MODE)
  // إذا كان المستخدم سجل دخول بدور غير مسموح، يتم تسجيل خروجه
  useEffect(() => {
    if (user) {
      const isAgent = user.role === UserRole.AGENT;

      // نسخة الوكلاء: لا يُسمح للإدارة
      if (APP_MODE === 'agent' && !isAgent) {
        logout();
        setErrorDetails({
          title: t('batch4.k101'),
          message: t('batch4.k102')
        });
        setView('AUTH_ERROR');
        return;
      }

      // نسخة الإدارة: لا يُسمح للوكلاء
      if (APP_MODE === 'admin' && isAgent) {
        logout();
        setErrorDetails({
          title: t('batch4.k101'),
          message: t('batch4.k103')
        });
        setView('AUTH_ERROR');
        return;
      }
    }
  }, [user?.id, user?.role]);

  // تصفير التبويب عند تغيير المستخدم (تسجيل دخول جديد)
  useEffect(() => {
    if (user) {
      // إذا كان وكيل، اجعل التبويب الافتراضي هو الكتالوج، وإذا كان موظف اجعله الرئيسية
      const defaultTab = user.role === UserRole.AGENT ? 'catalog' : 'overview';
      setAdminActiveTab(defaultTab);
    }
  }, [user?.id]);

  // --- UNAUTHENTICATED or SPECIAL FLOWS ---
  // Note: We might be authenticated even during email change, but we want to show the success screen first.
  if (view === 'AUTH_ERROR') {
    return (
      <>
        <ToastContainer />
        <OperationFailedPage
          title={errorDetails.title}
          message={errorDetails.message}
          onContinue={() => {
            setView('LANDING');
            window.history.pushState({}, '', '/');
          }}
        />
      </>
    );
  }

  if (view === 'EMAIL_CHANGE_SUCCESS') {
    return (
      <>
        <ToastContainer />
        <OperationSuccessPage
          title={t('batch4.k104')}
          message={t('login.email_confirmed_msg')}
          onContinue={() => {
            setView('LANDING'); // Or redirect to dashboard if logged in
            window.history.pushState({}, '', '/');
          }}
        />
      </>
    );
  }

  if (view === 'CONFIRM_EMAIL') {
    return (
      <>
        <ToastContainer />
        <ConfirmEmailPage
          onSuccess={() => {
            setView('LANDING');
            window.history.pushState({}, '', '/');
          }}
        />
      </>
    );
  }

  if (view === 'ACCEPT_INVITE') {
    return (
      <>
        <ToastContainer />
        <AcceptInvitePage
          onSuccess={() => {
            setView('LANDING');
            window.history.pushState({}, '', '/');
          }}
        />
      </>
    );
  }

  if (view === 'MAGIC_LINK') {
    return (
      <>
        <ToastContainer />
        <MagicLinkPage
          onSuccess={() => {
            setView('LANDING');
            window.history.pushState({}, '', '/');
          }}
        />
      </>
    );
  }

  if (view === 'CONFIRM_EMAIL_CHANGE') {
    return (
      <>
        <ToastContainer />
        <ConfirmEmailChangePage
          onSuccess={() => {
            setView('LANDING');
            window.history.pushState({}, '', '/');
          }}
        />
      </>
    );
  }

  // --- UNAUTHENTICATED FLOW ---
  if (!user) {
    // في وضع agent أو admin: لا نعرض صفحة البوابتين، نوجه مباشرة لصفحة الدخول
    const handleBack = () => {
      if (APP_MODE === 'agent') setView('LOGIN_AGENT');
      else if (APP_MODE === 'admin') setView('LOGIN_STAFF');
      else setView('LANDING');
    };

    return (
      <>
        <ToastContainer />
        <OfflineOverlay />
        <UpdateNotification />

        {/* صفحة البوابتين - فقط في الوضع الكامل */}
        {view === 'LANDING' && APP_MODE === 'all' && <LandingPage onNavigate={setView} />}

        {/* Standalone Agent Portal (accessible via /agent-voga) */}
        {view === 'AGENT_PORTAL' && (
          <AgentPortalPage
            onForgot={() => setView('FORGOT_PASSWORD_AGENT_PORTAL')}
          />
        )}

        {view === 'LOGIN_AGENT' && (
          <AgentLoginPage
            onBack={APP_MODE === 'agent' ? undefined : () => setView('LANDING')}
            onForgot={() => setView('FORGOT_PASSWORD')}
          />
        )}

        {view === 'LOGIN_STAFF' && (
          <StaffLoginPage
            onBack={APP_MODE === 'admin' ? undefined : () => setView('LANDING')}
            onForgot={() => setView('FORGOT_PASSWORD')}
          />
        )}

        {view === 'FORGOT_PASSWORD' && <ForgotPasswordPage onBack={handleBack} onVerified={() => setView('RESET_PASSWORD')} />}

        {view === 'FORGOT_PASSWORD_AGENT_PORTAL' && <ForgotPasswordPage onBack={() => setView('AGENT_PORTAL')} onVerified={() => setView('RESET_PASSWORD')} />}


        {view === 'RESET_PASSWORD' && <ResetPasswordPage onSuccess={() => { setView('LANDING'); window.history.pushState({}, '', '/'); }} />}
      </>
    );
  }

  // --- AUTHENTICATED FLOW ---
  // تحديد ما إذا كان يجب عرض صفحة الملف الشخصي بغض النظر عن الدور
  const isProfileView = adminActiveTab === 'profile';

  return (
    <>
      <Layout
        activeTab={adminActiveTab}
        setActiveTab={setAdminActiveTab}
      >
        {isProfileView ? (
          <ProfileTab onBack={() => setAdminActiveTab(user.role === UserRole.AGENT ? 'catalog' : 'overview')} />
        ) : user.role === UserRole.AGENT ? (
          <AgentDashboard />
        ) : (
          <AdminDashboard
            activeTab={adminActiveTab}
            setActiveTab={setAdminActiveTab}
          />
        )}
      </Layout>
      <OfflineOverlay />
      <UpdateNotification />
      <ToastContainer />
    </>
  );
};

