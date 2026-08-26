/**
 * lib/firestore.js
 *
 * All Firestore data-access functions for Hiro.
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
  collectionGroup,
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
  documentId,
  startAt,
  startAfter,
  endAt,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import {
  getPostIdFromCommunitySlug,
  getUidFromProfileSlug,
  getUidPrefixFromProfileSlug,
} from './profile-routing';

const PUBLIC_WORKER_PROFILES = 'publicWorkerProfiles';
const PUBLIC_WORKER_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'optionalPhone',
  'description',
  'town',
  'profileImageUrl',
  'professions',
  'spokenLanguages',
  'socialLinks',
  'workRadius',
  'lat',
  'lng',
]);

function normalizeBusinessId(value) {
  return String(value || '').replace(/\s+/g, '').trim().toUpperCase();
}

function compactDateKey(value) {
  return String(value || '').trim().replaceAll('-', '');
}

function extractSequenceNumber(invoiceNumber) {
  const match = String(invoiceNumber || '').match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : null;
}

function getSavedInvoiceTypeLabel(docType) {
  switch (String(docType || '').toLowerCase()) {
    case 'invoice':
    case 'tax_invoice':
      return 'Tax Invoice';
    case 'invoice_receipt':
    case 'tax_invoice_receipt':
      return 'Tax Invoice / Receipt';
    case 'credit_note':
      return 'Credit Note';
    case 'quote':
      return 'Quote';
    case 'work_order':
      return 'Work Order';
    case 'transaction_account':
      return 'Proforma Invoice';
    case 'receipt':
    default:
      return 'Receipt';
  }
}

function getSavedInvoiceFallbackName(docType, invoiceNumber, clientName) {
  const normalizedDocType = String(docType || '').toLowerCase();
  const suffix = clientName ? ` - ${clientName}` : '';

  if (normalizedDocType === 'quote') return `Quote${suffix}`;
  if (normalizedDocType === 'work_order') return `Work Order${suffix}`;
  if (normalizedDocType === 'transaction_account') return `Proforma Invoice${suffix}`;

  return `Invoice #${invoiceNumber}${suffix}`;
}

function getDocumentCounterId(docType) {
  switch (String(docType || '').toLowerCase()) {
    case 'invoice':
    case 'tax_invoice':
      return 'document_counter_invoice';
    case 'invoice_receipt':
    case 'tax_invoice_receipt':
      return 'document_counter_invoice_receipt';
    case 'credit_note':
      return 'document_counter_credit_note';
    case 'quote':
      return 'document_counter_quote';
    case 'work_order':
      return 'document_counter_work_order';
    case 'transaction_account':
      return 'document_counter_transaction_account';
    case 'receipt':
    default:
      return 'document_counter_receipt';
  }
}

function getAccountingLogBuckets(docType) {
  switch (String(docType || '').toLowerCase()) {
    case 'invoice':
      return [{ bucket: 'invoices', docType: 'invoice' }];
    case 'transaction_account':
      return [{ bucket: 'transaction_account', docType: 'transaction_account' }];
    case 'invoice_receipt':
      return [{ bucket: 'invoice_tax_receipt', docType: 'invoice_receipt' }];
    case 'receipt':
      return [{ bucket: 'receipts', docType: 'receipt' }];
    case 'credit_note':
      return [{ bucket: 'credit_notes', docType: 'credit_note' }];
    default:
      return [];
  }
}

function optionalString(value) {
  const text = String(value || '').trim();
  return text || null;
}

function buildAccountingFileLogPayload({
  uid,
  bucket,
  logDocType,
  counter,
  invoiceData,
  docPayload,
  normalizedInvoiceNumber,
  normalizedClientName,
  compactDate,
  compactDueDate,
  issueDate,
  normalizedPaymentMethod,
  normalizedPaymentMethods,
  normalizedItems,
  totalAmount,
  paidAmount,
  vatAmount,
  vatRate,
  discountAmount,
}) {
  const sourceInvoiceNumber = optionalString(invoiceData?.sourceInvoiceNumber);
  const sourceInvoiceDocId = optionalString(invoiceData?.sourceInvoiceDocId);
  const sourceInvoiceTotalAmount = invoiceData?.sourceInvoiceTotalAmount == null
    ? null
    : Number(invoiceData.sourceInvoiceTotalAmount);
  const allocationNumber = optionalString(docPayload.allocationNumber);
  const taxAuthorityAllocationNumber = optionalString(docPayload.taxAuthorityAllocationNumber);
  const subtotalBeforeTax = Number(invoiceData?.subtotalBeforeDiscount ?? invoiceData?.subtotal ?? Math.max(totalAmount - vatAmount, 0));
  const subtotalAfterTax = Number(invoiceData?.calculatedTotal ?? totalAmount);

  const payload = {
    userId: uid,
    bucket,
    docType: logDocType,
    counter,
    documentNumber: normalizedInvoiceNumber,
    sequenceNumber: docPayload.sequenceNumber,
    invoiceDocId: docPayload.invoiceDocId,
    date: compactDate,
    issueDate,
    paymentDueDate: compactDueDate || null,
    clientDetails: {
      name: normalizedClientName,
      email: docPayload.clientEmail,
      phone: docPayload.clientPhone,
      address: docPayload.clientAddress,
      taxId: docPayload.clientTaxId,
    },
    businessDetails: {
      id: docPayload.createdBy.id,
      name: docPayload.createdBy.name,
      phone: docPayload.createdBy.phone,
      email: docPayload.createdBy.email,
      city: docPayload.createdBy.city,
    },
    amount: totalAmount,
    subtotalBeforeTax,
    subtotalAfterTax,
    vatAmount,
    vatRate,
    grandTotal: totalAmount,
    discountAmount,
    roundingAmount: Number(docPayload.roundingAdjustment ?? 0),
    customerId: docPayload.clientTaxId,
    clientName: normalizedClientName,
    clientAddress: docPayload.clientAddress,
    clientPhone: docPayload.clientPhone,
    clientTaxId: docPayload.clientTaxId,
    paymentMethod: normalizedPaymentMethod,
    paymentMethods: normalizedPaymentMethods,
    paymentAmountTotal: docPayload.paymentAmountTotal,
    sourceInvoiceNumber,
    sourceInvoiceDocId,
    sourceInvoiceTotalAmount,
    items: normalizedItems,
    fileName: docPayload.fileName,
    storagePath: docPayload.storagePath,
    url: docPayload.url,
    timestamp: serverTimestamp(),
  };

  if (docPayload.docType === 'invoice' || docPayload.docType === 'invoice_receipt') {
    payload.paymentStatus = docPayload.paymentStatus;
    payload.paidAmount = paidAmount;
  }

  if (docPayload.docType === 'credit_note') {
    payload.creditNoteLegal = {
      sourceInvoiceNumber,
      sourceInvoiceDocId,
      sourceInvoiceTotalAmount,
    };
  }

  if (docPayload.taxAuthorityAllocation) {
    payload.taxAuthorityAllocation = docPayload.taxAuthorityAllocation;
  }
  if (allocationNumber) {
    payload.allocationNumber = allocationNumber;
  }
  if (taxAuthorityAllocationNumber) {
    payload.taxAuthorityAllocationNumber = taxAuthorityAllocationNumber;
  }

  return payload;
}

function buildAccountingFileLogUpdatePayload(docPayload) {
  const payload = {
    fileName: docPayload.fileName,
    storagePath: docPayload.storagePath,
    url: docPayload.url,
    vatRate: Number(docPayload.vatRate ?? 0),
  };
  const allocationNumber = optionalString(docPayload.allocationNumber);
  const taxAuthorityAllocationNumber = optionalString(docPayload.taxAuthorityAllocationNumber);

  if (docPayload.taxAuthorityAllocation) {
    payload.taxAuthorityAllocation = docPayload.taxAuthorityAllocation;
  }
  if (allocationNumber) {
    payload.allocationNumber = allocationNumber;
  }
  if (taxAuthorityAllocationNumber) {
    payload.taxAuthorityAllocationNumber = taxAuthorityAllocationNumber;
  }

  return payload;
}

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
    collection(db, PUBLIC_WORKER_PROFILES),
    where('isSearchVisible', '==', true),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => normalizeUserDocument(d.id, d.data()))
    .sort((a, b) => Number(b.avgRating || 0) - Number(a.avgRating || 0))
    .slice(0, count);
}

// ─── Search Workers by Profession ─────────────────────────────────────────────

/**
 * Query one ordered page of searchable workers.
 *
 * @param {{ profession?: string, professionTerms?: string[], sortBy?: string, cursor?: import('firebase/firestore').DocumentSnapshot | null, pageSize?: number }} opts
 * @returns {Promise<{workers: Array, cursor: import('firebase/firestore').DocumentSnapshot | null, hasMore: boolean}>}
 */
