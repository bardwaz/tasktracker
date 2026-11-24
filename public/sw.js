// TaskTracker Service Worker
const CACHE_NAME = 'tasktracker-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push notification events from server or background
self.addEventListener('push', (event) => {
  let data = {
    title: 'TaskTracker Notification',
    body: 'You have a new task or update in TaskTracker.',
    url: '/tasks',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/tasks',
    },
    actions: [
      { action: 'open', title: 'Open Task' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click to navigate to task
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/tasks';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/tasks') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
