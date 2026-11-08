import { User } from '../types';
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const isPushNotificationSupported = () => {
  return Boolean(
    VAPID_PUBLIC_KEY &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getPushPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

export const getPushSubscriptionStatus = async () => {
  const supported = isPushNotificationSupported();
  const permission = getPushPermission();

  if (!supported || permission !== 'granted') {
    return { supported, permission, subscribed: false };
  }

  const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
  const subscription = await registration?.pushManager.getSubscription();

  return { supported, permission, subscribed: Boolean(subscription) };
};

export const enablePushNotifications = async (user: User) => {
  if (!isPushNotificationSupported()) {
    throw new Error('هذا المتصفح لا يدعم إشعارات الخلفية.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('لم يتم منح صلاحية الإشعارات.');
  }

  const registration = await navigator.serviceWorker.register('/push-sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('تعذر إنشاء اشتراك الإشعارات لهذا الجهاز.');
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
    disabled_at: null,
    last_seen_at: new Date().toISOString()
  }, { onConflict: 'endpoint' });

  if (error) throw new Error(error.message);
  return true;
};

export const disablePushNotifications = async () => {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await supabase
    .from('push_subscriptions')
    .update({ disabled_at: new Date().toISOString() })
    .eq('endpoint', endpoint);
};
