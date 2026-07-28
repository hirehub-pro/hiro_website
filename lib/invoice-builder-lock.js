import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const LOCK_TTL_MS = 60 * 1000;

function createDeviceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// The stable browser ID handles cross-device access; the session ID makes each
// browser tab a separate invoice-builder session.
export function getInvoiceBuilderDeviceId() {
  if (typeof window === 'undefined') return '';

  const deviceKey = 'hiro_invoice_builder_device_id';
  const tabKey = 'hiro_invoice_builder_tab_id';
  let deviceId = window.localStorage.getItem(deviceKey);
  if (!deviceId) {
    deviceId = createDeviceId();
    window.localStorage.setItem(deviceKey, deviceId);
  }

  let tabId = window.sessionStorage.getItem(tabKey);
  if (!tabId) {
    tabId = createDeviceId();
    window.sessionStorage.setItem(tabKey, tabId);
  }

  return `${deviceId}:${tabId}`;
}

function lockRef(uid) {
  return doc(db, 'users', uid, 'invoice_builder_lock', 'active');
}

export async function claimInvoiceBuilderLock(uid, deviceId) {
  if (!uid || !deviceId) return { allowed: false };

  return runTransaction(db, async (transaction) => {
    const ref = lockRef(uid);
    const snapshot = await transaction.get(ref);
    const currentLock = snapshot.data();
    const now = Date.now();
    const isHeldByAnotherDevice =
      snapshot.exists() &&
      currentLock?.deviceId !== deviceId &&
      Number(currentLock?.expiresAtMs || 0) > now;

    if (isHeldByAnotherDevice) {
      return { allowed: false };
    }

    transaction.set(ref, {
      deviceId,
      expiresAtMs: now + LOCK_TTL_MS,
      updatedAt: serverTimestamp(),
    });

    return { allowed: true };
  });
}

export async function renewInvoiceBuilderLock(uid, deviceId) {
  return claimInvoiceBuilderLock(uid, deviceId);
}

export async function releaseInvoiceBuilderLock(uid, deviceId) {
  if (!uid || !deviceId) return;

  await runTransaction(db, async (transaction) => {
    const ref = lockRef(uid);
    const snapshot = await transaction.get(ref);
    if (snapshot.exists() && snapshot.data()?.deviceId === deviceId) {
      transaction.delete(ref);
    }
  });
}

export function subscribeToInvoiceBuilderLock(uid, callback) {
  return onSnapshot(lockRef(uid), (snapshot) => callback(snapshot.data() || null));
}