export async function searchWorkers({
  profession = null,
  professionTerms = [],
  sortBy = 'rating',
  cursor = null,
  pageSize = 20,
} = {}) {
  const constraints = [where('isSearchVisible', '==', true)];
  const normalizedPageSize = Math.max(1, Math.min(Number(pageSize) || 20, 40));

  const normalizedProfessionTerms = Array.isArray(professionTerms)
    ? professionTerms.map((term) => String(term || '').trim()).filter(Boolean)
    : [];

  if (normalizedProfessionTerms.length > 1) {
    constraints.push(where('professions', 'array-contains-any', normalizedProfessionTerms.slice(0, 10)));
  } else if (normalizedProfessionTerms.length === 1) {
    constraints.push(where('professions', 'array-contains', normalizedProfessionTerms[0]));
  } else if (profession) {
    constraints.push(where('professions', 'array-contains', profession));
  }

  if (sortBy === 'name') {
    constraints.push(orderBy('name'));
  } else {
    constraints.push(orderBy('avgRating', 'desc'));
    constraints.push(orderBy('reviewCount', 'desc'));
    constraints.push(orderBy('name'));
  }

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(normalizedPageSize + 1));

  const snapshot = await getDocs(query(collection(db, PUBLIC_WORKER_PROFILES), ...constraints));
  const hasMore = snapshot.docs.length > normalizedPageSize;
  const visibleDocs = snapshot.docs.slice(0, normalizedPageSize);

  return {
    workers: visibleDocs.map((workerDoc) => normalizeUserDocument(workerDoc.id, workerDoc.data())),
    cursor: visibleDocs[visibleDocs.length - 1] || null,
    hasMore,
  };
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  if (!uid) return null;

  if (auth.currentUser?.uid === uid) {
    const [accountSnap, publicSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, PUBLIC_WORKER_PROFILES, uid)),
    ]);
    if (!accountSnap.exists() && !publicSnap.exists()) return null;
    return normalizeUserDocument(uid, {
      ...(accountSnap.exists() ? accountSnap.data() : {}),
      ...(publicSnap.exists() ? publicSnap.data() : {}),
    });
  }

  const snap = await getDoc(doc(db, PUBLIC_WORKER_PROFILES, uid));
  if (!snap.exists()) return null;
  return normalizeUserDocument(snap.id, snap.data());
}

export async function resolveUserProfile(profileIdentifier) {
  const identifier = String(profileIdentifier || '').trim();
  if (!identifier) return null;

  // A canonical profile URL is "name--uid". Resolve that UID before trying a
  // direct document read; otherwise Firestore receives the whole slug as a
  // document ID. Public-profile rules reject reads of nonexistent documents,
  // which previously made valid public URLs render as 404s on the server.
  const slugUid = getUidFromProfileSlug(identifier);
  if (slugUid) {
    return getUserProfile(slugUid);
  }

  const exactProfile = await getUserProfile(identifier);
  if (exactProfile) return exactProfile;

  const uidPrefix = getUidPrefixFromProfileSlug(identifier);
  if (!uidPrefix) return null;

  const snapshot = await getDocs(query(
    collection(db, PUBLIC_WORKER_PROFILES),
    where('isSearchVisible', '==', true),
    orderBy(documentId()),
    startAt(uidPrefix),
    endAt(`${uidPrefix}\uf8ff`),
    limit(2)
  ));

  if (snapshot.size !== 1) return null;

  const match = snapshot.docs[0];
  return normalizeUserDocument(match.id, match.data());
}

