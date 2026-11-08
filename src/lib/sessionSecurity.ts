import { User } from '../types';

const SESSION_META_KEY = 'voga_secure_session_v1';
const ACTIVITY_WRITE_INTERVAL_MS = 30 * 1000;

export const SESSION_IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type SessionMeta = {
  userId: string;
  sessionId?: string;
  issuedAt: number;
  lastActivityAt: number;
  deviceSignature: string;
};

export type SessionValidationReason =
  | 'missing'
  | 'idle_timeout'
  | 'max_age'
  | 'user_mismatch'
  | 'session_mismatch'
  | 'device_mismatch';

const getDeviceSignature = () => {
  const nav = window.navigator;
  const screenInfo = window.screen
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
    : 'unknown-screen';

  return [
    nav.userAgent,
    nav.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenInfo,
    nav.hardwareConcurrency || 'unknown-cpu',
    nav.platform || 'unknown-platform'
  ].join('|');
};

const getNow = () => Date.now();

const readMeta = (): SessionMeta | null => {
  try {
    const raw = localStorage.getItem(SESSION_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionMeta;
  } catch {
    return null;
  }
};

const writeMeta = (meta: SessionMeta) => {
  localStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
};

export const clearSecureSession = () => {
  localStorage.removeItem(SESSION_META_KEY);
};

export const startSecureSession = (user: User) => {
  const now = getNow();
  writeMeta({
    userId: String(user.id),
    sessionId: user.currentSessionId ? String(user.currentSessionId) : undefined,
    issuedAt: now,
    lastActivityAt: now,
    deviceSignature: getDeviceSignature()
  });
};

export const ensureSecureSession = (user: User) => {
  const meta = readMeta();
  const userId = String(user.id);
  const sessionId = user.currentSessionId ? String(user.currentSessionId) : undefined;

  if (!meta || meta.userId !== userId || meta.sessionId !== sessionId) {
    startSecureSession(user);
  }
};

export const validateSecureSession = (user: User): { valid: boolean; reason?: SessionValidationReason } => {
  const meta = readMeta();
  if (!meta) return { valid: false, reason: 'missing' };

  const now = getNow();
  const userId = String(user.id);
  const sessionId = user.currentSessionId ? String(user.currentSessionId) : undefined;

  if (meta.userId !== userId) return { valid: false, reason: 'user_mismatch' };
  if (meta.sessionId !== sessionId) return { valid: false, reason: 'session_mismatch' };
  if (meta.deviceSignature !== getDeviceSignature()) return { valid: false, reason: 'device_mismatch' };
  if (now - meta.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) return { valid: false, reason: 'idle_timeout' };
  if (now - meta.issuedAt > SESSION_MAX_AGE_MS) return { valid: false, reason: 'max_age' };

  return { valid: true };
};

export const touchSecureSession = (user: User) => {
  const meta = readMeta();
  if (!meta) return;

  const now = getNow();
  if (now - meta.lastActivityAt < ACTIVITY_WRITE_INTERVAL_MS) return;

  const userId = String(user.id);
  const sessionId = user.currentSessionId ? String(user.currentSessionId) : undefined;

  if (meta.userId !== userId || meta.sessionId !== sessionId) return;
  writeMeta({ ...meta, lastActivityAt: now });
};
