import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
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
export function getInvoiceBuilderLockIdentity() {
  if (typeof window === 'undefined') return { deviceId: '', sessionId: '' };

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

  return { deviceId, sessionId: tabId };
}

function lockRef(uid) {
  return doc(db, 'users', uid, 'invoice_builder_lock', 'active');
}

function getLockExpiryMs(lock) {
  if (lock?.expiresAt?.toMillis) return lock.expiresAt.toMillis();
  return Number(lock?.expiresAtMs || 0);
}

export async function claimInvoiceBuilderLock(uid, identity) {
  const deviceId = String(identity?.deviceId || '');
  const sessionId = String(identity?.sessionId || '');
  if (!uid || !deviceId || !sessionId) return { allowed: false };

  return runTransaction(db, async (transaction) => {
    const ref = lockRef(uid);
    const snapshot = await transaction.get(ref);
    const currentLock = snapshot.data();
    const now = Date.now();
    const isHeldByAnotherSession =
      snapshot.exists() &&
      currentLock?.sessionId !== sessionId &&
      getLockExpiryMs(currentLock) > now;

    if (isHeldByAnotherSession) {
      return { allowed: false };
    }

    const sameSession = snapshot.exists() && currentLock?.sessionId === sessionId;
    transaction.set(ref, {
      ownerUid: uid,
      sessionId,
      deviceId,
      acquiredAt: sameSession ? currentLock.acquiredAt : serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + LOCK_TTL_MS),
      updatedAt: serverTimestamp(),
    });

    return { allowed: true };
  });
}

export async function renewInvoiceBuilderLock(uid, identity) {
  return claimInvoiceBuilderLock(uid, identity);
}

export async function releaseInvoiceBuilderLock(uid, identity) {
  const deviceId = String(identity?.deviceId || '');
  const sessionId = String(identity?.sessionId || '');
  if (!uid || !deviceId || !sessionId) return;

  await runTransaction(db, async (transaction) => {
    const ref = lockRef(uid);
    const snapshot = await transaction.get(ref);
    if (
      snapshot.exists() &&
      snapshot.data()?.deviceId === deviceId &&
      snapshot.data()?.sessionId === sessionId
    ) {
      transaction.delete(ref);
    }
  });
}

export function subscribeToInvoiceBuilderLock(uid, callback) {
  return onSnapshot(lockRef(uid), (snapshot) => callback(snapshot.data() || null));
}
