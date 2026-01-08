
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { SessionConflictOverlay } from '../components/shared/SessionConflictOverlay';

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

  // Track presence whenever user is set & Enforce Single Session
  useEffect(() => {
    if (user?.id) {
      // 1. Update Presence
      getPublicIP().then(ip => {
        const deviceInfo = getDetailedDeviceInfo();
        const deviceString = JSON.stringify(deviceInfo);
        db.updatePresence(user.id, ip, deviceString).catch(console.error);
      }).catch(console.error);

      // 2. Subscribe to DB changes to check for session validity (Single Session Enforcement)
      const unsubscribe = db.subscribe(() => {
        // Find the user in the updated db.users list
        const updatedUser = db.users.find(u => u.id === user.id);

        // If the user exists in DB state and has a defined currentSessionId
        if (updatedUser && updatedUser.currentSessionId && user.currentSessionId) {
          // Compare: if DB session ID != Local session ID, it means a new login occurred elsewhere.
          if (updatedUser.currentSessionId !== user.currentSessionId) {
            console.warn('Session Invalidated: Logged in from another device.');
            setShowSessionConflict(true);
          }
        }
      });

      return () => {
        unsubscribe();
      }
    }
  }, [user?.id, user?.currentSessionId]);

  const login = async (email: string, password?: string) => {
    try {
      const user = await db.login(email, password);
      // user setting will trigger the useEffect above
      setUser(user);
    } catch (e: any) {
      throw e;
    }
  };

  const logout = async () => {
    if (user?.id) {
      try {
        // Log Logout Event
        db.logActivity(user.id, 'تسجيل خروج', 'AUTH', 'تسجيل خروج من النظام').catch(console.error);

        // Best effort to mark offline
        // Check if setOffline exists before calling to prevent crash during hot-reload/updates
        if (typeof db.setOffline === 'function') {
          await db.setOffline(user.id);
        }
      } catch (e) {
        console.error('Error marking offline:', e);
      }
    }

    await supabase.auth.signOut();
    localStorage.removeItem('user_role');
    setUser(null);
    setShowSessionConflict(false);
  };

  const updateUser = (updatedUser: User) => {
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  // Restore session on mount - minimal implementation to prevent crash
  useEffect(() => {
    // Placeholder for session restore logic if needed in future
    // Currently db.ts handles state, this context just mirrors it when actions occur
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
