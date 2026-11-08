self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'VOGA', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'VOGA';
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || '/push-icon-192x192.png',
    badge: data.badge || '/push-badge-96x96.png',
    image: data.image || undefined,
    tag: data.tag || data.notificationId || 'voga-notification',
    dir: 'rtl',
    lang: 'ar',
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || null
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.location.origin));

    if (existing) {
      await existing.focus();
      existing.navigate(targetUrl);
      return;
    }

    await clients.openWindow(targetUrl);
  })());
});
