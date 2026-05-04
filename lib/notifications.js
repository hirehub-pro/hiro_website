import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { db, getFirebaseMessaging } from './firebase';

async function syncPushNotificationToken(user, { requestPermission = false } = {}) {
  if (!user || typeof window === 'undefined') {
    return null;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    if (requestPermission) {
      throw new Error('Push notifications are not supported in this browser.');
    }
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    if (requestPermission) {
      throw new Error('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY.');
    }
    return null;
  }

  let permission = Notification.permission;
  if (permission !== 'granted' && requestPermission) {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    if (requestPermission) {
      throw new Error('Notification permission was not granted.');
    }
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    if (requestPermission) {
      throw new Error('Firebase Messaging is not supported in this browser.');
    }
    return null;
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!token) {
    if (requestPermission) {
      throw new Error('Could not create a push notification token.');
    }
    return null;
  }

  await updateDoc(doc(db, 'users', user.uid), {
    fcmToken: token,
    fcmTokens: arrayUnion(token),
    lastTokenUpdate: serverTimestamp(),
  });

  return token;
}

export async function registerForPushNotifications(user) {
  return syncPushNotificationToken(user, { requestPermission: true });
}

export async function syncGrantedPushNotifications(user) {
  return syncPushNotificationToken(user, { requestPermission: false });
}