export async function getUserVerificationInfo(uid) {
  if (!uid) return null;

  const snap = await getDoc(doc(db, 'users', uid, 'verification_info', 'latest'));
  if (!snap.exists()) return null;

  const data = snap.data() || {};
  return {
    address: String(data.address || '').trim(),
    approvedAt: data.approvedAt || null,
    businessId: String(data.businessId || '').trim(),
    businessIdNormalized: normalizeBusinessId(data.businessIdNormalized || data.businessId || ''),
    businessName: String(data.businessName || '').trim(),
    dealerType: String(data.dealerType || data.dealertype || '').trim().toLowerCase(),
    legalAccepted: data.legalAccepted === true,
    accuracyAccepted: data.accuracyAccepted === true,
    responsibilityAccepted: data.responsibilityAccepted === true,
    // The current verification callable writes businessVerificationStatus and
    // removes the older status field. Keep status as a compatibility alias for
    // existing callers while exposing the canonical field explicitly.
    businessVerificationStatus: String(
      data.businessVerificationStatus || data.status || ''
    ).trim().toLowerCase(),
    status: String(data.businessVerificationStatus || data.status || '').trim().toLowerCase(),
    taxBranch: String(data.taxBranch || '').trim(),
    timestamp: data.timestamp || null,
    userId: String(data.userId || uid),
  };
}

export async function isBusinessIdInUseByAnotherUser(uid, businessId) {
  // The active rules deliberately prevent clients from searching private
  // verification records. The submitBusinessVerification callable performs
  // the authoritative uniqueness check in a transaction.
  return false;
}

export async function saveUserVerificationInfo(uid, verificationData) {
  if (!uid) throw new Error('Missing user id');

  const dealerType = String(verificationData?.dealerType || '').trim().toLowerCase();
  const businessId = String(verificationData?.businessId || '').trim();
  const normalizedData = {
    address: String(verificationData?.address || '').trim(),
    businessId,
    businessName: String(verificationData?.businessName || '').trim(),
    dealerType,
    legalAccepted: verificationData?.legalAccepted === true,
    termsAccepted: verificationData?.accuracyAccepted === true,
    legalDeclarationAccepted: verificationData?.accuracyAccepted === true,
    responsibilityAccepted: verificationData?.responsibilityAccepted === true,
  };
  const submitVerification = httpsCallable(functions, 'submitBusinessVerification');
  const response = await submitVerification(normalizedData);
  return { ...normalizedData, ...(response.data || {}) };
}

export async function getUserSavedLocations(uid) {
  if (!uid) {
    return {
      activeLocationId: '',
      activeLocationUpdatedAt: null,
      locations: [],
    };
  }

  const userRef = doc(db, 'users', uid);
  const savedLocationsRef = collection(db, 'users', uid, 'saved_locations');
  const [userSnap, savedLocationsSnap] = await Promise.all([
    getDoc(userRef),
    getDocs(savedLocationsRef),
  ]);

  const userData = userSnap.exists() ? userSnap.data() : {};
  const activeLocationId = userData.activeLocationId || '';
  const activeLocationUpdatedAt = normalizeFirestoreTimestamp(userData.activeLocationUpdatedAt);

  const locations = savedLocationsSnap.docs
    .map((savedLocationDoc) => {
      const data = savedLocationDoc.data();

      return {
        id: savedLocationDoc.id,
        label: data.label || '',
        lat: typeof data.lat === 'number' ? data.lat : null,
        lng: typeof data.lng === 'number' ? data.lng : null,
        updatedAt: normalizeFirestoreTimestamp(data.updatedAt),
      };
    })
    .sort((a, b) => {
      if (a.id === activeLocationId) return -1;
      if (b.id === activeLocationId) return 1;

      const timeA = a.updatedAt?.getTime?.() || 0;
      const timeB = b.updatedAt?.getTime?.() || 0;
      return timeB - timeA;
    });

  return {
    activeLocationId,
    activeLocationUpdatedAt,
    locations,
  };
}

export async function createUserSavedLocation(uid, {
  label = '',
  lat = null,
  lng = null,
} = {}) {
  if (!uid) {
    throw new Error('Missing user id');
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Missing location coordinates');
  }

  const normalizedLocation = {
    label: String(label || '').trim(),
    lat,
    lng,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const savedLocationRef = await addDoc(collection(db, 'users', uid, 'saved_locations'), normalizedLocation);

  return {
    id: savedLocationRef.id,
    label: normalizedLocation.label,
    lat,
    lng,
    updatedAt: new Date(),
  };
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
  if (!uid) throw new Error('Missing user id');
  const accountSnap = await getDoc(doc(db, 'users', uid));
  const role = accountSnap.data()?.role;

  if (role !== 'worker') {
    await updateDoc(doc(db, 'users', uid), data);
    return;
  }

  const publicUpdate = {};
  const privateUpdate = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    const canonicalKey = key === 'secondaryPhone'
      ? 'optionalPhone'
      : key === 'city'
        ? 'town'
        : key;
    if (PUBLIC_WORKER_FIELDS.has(canonicalKey)) {
      publicUpdate[canonicalKey] = value;
    } else if (!['secondaryPhone', 'city'].includes(key)) {
      privateUpdate[key] = value;
    }
  });

  const writes = [];
  if (Object.keys(publicUpdate).length > 0) {
    writes.push(updateDoc(doc(db, PUBLIC_WORKER_PROFILES, uid), {
      ...publicUpdate,
      updatedAt: serverTimestamp(),
    }));
  }
  if (Object.keys(privateUpdate).length > 0) {
    writes.push(updateDoc(doc(db, 'users', uid), privateUpdate));
  }
  await Promise.all(writes);
}

export async function setUserActiveLocation(uid, {
  locationId = '',
  locationLabel = '',
  lat = null,
  lng = null,
  source = 'saved',
} = {}) {
  if (!uid) {
    throw new Error('Missing user id');
  }

  await updateDoc(doc(db, 'users', uid), {
    activeLocationId: locationId,
    activeLocationLabel: locationLabel,
    activeLocationSource: source,
    activeLocationUpdatedAt: serverTimestamp(),
    activeSearchLat: lat,
    activeSearchLng: lng,
  });
}

