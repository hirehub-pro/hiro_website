const MAX_RECENT_PROFILES = 8;
const PROFILE_TTL_MS = 5 * 60 * 1000;

const profileCache = new Map();
const routeToUid = new Map();

function touch(uid, entry) {
  profileCache.delete(uid);
  profileCache.set(uid, entry);

  while (profileCache.size > MAX_RECENT_PROFILES) {
    const oldestUid = profileCache.keys().next().value;
    profileCache.delete(oldestUid);
    for (const [route, mappedUid] of routeToUid.entries()) {
      if (mappedUid === oldestUid) routeToUid.delete(route);
    }
  }
}

export function cacheProfile(profile, route = '') {
  const uid = String(profile?.uid || '').trim();
  if (!uid) return;

  const previous = profileCache.get(uid) || {};
  touch(uid, {
    ...previous,
    profile,
    cachedAt: Date.now(),
  });
  routeToUid.set(uid, uid);
  if (route) routeToUid.set(String(route), uid);
}

export function getCachedProfile(routeOrUid) {
  const key = String(routeOrUid || '').trim();
  const uid = routeToUid.get(key) || key;
  const entry = profileCache.get(uid);
  if (!entry?.profile || Date.now() - entry.cachedAt > PROFILE_TTL_MS) return null;
  touch(uid, entry);
  return entry.profile;
}

export function cacheProfilePages(uid, pages) {
  const key = String(uid || '').trim();
  if (!key) return;
  const previous = profileCache.get(key) || {};
  touch(key, { ...previous, ...pages });
}

export function getCachedProfilePages(uid) {
  const key = String(uid || '').trim();
  const entry = profileCache.get(key);
  if (!entry) return null;
  touch(key, entry);
  return {
    projects: entry.projects,
    projectsCursor: entry.projectsCursor,
    projectsHasMore: entry.projectsHasMore,
    reviews: entry.reviews,
    reviewsCursor: entry.reviewsCursor,
    reviewsHasMore: entry.reviewsHasMore,
  };
}
