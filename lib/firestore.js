/**
 * lib/firestore.js
 *
 * All Firestore data-access functions for HireHub.
 *
 * ── Firestore Data Model ────────────────────────────────────────────────────
 *
 * Collection: users
 *   Fields:
 *     uid              string   (== document ID)
 *     name             string
 *     role             'customer' | 'worker'
 *     professions      string[]  e.g. ['Plumber', 'Electrician']
 *     avgRating        number    0–5
 *     lat              number    (GPS latitude)
 *     lng              number    (GPS longitude)
 *     description      string    (bio)
 *     profileImageUrl  string
 *     verified         boolean
 *     badges           string[]  e.g. ['id', 'business', 'insured']
 *     createdAt        Timestamp
 *
 * Sub-collection: users/{uid}/projects
 *   Fields:
 *     description  string
 *     imageUrl     string
 *     timestamp    Timestamp
 *
 * Sub-collection: users/{uid}/reviews
 *   Fields:
 *     rating    number  1–5
 *     comment   string
 *     userName  string
 *     timestamp Timestamp
 *
 * Collection: reports   (admin)
 *   Fields:
 *     reportedUid  string
 *     reporterUid  string
 *     reason       string
 *     resolved     boolean
 *     createdAt    Timestamp
 *
 * Collection: announcements  (admin)
 *   Fields:
 *     title     string
 *     body      string
 *     createdAt Timestamp
 *
 * ── Required Firestore Composite Indexes ────────────────────────────────────
 *   1. Collection: users   Fields: role ASC, avgRating DESC
 *   2. Collection: users   Fields: role ASC, professions (array-contains), avgRating DESC
 * ────────────────────────────────────────────────────────────────────────────
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  setDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

function normalizeUserDocument(id, data) {
  const derivedBadges = Array.isArray(data.badges) ? data.badges : [];

  if (!derivedBadges.includes('business') && data.businessVerificationStatus === 'approved') {
    derivedBadges.push('business');
  }

  if (!derivedBadges.includes('insured') && (data.insured === true || data.dealerType === 'insured')) {
    derivedBadges.push('insured');
  }

  if (!derivedBadges.includes('id') && data.idVerificationStatus === 'approved') {
    derivedBadges.push('id');
  }

  return {
    uid: data.uid || id,
    ...data,
    city: data.city || data.town || '',
    town: data.town || data.city || '',
    secondaryPhone: data.secondaryPhone || data.optionalPhone || '',
    optionalPhone: data.optionalPhone || data.secondaryPhone || '',
    viewCount: data.viewCount ?? data.profileViews ?? 0,
    profileViews: data.profileViews ?? data.viewCount ?? 0,
    verified:
      data.verified === true ||
      data.businessVerificationStatus === 'approved' ||
      data.idVerificationStatus === 'approved',
    badges: derivedBadges,
    reviewCount: data.reviewCount ?? 0,
    avgRating: Number(data.avgRating ?? 0),
  };
}

// ─── Top-Rated Workers ────────────────────────────────────────────────────────

/**
 * Returns up to `count` workers sorted by avgRating descending.
 * Used on the Home page "Top Rated Professionals" section.
 *
 * @param {number} count
 * @returns {Promise<Array>}
 */
export async function getTopRatedWorkers(count = 10) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'worker'),
    orderBy('avgRating', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeUserDocument(d.id, d.data()));
}

// ─── Search Workers by Profession ─────────────────────────────────────────────

/**
 * Query workers filtered by profession and optionally by proximity.
 * Geo-filtering is done client-side after Firestore returns results.
 *
 * @param {{ profession?: string, lat?: number, lng?: number, radiusKm?: number }} opts
 * @returns {Promise<Array>}
 */
