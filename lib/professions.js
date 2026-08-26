import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const PROFESSIONS_CACHE_KEY = 'hiro:professions:v1';
const PROFESSIONS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let memoryItems = null;
let memoryCachedAt = 0;
let pendingRequest = null;

function isFresh(cachedAt) {
  return Number.isFinite(cachedAt) && Date.now() - cachedAt < PROFESSIONS_CACHE_TTL_MS;
}

function readPersistedCache() {
  if (typeof window === 'undefined') return null;

  try {
    const cachedValue = window.localStorage.getItem(PROFESSIONS_CACHE_KEY);
    if (!cachedValue) return null;

    const parsed = JSON.parse(cachedValue);
    if (!Array.isArray(parsed?.items) || !Number.isFinite(parsed?.cachedAt)) {
      window.localStorage.removeItem(PROFESSIONS_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function persistCache(items, cachedAt) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      PROFESSIONS_CACHE_KEY,
      JSON.stringify({ items, cachedAt })
    );
  } catch (error) {
    // Memory caching still works when storage is unavailable or full.
  }
}

function setCache(items, cachedAt = Date.now()) {
  memoryItems = items;
  memoryCachedAt = cachedAt;
  persistCache(items, cachedAt);
  return items;
}

function getAvailableCache() {
  if (Array.isArray(memoryItems)) {
    return { items: memoryItems, cachedAt: memoryCachedAt };
  }

  const persisted = readPersistedCache();
  if (!persisted) return null;

  memoryItems = persisted.items;
  memoryCachedAt = persisted.cachedAt;
  return persisted;
}

export async function getProfessions({ forceRefresh = false } = {}) {
  const cached = getAvailableCache();

  if (!forceRefresh && cached && isFresh(cached.cachedAt)) {
    return cached.items;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = getDoc(doc(db, 'metadata', 'professions'))
    .then((snapshot) => {
      const items = snapshot.data()?.items;
      return setCache(Array.isArray(items) ? items : []);
    })
    .catch((error) => {
      if (cached) return cached.items;
      throw error;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