export async function getUserSavedInvoices(uid) {
  if (!uid) return [];

  const q = query(
    collection(db, 'users', uid, 'invoices'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  const snap = await getDocs(q);
  return snap.docs.map((savedInvoiceDoc) => {
    const data = savedInvoiceDoc.data();

    return {
      id: savedInvoiceDoc.id,
      amount: Number(data.amount ?? 0),
      clientAddress: data.clientAddress || '',
      clientName: data.clientName || '',
      clientPhone: data.clientPhone || '',
      clientTaxId: data.clientTaxId || '',
      createdAt: normalizeFirestoreTimestamp(data.createdAt),
      date: data.date || '',
      discountAmount: Number(data.discountAmount ?? 0),
      discountType: data.discountType || 'percent',
      docType: data.docType || 'receipt',
      fileName: data.fileName || '',
      hasDiscount: data.hasDiscount === true,
      invoiceNumber: data.invoiceNumber || '',
      items: Array.isArray(data.items) ? data.items : [],
      name: data.name || '',
      notes: data.notes || '',
      paidAmount: Number(data.paidAmount ?? 0),
      paymentAmountTotal: Number(data.paymentAmountTotal ?? 0),
      paymentDueDate: data.paymentDueDate || '',
      paymentMethod: data.paymentMethod || '',
      paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
      paymentStatus: data.paymentStatus || '',
      payload: data.payload || null,
      priceTaxModeDefault: data.priceTaxModeDefault || 'after_tax',
      roundTotalEnabled: data.roundTotalEnabled !== false,
      sequenceNumber: Number.isFinite(Number(data.sequenceNumber)) ? Number(data.sequenceNumber) : null,
      sourceInvoiceDocId: data.sourceInvoiceDocId ?? null,
      sourceInvoiceNumber: data.sourceInvoiceNumber ?? null,
      sourceInvoiceTotalAmount: data.sourceInvoiceTotalAmount ?? null,
      storagePath: data.storagePath || '',
      type: data.type || data.docType || 'receipt',
      url: data.url || '',
      vatAmount: Number(data.vatAmount ?? 0),
      vatRate: Number(data.vatRate ?? 0),
    };
  });
}

export async function getNextUserDocumentNumber(uid, docType = 'receipt') {
  if (!uid) throw new Error('Missing user id');

  const counterId = getDocumentCounterId(docType);
  const counterRef = doc(db, 'users', uid, 'counters', counterId);
  const counterSnap = await getDoc(counterRef);

  if (!counterSnap.exists()) {
    return '';
  }

  const counterValue = Number(counterSnap.data()?.value);
  if (!Number.isFinite(counterValue)) {
    return '';
  }

  return String(counterValue);
}

export async function initializeUserDocumentCounter(uid, docType = 'receipt', startNumber = 1) {
  if (!uid) throw new Error('Missing user id');

  const normalizedStartNumber = Number(startNumber);
  if (!Number.isInteger(normalizedStartNumber) || normalizedStartNumber <= 0) {
    throw new Error('Invalid start number');
  }

  const normalizedDocType = String(docType || 'receipt').toLowerCase();
  const initializeCounter = httpsCallable(functions, 'initializeDocumentCounter');
  const response = await initializeCounter({
    docType: normalizedDocType,
    startNumber: normalizedStartNumber,
  });
  return String(response.data?.value ?? normalizedStartNumber);
}

export async function getSystemVatPercent() {
  const systemRef = doc(db, 'metadata', 'system');
  const systemSnap = await getDoc(systemRef);

  if (!systemSnap.exists()) {
    return null;
  }

  const vatPercent = Number(systemSnap.data()?.vatPercent);
  if (!Number.isFinite(vatPercent)) {
    return null;
  }

  return vatPercent;
}

export async function getAllocationNumberMinAmountBeforeVat() {
  const systemRef = doc(db, 'metadata', 'system');
  const systemSnap = await getDoc(systemRef);

  if (!systemSnap.exists()) {
    return 0;
  }

  const minAmount = Number(systemSnap.data()?.allocationNumberMinAmountBeforeVat);
  if (!Number.isFinite(minAmount) || minAmount < 0) {
    return 0;
  }

  return minAmount;
}

function buildServerDocumentRequest(invoiceData) {
  const rawDocType = String(invoiceData?.docType || invoiceData?.documentType || 'receipt').trim().toLowerCase();
  const docType = rawDocType === 'tax_invoice'
    ? 'invoice'
    : rawDocType === 'tax_invoice_receipt'
      ? 'invoice_receipt'
      : rawDocType;
  const sequential = !['quote', 'work_order'].includes(docType);
  const rawNumber = String(invoiceData?.invoiceNumber || '').trim();
  const sequenceNumber = extractSequenceNumber(rawNumber);
  const issueDate = String(invoiceData?.issueDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const year = /^\d{4}/.test(issueDate) ? issueDate.slice(0, 4) : String(new Date().getFullYear());
  const documentNumber = sequential && Number.isInteger(sequenceNumber)
    ? `${year}-${String(sequenceNumber).padStart(4, '0')}`
    : '';
  if (sequential && !documentNumber) {
    throw new Error('A document number is required. Refresh the invoice editor and try again.');
  }

  const paymentType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (/cash|מזומן|نقد/.test(normalized)) return 'cash';
    if (/card|כרטיס|بطاق/.test(normalized)) return 'credit';
    if (/check|שיק|המחא|شيك/.test(normalized)) return 'check';
    if (/transfer|העבר|تحويل/.test(normalized)) return 'transfer';
    if (/paybox/.test(normalized)) return 'paybox';
    if (/bit/.test(normalized)) return 'bit';
    if (/withhold|ניכוי|مقتطع/.test(normalized)) return 'withholding_tax';
    return 'other';
  };
  const operationId = String(invoiceData?.operationId || (
    globalThis.crypto?.randomUUID?.() || `document_${Date.now()}_${Math.random().toString(36).slice(2)}`
  )).replace(/[^A-Za-z0-9_-]/g, '_');
  const request = {
    operationId: operationId.length >= 12 ? operationId : `document_${operationId}_${Date.now()}`,
    docType,
    date: issueDate,
    paymentDueDate: String(invoiceData?.dueDate || '').slice(0, 10) || null,
    ...(sequential ? { documentNumber, sequenceNumber } : {}),
    client: {
      id: String(invoiceData?.clientId || '').trim(),
      name: String(invoiceData?.clientName || '').trim(),
      address: String(invoiceData?.clientCity || '').trim(),
      phone: String(invoiceData?.clientPhone || '').trim(),
      email: String(invoiceData?.clientEmail || '').trim(),
      externalClientNumber: String(invoiceData?.externalClientNumber || '').trim(),
      savedClientId: String(invoiceData?.savedClientId || '').trim() || null,
    },
    items: Array.isArray(invoiceData?.lineItems) ? invoiceData.lineItems.map((item) => ({
      description: String(item?.description || '').trim(),
      quantity: Number(item?.quantity || 0),
      price: Number(item?.unitPrice || 0),
      priceTaxMode: item?.vatMode === 'before_vat' ? 'before_tax' : 'after_tax',
    })) : [],
    discountAmount: Number(invoiceData?.discountAmount || 0),
    roundTotalEnabled: invoiceData?.roundTotalEnabled === true,
    notes: String(invoiceData?.notes || '').trim(),
    paymentMethods: Array.isArray(invoiceData?.payments) ? invoiceData.payments.map((payment) => ({
      method: paymentType(payment?.type),
      amount: Number(payment?.amount || 0),
      cardNumber: String(payment?.cardNumber || '').trim(),
      cardName: String(payment?.cardName || '').trim(),
      cardExpiration: String(payment?.cardExpiration || '').trim(),
      installments: String(payment?.numberOfPayments || '').trim(),
      checkNumber: String(payment?.checkNumber || '').trim(),
      bank: String(payment?.bankName || '').trim(),
      branch: String(payment?.branch || '').trim(),
      account: String(payment?.accountNumber || '').trim(),
    })) : [],
    sourceInvoiceDocId: String(invoiceData?.sourceInvoiceDocId || '').trim() || null,
    sourceInvoiceNumber: String(invoiceData?.sourceInvoiceNumber || '').trim() || null,
    creditNoteLegal: invoiceData?.creditNoteLegal || null,
  };
  return { request, rawNumber };
}

function resolveServerDocumentUrl(documentData = {}) {
  const candidates = [
    documentData.url,
    documentData.downloadUrl,
    documentData.downloadURL,
    documentData.finalPdf?.url,
    documentData.finalPdf?.downloadUrl,
    documentData.finalPdf?.downloadURL,
    documentData.serverDocument?.url,
    documentData.serverDocument?.downloadUrl,
    documentData.serverDocument?.downloadURL,
  ];

  return String(candidates.find((value) => typeof value === 'string' && value.trim()) || '').trim();
}

export async function previewUserInvoice(uid, invoiceData) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('Sign in is required to generate a document preview.');
  }

  const { request } = buildServerDocumentRequest(invoiceData);
  const previewServerDocument = httpsCallable(functions, 'previewServerDocument', { timeout: 120000 });
  const response = await previewServerDocument(request);
  const { pdfBase64, previewOnly, fileName } = response.data || {};

  if (previewOnly !== true || !pdfBase64) {
    throw new Error('Preview generation failed.');
  }

  return { fileName: String(fileName || 'preview_document.pdf'), pdfBase64: String(pdfBase64) };
}

