import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
// @ts-ignore - npm package types are not needed at runtime in Supabase Edge Functions.
import webpush from 'npm:web-push@3.6.7';

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string | null;
  image_url?: string | null;
  related_entity_id?: string | null;
  related_entity_type?: string | null;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const getServiceRoleKey = () => {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyKey) return legacyKey;

  const secretKeysJson = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeysJson) return undefined;

  try {
    const secretKeys = JSON.parse(secretKeysJson) as Record<string, string>;
    return secretKeys.default || Object.values(secretKeys)[0];
  } catch {
    return undefined;
  }
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, x-push-secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();
    let vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    let vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    let vapidSubject = Deno.env.get('VAPID_SUBJECT') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing push notification environment variables');
    }

    const { notification_id } = await req.json();
    if (!notification_id) {
      return jsonResponse({ success: false, error: 'notification_id is required' }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: configRows, error: configError } = await supabaseAdmin
      .from('push_internal_config')
      .select('key,value')
      .in('key', ['webhook_secret', 'vapid_public_key', 'vapid_private_key', 'vapid_subject']);

    if (configError) throw configError;

    const config = Object.fromEntries((configRows || []).map((row: { key: string; value: string }) => [row.key, row.value]));
    const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') || config.webhook_secret;

    if (!expectedSecret) {
      throw new Error('Missing push webhook secret');
    }

    if (req.headers.get('x-push-secret') !== expectedSecret) {
      return jsonResponse({ success: false, error: 'Forbidden' }, 403);
    }

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      vapidPublicKey = vapidPublicKey || config.vapid_public_key;
      vapidPrivateKey = vapidPrivateKey || config.vapid_private_key;
      vapidSubject = vapidSubject || config.vapid_subject || 'mailto:tech@high-star.iq';
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Missing VAPID keys');
    }

    webpush.setVapidDetails(vapidSubject || 'mailto:tech@high-star.iq', vapidPublicKey, vapidPrivateKey);

    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .select('id,user_id,title,message,type,action_url,image_url,related_entity_id,related_entity_type')
      .eq('id', notification_id)
      .single<NotificationRow>();

    if (notificationError || !notification) {
      throw new Error(notificationError?.message || 'Notification not found');
    }

    const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', notification.user_id)
      .is('disabled_at', null)
      .returns<PushSubscriptionRow[]>();

    if (subscriptionError) throw subscriptionError;
    if (!subscriptions?.length) {
      return jsonResponse({ success: true, sent: 0, disabled: 0 });
    }

    const payload = JSON.stringify({
      title: notification.title || 'VOGA',
      body: notification.message || '',
      icon: '/push-icon-192x192.png',
      badge: '/push-badge-96x96.png',
      image: notification.image_url || undefined,
      tag: notification.id,
      notificationId: notification.id,
      url: notification.action_url || '/'
    });

    let sent = 0;
    let disabled = 0;

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);
        sent += 1;
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || err?.status);
        if (statusCode === 404 || statusCode === 410) {
          disabled += 1;
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ disabled_at: new Date().toISOString() })
            .eq('id', sub.id);
        } else {
          console.error('Push send failed:', err);
        }
      }
    }));

    return jsonResponse({ success: true, sent, disabled });
  } catch (err: any) {
    console.error('send-push-notification error:', err);
    return jsonResponse({ success: false, error: err.message || 'Push failed' }, 200);
  }
});
