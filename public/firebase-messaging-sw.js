importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBL55dWOh2eIBDooZ0EwzXegyAMEiWMuNE',
  authDomain: 'hire-hub-fe6c4.firebaseapp.com',
  databaseURL: 'https://hire-hub-fe6c4-default-rtdb.firebaseio.com',
  projectId: 'hire-hub-fe6c4',
  storageBucket: 'hire-hub-fe6c4.firebasestorage.app',
  messagingSenderId: '29257648718',
  appId: '1:29257648718:web:e57961f6d9dc39fab8111f',
  measurementId: 'G-PNFDV2Z6DG',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'Hiro';
  const body = payload.notification?.body || payload.data?.body || 'You have a new notification.';
  const url = payload.data?.url || '/messages';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/messages';
  event.waitUntil(clients.openWindow(url));
});