export async function searchWorkers({
  profession = null,
  lat = null,
  lng = null,
  radiusKm = 50,
} = {}) {
  let constraints = [where('role', '==', 'worker')];

  if (profession) {
    constraints.push(where('professions', 'array-contains', profession));
  }

  constraints.push(orderBy('avgRating', 'desc'), limit(50));

  const snapshot = await getDocs(query(collection(db, 'users'), ...constraints));
  let results = snapshot.docs.map((d) => normalizeUserDocument(d.id, d.data()));

  if (lat !== null && lng !== null) {
    results = results.filter((w) => {
      if (w.lat == null || w.lng == null) return true;
      return haversineKm(lat, lng, w.lat, w.lng) <= radiusKm;
    });
  }

  return results;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return normalizeUserDocument(snap.id, snap.data());
}

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    uid,
    ...data,
    avgRating: 0,
    reviewCount: 0,
    profileViews: 0,
    businessVerificationStatus: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getWorkerProjects(uid) {
  const q = query(
    collection(db, 'users', uid, 'projects'),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addProject(uid, { description, imageUrl }) {
  await addDoc(collection(db, 'users', uid, 'projects'), {
    description,
    imageUrl,
    timestamp: serverTimestamp(),
  });
}

export async function getWorkerProject(uid, projectId) {
  if (!uid || !projectId) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'projects', projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getProjectComments(uid, projectId) {
  if (!uid || !projectId) return [];
  const q = query(
    collection(db, 'users', uid, 'projects', projectId, 'comments'),
    orderBy('timestamp', 'asc'),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createProjectComment({
  uid,
  projectId,
  userId,
  userName,
  userImage = '',
  text,
}) {
  if (!uid || !projectId) throw new Error('Missing project path');
  await addDoc(collection(db, 'users', uid, 'projects', projectId, 'comments'), {
    text,
    userId,
    userName,
    userImage,
    timestamp: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', uid, 'projects', projectId), {
    commentsCount: increment(1),
  });
}

export async function getProjectLikes(uid, projectId) {
  if (!uid || !projectId) return [];
  const snap = await getDocs(collection(db, 'users', uid, 'projects', projectId, 'likes'));
  return snap.docs.map((d) => d.id);
}

export async function toggleProjectLike(uid, projectId, userId, hasLiked) {
  if (!uid || !projectId || !userId) throw new Error('Missing like path');
  const likeRef = doc(db, 'users', uid, 'projects', projectId, 'likes', userId);
  if (hasLiked) {
    await deleteDoc(likeRef);
  } else {
    await setDoc(likeRef, { timestamp: serverTimestamp() });
  }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getWorkerReviews(uid) {
  try {
    const q = query(
      collection(db, 'users', uid, 'reviews'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
}

export async function addReview(workerUid, { rating, comment, userName }) {
  await addDoc(collection(db, 'users', workerUid, 'reviews'), {
    rating,
    comment,
    userName,
    timestamp: serverTimestamp(),
  });
}

// ─── Admin: Reports ───────────────────────────────────────────────────────────

export async function getReports(resolvedFilter = false) {
  const q = query(
    collection(db, 'reports'),
    where('resolved', '==', resolvedFilter),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function resolveReport(reportId) {
  await updateDoc(doc(db, 'reports', reportId), { resolved: true });
}

export async function submitReport(data) {
  await addDoc(collection(db, 'reports'), {
    ...data,
    resolved: false,
    createdAt: serverTimestamp(),
  });
}

// ─── Admin: Announcements ──────────────────────────────────────────────────────

export async function getAnnouncements() {
  const q = query(
    collection(db, 'announcements'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createAnnouncement({ title, body }) {
  await addDoc(collection(db, 'announcements'), {
    title,
    body,
    createdAt: serverTimestamp(),
  });
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, 'announcements', id));
}

// ─── Blog Posts ────────────────────────────────────────────────────────────────

/**
 * Collection: blog_posts
 *   authorName  string
 *   authorUid   string
 *   category    string  ('tip' | 'request' | 'question')
 *   title       string
 *   content     string
 *   imageUrl    string
 *   imageUrls   string[]
 *   location    string
 *   isJobRequest boolean
 *   isPinned    boolean
 *   likes       number
 *   likedBy     string[]
 *   timestamp   Timestamp
 */

export async function getBlogPosts({ category = null } = {}) {
  const constraints = [orderBy('timestamp', 'desc'), limit(50)];
  if (category && category !== 'all') {
    constraints.unshift(where('category', '==', category));
  }
  const snap = await getDocs(query(collection(db, 'blog_posts'), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createBlogPost({
  authorUid,
  authorName,
  title,
  content,
  category,
  imageUrl = '',
  imageUrls = [],
  location = '',
  isJobRequest = false,
}) {
  await addDoc(collection(db, 'blog_posts'), {
    authorUid,
    authorName,
    title,
    content,
    category,
    imageUrl,
    imageUrls,
    location,
    isJobRequest,
    isPinned: false,
    likes: 0,
    likedBy: [],
    timestamp: serverTimestamp(),
  });
}

export async function getBlogPost(postId) {
  if (!postId) return null;
  const snap = await getDoc(doc(db, 'blog_posts', postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getBlogComments(postId) {
  if (!postId) return [];
  const q = query(
    collection(db, 'blog_posts', postId, 'blog_comments'),
    orderBy('timestamp', 'asc'),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createBlogComment({ postId, authorUid, authorName, text }) {
  if (!postId) throw new Error('Missing post id');
  await addDoc(collection(db, 'blog_posts', postId, 'blog_comments'), {
    authorUid,
    authorName,
    text,
    timestamp: serverTimestamp(),
  });

  await updateDoc(doc(db, 'blog_posts', postId), {
    commentsCount: increment(1),
  });
}

export async function toggleBlogPostLike(postId, uid, hasLiked) {
  await updateDoc(doc(db, 'blog_posts', postId), {
    likedBy: hasLiked ? arrayRemove(uid) : arrayUnion(uid),
    likes: increment(hasLiked ? -1 : 1),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
