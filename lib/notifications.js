import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { db, getFirebaseMessaging } from './firebase';

export async function registerForPushNotifications(user) {
  if (!user || typeof window === 'undefined') {
    return null;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    throw new Error('Firebase Messaging is not supported in this browser.');
  }

  const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!token) {
    throw new Error('Could not create a push notification token.');
  }

  await updateDoc(doc(db, 'users', user.uid), {
    fcmToken: token,
    fcmTokens: arrayUnion(token),
    lastTokenUpdate: serverTimestamp(),
  });

  return token;
}
