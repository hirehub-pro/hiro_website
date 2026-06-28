// ─── Hiro Firebase Configuration ──────────────────────────────────────────
// 1. Copy .env.local.example → .env.local
// 2. Fill in your Firebase project credentials
// 3. This file is safe to commit — it reads from environment variables only

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingConfig = requiredConfig.filter((key) => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  throw new Error(`Missing Firebase config: ${missingConfig.join(', ')}`);
}

// Prevent re-initialization during hot-reload in development
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let appCheckInstance = null;
let appCheckInitPromise = null;

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const storage        = getStorage(app);
export const functions      = getFunctions(app, 'me-west1');

export async function initFirebaseAppCheck() {
  if (typeof window === 'undefined') {
    return null;
  }

  const siteKey = String(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY || '').trim();
  if (!siteKey) {
    return null;
  }

  if (appCheckInstance) {
    return appCheckInstance;
  }

  if (appCheckInitPromise) {
    return appCheckInitPromise;
  }

  appCheckInitPromise = import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      try {
        appCheckInstance = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (error) {
        if (error?.code !== 'appCheck/already-initialized') {
          throw error;
        }
      }

      return appCheckInstance;
    })
    .catch((error) => {
      appCheckInitPromise = null;

      if (process.env.NODE_ENV !== 'production') {
        console.warn('Firebase App Check failed to initialize.', error);
      }

      return null;
    });

  return appCheckInitPromise;
}

export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') {
    return null;
  }

  const { getMessaging, isSupported } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) {
    return null;
  }

  return getMessaging(app);
}

export async function getFirebaseAnalytics() {
  if (typeof window === 'undefined') {
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    return null;
  }

  return getAnalytics(app);
}

export default app;
