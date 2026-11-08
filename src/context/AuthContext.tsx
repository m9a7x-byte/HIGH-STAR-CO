import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { SessionConflictOverlay } from '../components/shared/SessionConflictOverlay';
import {
  clearSecureSession,
  ensureSecureSession,
  startSecureSession,
  touchSecureSession,
  validateSecureSession
} from '../lib/sessionSecurity';

import { getPublicIP, getDetailedDeviceInfo } from '../lib/deviceUtils';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [isSessionExpiring, setIsSessionExpiring] = useState(false);

  const clearAuthState = () => {
    clearSecureSession();
    localStorage.removeItem('user_role');
    setUser(null);
    setShowSessionConflict(false);
    setIsSessionExpiring(false);
  };

  const expireCurrentSession = async () => {
    if (isSessionExpiring) return;

    setIsSessionExpiring(true);
    try {
      if (user?.id && typeof db.setOffline === 'function') {
        await db.setOffline(user.id);
      }
    } catch (e) {
      console.error('Error marking expired session offline:', e);
    }

    try {
      await db.logout();
    } catch (e) {
      console.error('Error signing out expired session:', e);
      await supabase.auth.signOut().catch(console.error);
    }

    clearAuthState();
  };

  // Track presence whenever user is set & Enforce Single Session
  useEffect(() => {
    if (user?.id) {
      // 1. Update Presence
      getPublicIP().then(ip => {
        const deviceInfo = getDetailedDeviceInfo();
        const deviceString = JSON.stringify(deviceInfo);
        db.updatePresence(user.id, ip, deviceString).catch(console.error);
      }).catch(console.error);

      const validateAndTouch = () => {
        const result = validateSecureSession(user);
        if (!result.valid) {
          expireCurrentSession();
          return;
        }

        touchSecureSession(user);
      };

      validateAndTouch();

      const activityEvents = ['click', 'keydown', 'pointerdown', 'scroll', 'focus', 'visibilitychange'];
      activityEvents.forEach(eventName => window.addEventListener(eventName, validateAndTouch, { passive: true }));
      const sessionTimer = window.setInterval(validateAndTouch, 60 * 1000);

      // 2. Subscribe to DB changes to keep current user live and enforce single session
      const unsubscribe = db.subscribe(() => {
        const updatedUser = db.users.find(u => String(u.id) === String(user.id));

        if (updatedUser && updatedUser.currentSessionId && user.currentSessionId) {
          if (updatedUser.currentSessionId !== user.currentSessionId) {
            console.warn('Session Invalidated: Logged in from another device.');
            clearSecureSession();
            setShowSessionConflict(true);
            return;
          }
        }

        if (updatedUser) {
          setUser(prev => {
            if (!prev || String(prev.id) !== String(updatedUser.id)) return prev;
            if (JSON.stringify(prev) === JSON.stringify(updatedUser)) return prev;
            return { ...updatedUser };
          });
        }
      });

      return () => {
        activityEvents.forEach(eventName => window.removeEventListener(eventName, validateAndTouch));
        window.clearInterval(sessionTimer);
        unsubscribe();
      }
    }
  }, [user?.id, user?.currentSessionId, isSessionExpiring]);

  const login = async (email: string, password?: string) => {
    try {
      const user = await db.login(email, password);
      // user setting will trigger the useEffect above
      startSecureSession(user);
      setUser(user);
    } catch (e: any) {
      throw e;
    }
  };

  const logout = async () => {
    if (user?.id) {
      try {
        // Log Logout Event
        db.logActivity(user.id, t('batch4.txt_gq12fh_6964'), 'AUTH', t('batch4.txt_0zflf9_6964')).catch(console.error);

        // Best effort to mark offline
        // Check if setOffline exists before calling to prevent crash during hot-reload/updates
        if (typeof db.setOffline === 'function') {
          await db.setOffline(user.id);
        }
      } catch (e) {
        console.error('Error marking offline:', e);
      }
    }

    await db.logout();
    clearAuthState();
  };

  const updateUser = (updatedUser: User) => {
    if (updatedUser) {
      ensureSecureSession(updatedUser);
      setUser(updatedUser);
    }
  };

  // Restore session on mount to persist login state across app restarts
  useEffect(() => {
    const restoreUserSession = async () => {
      try {
        const restoredUser = await db.restoreSession();
        if (restoredUser) {
          const result = validateSecureSession(restoredUser);
          if (result.valid) {
            setUser(restoredUser);
          } else {
            await db.logout();
            clearAuthState();
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    };
    
    restoreUserSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearAuthState();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
      {showSessionConflict && (
        <SessionConflictOverlay onLogout={() => {
          logout();
          window.location.reload();
        }} />
      )}
    </AuthContext.Provider>
  );
};