export async function saveUserInvoice(uid, invoiceData) {
  if (!uid || auth.currentUser?.uid !== uid) {
    throw new Error('Sign in is required to create a document.');
  }

  // Accounting documents are finalized by the deployed createServerDocument
  // callable. The current Firestore rules intentionally reject direct client
  // invoice and counter writes, so keep the old implementation below only as
  // historical context and return through the server-owned workflow.
  const { request, rawNumber } = buildServerDocumentRequest(invoiceData);
  const createServerDocument = httpsCallable(functions, 'createServerDocument', { timeout: 120000 });
  const response = await createServerDocument(request);
  const saved = response.data?.document;
  if (!saved?.invoiceDocId) {
    throw new Error('The server did not return a saved document.');
  }
  const finalizedSnap = await getDoc(doc(db, 'users', uid, 'invoices', saved.invoiceDocId));
  const finalizedDocument = finalizedSnap.exists() ? finalizedSnap.data() : {};
  const savedInvoiceUrl = resolveServerDocumentUrl(saved) || resolveServerDocumentUrl(finalizedDocument);
  return {
    id: saved.invoiceDocId,
    ...invoiceData,
    ...saved,
    invoiceNumber: saved.documentNumber || rawNumber,
    savedFirestoreId: saved.invoiceDocId,
    savedFileName: saved.fileName || finalizedDocument.fileName || finalizedDocument.finalPdf?.fileName || '',
    savedInvoiceUrl,
    savedStoragePath: saved.storagePath || finalizedDocument.storagePath || finalizedDocument.finalPdf?.storagePath || '',
  };

  // Kept in an isolated scope temporarily while the legacy persistence helpers
  // are removed in a follow-up cleanup; it is unreachable by design.
  {
  const createdAtMs = Date.now();
  const normalizedInvoiceNumber = String(invoiceData?.invoiceNumber || createdAtMs);
  const normalizedClientName = String(invoiceData?.clientName || '').trim();
  const normalizedDocumentDescription = String(invoiceData?.documentDescription || '').trim();
  const issueDate = String(invoiceData?.issueDate || '').trim();
  const dueDate = String(invoiceData?.dueDate || '').trim();
  const compactDate = compactDateKey(issueDate);
  const compactDueDate = compactDateKey(dueDate || issueDate);
  const rawDocType = String(invoiceData?.docType || invoiceData?.documentType || 'receipt').trim().toLowerCase();
  const normalizedDocType = rawDocType === 'tax_invoice'
    ? 'invoice'
    : rawDocType === 'tax_invoice_receipt'
      ? 'invoice_receipt'
      : rawDocType;
  const isSignableDocument = normalizedDocType === 'quote' || normalizedDocType === 'work_order';
  const normalizedPaymentMethod = isSignableDocument
    ? 'cash'
    : String(invoiceData?.payments?.[0]?.type || '').trim().toLowerCase() || 'cash';
  const normalizedItems = Array.isArray(invoiceData?.lineItems)
    ? invoiceData.lineItems.map((item) => {
      const quantity = Number(item?.quantity ?? 0);
      const subtotal = Number(item?.lineSubtotal ?? 0);
      const unitPriceWithoutTax = quantity > 0 ? subtotal / quantity : 0;

      return {
        sku: String(item?.sku || '').trim(),
        description: String(item?.description || '').trim(),
        price: Number(item?.unitPrice ?? 0),
        priceTaxMode: item?.vatMode === 'after_vat'
          ? 'after_tax'
          : item?.vatMode === 'no_vat'
            ? 'no_tax'
            : 'before_tax',
        quantity,
        subtotal,
        unitPriceWithoutTax,
        vatAmount: Number(item?.lineVatAmount ?? 0),
        vatRate: item?.vatMode === 'no_vat' ? 0 : Number(invoiceData?.vatRate ?? 0),
        total: Number(item?.lineTotal ?? 0),
      };
    })
    : [];
  const normalizedPaymentMethods = isSignableDocument
    ? []
    : Array.isArray(invoiceData?.payments) && invoiceData.payments.length > 0
    ? invoiceData.payments.map((payment) => ({
      amount: Number(payment?.amount ?? 0),
      details: String(payment?.details || '').trim(),
      method: String(payment?.type || '').trim().toLowerCase() || 'cash',
    }))
    : [{ amount: 0, method: normalizedPaymentMethod }];
  const sequenceNumber = extractSequenceNumber(normalizedInvoiceNumber);
  const invoiceDocId = `${normalizedDocType}_${normalizedInvoiceNumber}`;
  const totalAmount = Number(invoiceData?.total ?? 0);
  const paidAmount = Number(invoiceData?.paidTotal ?? 0);
  const vatAmount = Number(invoiceData?.vatAmount ?? 0);
  const vatRate = Number(invoiceData?.vatRate ?? 0);
  const discountAmount = Number(invoiceData?.discountAmount ?? 0);
  const hasDiscount = discountAmount > 0;

  const docPayload = {
    amount: totalAmount,
    clientAddress: String(invoiceData?.clientCity || '').trim(),
    clientEmail: String(invoiceData?.clientEmail || '').trim(),
    clientName: normalizedClientName,
    clientPhone: String(invoiceData?.clientPhone || '').trim(),
    clientTaxId: String(invoiceData?.clientId || '').trim(),
    createdAt: serverTimestamp(),
    date: compactDate,
    discountAmount,
    discountType: invoiceData?.discountType === 'fixed' ? 'fixed' : 'percent',
    docType: normalizedDocType,
    fileName: String(invoiceData?.savedFileName || invoiceData?.fileName || `invoice_${uid}_${createdAtMs}.pdf`),
    createdBy: {
      id: String(invoiceData?.createdBy?.id || uid).trim(),
      name: String(invoiceData?.createdBy?.name || '').trim(),
      phone: String(invoiceData?.createdBy?.phone || '').trim(),
      email: String(invoiceData?.createdBy?.email || '').trim(),
      city: String(invoiceData?.createdBy?.city || '').trim(),
    },
    hasDiscount,
    invoiceDocId,
    invoiceNumber: normalizedInvoiceNumber,
    items: normalizedItems,
    name: isSignableDocument
      ? getSavedInvoiceFallbackName(normalizedDocType, normalizedInvoiceNumber, normalizedClientName)
      : normalizedDocumentDescription || getSavedInvoiceFallbackName(normalizedDocType, normalizedInvoiceNumber, normalizedClientName),
    notes: String(invoiceData?.notes || '').trim(),
    paidAmount,
    paymentAmountTotal: isSignableDocument
      ? 0
      : Array.isArray(invoiceData?.payments)
      ? invoiceData.payments.reduce((sum, payment) => sum + (Number(payment?.amount) || 0), 0)
      : 0,
    paymentDueDate: compactDueDate,
    paymentMethod: normalizedPaymentMethod,
    paymentMethods: normalizedPaymentMethods,
    paymentStatus: paidAmount > 0 ? 'paid' : 'unpaid',
    priceTaxModeDefault: 'after_tax',
    roundTotalEnabled: invoiceData?.roundTotalEnabled !== false,
    calculatedAmount: Number(invoiceData?.calculatedTotal ?? totalAmount),
    roundingAdjustment: Number(invoiceData?.roundingAdjustment ?? 0),
    sequenceNumber,
    sourceInvoiceDocId: optionalString(invoiceData?.sourceInvoiceDocId),
    sourceInvoiceNumber: optionalString(invoiceData?.sourceInvoiceNumber),
    sourceInvoiceTotalAmount: invoiceData?.sourceInvoiceTotalAmount == null ? null : Number(invoiceData.sourceInvoiceTotalAmount),
    storagePath: String(invoiceData?.savedStoragePath || invoiceData?.storagePath || ''),
    taxAuthorityAllocation: invoiceData?.taxAuthorityAllocation || null,
    allocationNumber: String(invoiceData?.allocationNumber || '').trim(),
    taxAuthorityAllocationNumber: String(invoiceData?.taxAuthorityAllocationNumber || invoiceData?.allocationNumber || '').trim(),
    type: normalizedDocType,
    url: String(invoiceData?.savedInvoiceUrl || invoiceData?.url || ''),
    vatAmount,
    vatRate,
  };

  const docRef = doc(db, 'users', uid, 'invoices', invoiceDocId);
  await runTransaction(db, async (transaction) => {
    const invoiceSnap = await transaction.get(docRef);
    const shouldCreateAccountingLogs = !invoiceSnap.exists();
    const counterRef = !isSignableDocument
      ? doc(db, 'users', uid, 'counters', getDocumentCounterId(normalizedDocType))
      : null;
    const accountingLogBuckets = shouldCreateAccountingLogs
      ? getAccountingLogBuckets(normalizedDocType)
      : [];
    const existingAccountingLogFiles = Array.isArray(invoiceSnap.data()?.accountingLogFiles)
      ? invoiceSnap.data().accountingLogFiles
      : [];

    const [bucketSnaps, counterSnap] = await Promise.all([
      Promise.all(accountingLogBuckets.map(({ bucket }) => (
        transaction.get(doc(db, 'users', uid, 'logs', bucket))
      ))),
      counterRef ? transaction.get(counterRef) : Promise.resolve(null),
    ]);

    const accountingLogFiles = [];

    accountingLogBuckets.forEach(({ bucket, docType: logDocType }, index) => {
      const bucketRef = doc(db, 'users', uid, 'logs', bucket);
      const currentValue = Number(bucketSnaps[index]?.data()?.value ?? 0);
      const nextValue = currentValue + 1;
      const fileRef = doc(collection(db, 'users', uid, 'logs', bucket, 'files'));
      accountingLogFiles.push({
        bucket,
        docType: logDocType,
        path: fileRef.path,
        counter: nextValue,
      });

      transaction.set(bucketRef, {
        value: nextValue,
        docType: bucket,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(fileRef, buildAccountingFileLogPayload({
        uid,
        bucket,
        logDocType,
        counter: nextValue,
        invoiceData,
        docPayload,
        normalizedInvoiceNumber,
        normalizedClientName,
        compactDate,
        compactDueDate,
        issueDate,
        normalizedPaymentMethod,
        normalizedPaymentMethods,
        normalizedItems,
        totalAmount,
        paidAmount,
        vatAmount,
        vatRate,
        discountAmount,
      }));
    });

    if (!shouldCreateAccountingLogs && existingAccountingLogFiles.length > 0) {
      const logUpdatePayload = buildAccountingFileLogUpdatePayload(docPayload);
      existingAccountingLogFiles.forEach((logFile) => {
        if (logFile?.path) {
          transaction.set(doc(db, logFile.path), logUpdatePayload, { merge: true });
        }
      });
    }

    const currentCounterValue = Number(counterSnap?.data()?.value);
    const shouldAdvanceDocumentCounter = counterRef
      && Number.isFinite(currentCounterValue)
      && sequenceNumber === currentCounterValue;

    if (shouldAdvanceDocumentCounter) {
      transaction.set(counterRef, {
        updatedAt: serverTimestamp(),
        value: increment(1),
      }, { merge: true });
    }

    transaction.set(docRef, {
      ...docPayload,
      ...(accountingLogFiles.length > 0 ? { accountingLogFiles } : {}),
    }, { merge: true });
  });
  return { id: docRef.id, ...docPayload };
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getWorkerProjectsPage({ uid, cursor = null, pageSize = 6 }) {
  if (!uid) return { items: [], cursor: null, hasMore: false };

  const constraints = [orderBy('timestamp', 'desc')];
  if (Number.isFinite(cursor)) {
    constraints.push(startAfter(Timestamp.fromMillis(cursor)));
  }
  constraints.push(limit(pageSize + 1));

  const snap = await getDocs(query(
    collection(db, PUBLIC_WORKER_PROFILES, uid, 'projects'),
    ...constraints
  ));
  const hasMore = snap.docs.length > pageSize;
  const pageDocs = snap.docs.slice(0, pageSize);
  const lastTimestamp = pageDocs.at(-1)?.data()?.timestamp;

  return {
    items: pageDocs.map((d) => ({ id: d.id, ...d.data() })),
    cursor: typeof lastTimestamp?.toMillis === 'function' ? lastTimestamp.toMillis() : null,
    hasMore,
  };
}

export async function getWorkerProjects(uid) {
  const page = await getWorkerProjectsPage({ uid });
  return page.items;
}

export async function addProject(uid, { description, imageUrl, media }) {
  const normalizedMedia = Array.isArray(media) ? media.filter((item) => item?.url).slice(0, 20) : [];
  await addDoc(collection(db, PUBLIC_WORKER_PROFILES, uid, 'projects'), {
    description,
    imageUrl,
    imageUrls: normalizedMedia.map((item) => item.url),
    mediaTypes: normalizedMedia.map((item) => item.type === 'video' ? 'video' : 'image'),
    hasVideo: normalizedMedia.some((item) => item.type === 'video'),
    commentsCount: 0,
    likesCount: 0,
    timestamp: serverTimestamp(),
  });
}

export async function getWorkerProject(uid, projectId) {
  if (!uid || !projectId) return null;
  const snap = await getDoc(doc(db, PUBLIC_WORKER_PROFILES, uid, 'projects', projectId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getProjectComments(uid, projectId) {
  if (!uid || !projectId) return [];
  const q = query(
    collection(db, PUBLIC_WORKER_PROFILES, uid, 'projects', projectId, 'comments'),
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
  await addDoc(collection(db, PUBLIC_WORKER_PROFILES, uid, 'projects', projectId, 'comments'), {
    text,
    userId,
    userName,
    userImage,
    timestamp: serverTimestamp(),
  });

}

export async function getProjectLikes(uid, projectId) {
  if (!uid || !projectId) return [];
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) return [];
  const likeSnap = await getDoc(doc(db, PUBLIC_WORKER_PROFILES, uid, 'projects', projectId, 'likes', currentUid));
  return likeSnap.exists() ? [currentUid] : [];
}

export async function toggleProjectLike(uid, projectId, userId, hasLiked) {
  if (!uid || !projectId || !userId) throw new Error('Missing like path');
  const likeRef = doc(db, PUBLIC_WORKER_PROFILES, uid, 'projects', projectId, 'likes', userId);
  if (hasLiked) {
    await deleteDoc(likeRef);
  } else {
    await setDoc(likeRef, { userId, timestamp: serverTimestamp() });
  }
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function getWorkerReviewsPage({ uid, cursor = null, pageSize = 5 }) {
  if (!uid) return { items: [], cursor: null, hasMore: false };

  try {
    const constraints = [orderBy('timestamp', 'desc')];
    if (Number.isFinite(cursor)) {
      constraints.push(startAfter(Timestamp.fromMillis(cursor)));
    }
    constraints.push(limit(pageSize + 1));

    const q = query(
      collection(db, PUBLIC_WORKER_PROFILES, uid, 'reviews'),
      ...constraints
    );
    const snap = await getDocs(q);
    const hasMore = snap.docs.length > pageSize;
    const pageDocs = snap.docs.slice(0, pageSize);
    const lastTimestamp = pageDocs.at(-1)?.data()?.timestamp;

    return {
      items: pageDocs.map((d) => ({ id: d.id, ...d.data() })),
      cursor: typeof lastTimestamp?.toMillis === 'function' ? lastTimestamp.toMillis() : null,
      hasMore,
    };
  } catch (error) {
    return { items: [], cursor: null, hasMore: false };
  }
}

export async function getWorkerReviews(uid) {
  const page = await getWorkerReviewsPage({ uid });
  return page.items;
}

export async function addReview(workerUid, { rating, comment, userName, profession = 'General' }) {
  const reviewerId = auth.currentUser?.uid;
  if (!reviewerId) throw new Error('Sign in to leave a review');
  await setDoc(doc(db, PUBLIC_WORKER_PROFILES, workerUid, 'reviews', reviewerId), {
    userId: reviewerId,
    reviewerId,
    rating,
    priceRating: rating,
    workRating: rating,
    professionalismRating: rating,
    comment,
    userName,
    profession: String(profession || 'General').slice(0, 120),
    imageUrls: [],
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

function normalizeBlogCategory(category, isJobRequest) {
  const raw = String(category || '').trim();
  const lower = raw.toLowerCase();

  if (
    isJobRequest ||
    lower === 'job request' ||
    lower === 'job_request' ||
    raw === 'דרוש בעל מקצוע'
  ) {
    return 'request';
  }

  if (lower === 'tip' || raw === 'טיפ') return 'tip';
  if (lower === 'recommended' || lower === 'recommendation' || raw === 'מומלץ' || raw === 'موصى به') {
    return 'recommended';
  }
  if (lower === 'request' || raw === 'בקשה') return 'request';
  if (lower === 'question' || raw === 'שאלה') return 'question';

  return raw || 'request';
}

function getBlogPostTitle(data) {
  if (data.title) return data.title;
  if (data.professionLabel) return data.professionLabel;
  if (data.profession) {
    return String(data.profession)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }
  if (data.category) return String(data.category);
  if (data.content) return String(data.content).slice(0, 80);
  return 'Post';
}

function normalizeBlogLikes(data) {
  if (typeof data.likes === 'number') return data.likes;
  if (Array.isArray(data.likedBy)) return data.likedBy.length;
  if (data.likedBy && typeof data.likedBy.likes === 'number') return data.likedBy.likes;
  return 0;
}

function detectBlogMediaType(item) {
  const rawType = String(item?.type || '').trim().toLowerCase();
  if (rawType === 'video' || rawType === 'image') return rawType;

  const rawUrl = String(item?.url || '').trim().toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/.test(rawUrl)) return 'video';
  return 'image';
}

function normalizeBlogPostDocument(id, data) {
  const mediaTypes = Array.isArray(data.mediaTypes)
    ? data.mediaTypes
      .filter(function (item) { return item && item.url; })
      .map(function (item) {
        return {
          url: item.url,
          type: detectBlogMediaType(item),
        };
      })
    : Array.isArray(data.mediaItems)
      ? data.mediaItems
        .filter(function (item) { return item && item.url; })
        .map(function (item) {
          return {
            url: item.url,
            type: detectBlogMediaType(item),
          };
        })
    : [];
  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter(Boolean)
    : (data.imageUrl ? [data.imageUrl] : []);
  const imageUrl = data.imageUrl || imageUrls[0] || '';
  const normalizedMediaTypes = mediaTypes.length > 0
    ? mediaTypes
    : imageUrls.map(function (url) {
      return { url, type: 'image' };
    });
  const isJobRequest =
    data.isJobRequest === true ||
    String(data.category || '').trim().toLowerCase() === 'job request' ||
    data.category === 'דרוש בעל מקצוע';

  return {
    id,
    ...data,
    title: getBlogPostTitle(data),
    category: normalizeBlogCategory(data.category, isJobRequest),
    rawCategory: data.category || '',
    imageUrl: imageUrl || (normalizedMediaTypes[0] && normalizedMediaTypes[0].type === 'image' ? normalizedMediaTypes[0].url : ''),
    imageUrls,
    mediaTypes: normalizedMediaTypes,
    likes: normalizeBlogLikes(data),
    likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
    commentsCount: Number(data.commentsCount || 0),
    isJobRequest,
  };
}

function normalizeBlogCommentDocument(id, data) {
  const text = data.text || data.content || '';
  const quoteItems = Array.isArray(data.quoteItems) ? data.quoteItems : [];
  const bidPrice = Number(data.bidPrice);

  return {
    id,
    ...data,
    text,
    content: data.content || text,
    authorRole: data.authorRole || '',
    isBid: data.isBid === true,
    bidPrice: Number.isFinite(bidPrice) ? bidPrice : null,
    quoteItems,
    quoteUrl: data.quoteUrl || '',
  };
}

/**
 * Collection: blog_posts
 *   authorName  string
 *   authorUid   string
 *   category    string  ('tip' | 'request' | 'question')
 *   title       string
 *   content     string
 *   imageUrl    string
 *   imageUrls   string[]
 *   mediaTypes  { url: string, type: 'image' | 'video' }[]
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
  return snap.docs.map((d) => normalizeBlogPostDocument(d.id, d.data()));
}

export async function getBlogPostsPage({ cursor = null, pageSize = 12 } = {}) {
  const normalizedPageSize = Math.max(1, Math.min(Number(pageSize) || 12, 25));
  const constraints = [orderBy('timestamp', 'desc')];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(normalizedPageSize + 1));

  const snapshot = await getDocs(query(collection(db, 'blog_posts'), ...constraints));
  const hasMore = snapshot.docs.length > normalizedPageSize;
  const visibleDocs = snapshot.docs.slice(0, normalizedPageSize);

  return {
    posts: visibleDocs.map((postDoc) => normalizeBlogPostDocument(postDoc.id, postDoc.data())),
    cursor: visibleDocs[visibleDocs.length - 1] || null,
    hasMore,
  };
}

export async function createBlogPost({
  authorUid,
  authorName,
  title,
  content,
  category,
  profession = '',
  professionLabel = '',
  imageUrl = '',
  imageUrls = [],
  mediaTypes = [],
  location = '',
  locationLat = null,
  locationLng = null,
  requestDateFrom = '',
  requestDateTo = '',
  requestHourFrom = '',
  requestHourTo = '',
  isJobRequest = false,
}) {
  await addDoc(collection(db, 'blog_posts'), {
    authorUid,
    authorName,
    title,
    content,
    category,
    profession,
    professionLabel,
    imageUrl,
    imageUrls,
    mediaTypes,
    location,
    locationLat,
    locationLng,
    requestDateFrom,
    requestDateTo,
    requestHourFrom,
    requestHourTo,
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
  return normalizeBlogPostDocument(snap.id, snap.data());
}

export async function resolveBlogPost(postIdentifier) {
  const identifier = String(postIdentifier || '').trim();
  if (!identifier) return null;

  const exactPost = await getBlogPost(identifier);
  if (exactPost) return exactPost;

  const postId = getPostIdFromCommunitySlug(identifier);
  return postId ? getBlogPost(postId) : null;
}

export async function getBlogComments(postId) {
  if (!postId) return [];
  const q = query(
    collection(db, 'blog_posts', postId, 'blog_comments'),
    orderBy('timestamp', 'asc'),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeBlogCommentDocument(d.id, d.data()));
}

export async function createBlogComment({
  postId,
  authorUid,
  authorName,
  text,
  content = '',
  authorRole = '',
  bidPrice = null,
  isBid = false,
  quoteUrl = '',
  quoteItems = [],
}) {
  if (!postId) throw new Error('Missing post id');
  const normalizedText = String(text || content || '').trim();

  await addDoc(collection(db, 'blog_posts', postId, 'blog_comments'), {
    authorUid,
    authorName,
    authorRole,
    text: normalizedText,
    content: normalizedText,
    bidPrice: typeof bidPrice === 'number' && Number.isFinite(bidPrice) ? bidPrice : null,
    isBid: isBid === true,
    quoteUrl,
    quoteItems: Array.isArray(quoteItems) ? quoteItems : [],
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

function normalizeFirestoreTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
