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
  endAt,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  getPostIdFromCommunitySlug,
  getUidFromProfileSlug,
  getUidPrefixFromProfileSlug,
} from './profile-routing';

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
      return 'Transaction Account';
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
  if (normalizedDocType === 'transaction_account') return `Transaction Account${suffix}`;

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
      return [{ bucket: 'invoices', docType: 'transaction_account' }];
    case 'invoice_receipt':
      return [
        { bucket: 'invoices', docType: 'invoice' },
        { bucket: 'receipts', docType: 'receipt' },
      ];
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
 * Rating sorting and geo-filtering are done client-side after Firestore returns
 * results so new workers without an avgRating field are still searchable.
 *
 * @param {{ profession?: string, lat?: number, lng?: number, radiusKm?: number }} opts
 * @returns {Promise<Array>}
 */
export async function searchWorkers({
  profession = null,
  professionTerms = [],
  lat = null,
  lng = null,
  radiusKm = 50,
} = {}) {
  const constraints = [where('role', '==', 'worker')];

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

  constraints.push(limit(100));

  const snapshot = await getDocs(query(collection(db, 'users'), ...constraints));
  let results = snapshot.docs.map((d) => normalizeUserDocument(d.id, d.data()));

  results = results.sort((a, b) => {
    const ratingDiff = (b.avgRating || 0) - (a.avgRating || 0);
    if (ratingDiff !== 0) return ratingDiff;

    const reviewDiff = (b.reviewCount || 0) - (a.reviewCount || 0);
    if (reviewDiff !== 0) return reviewDiff;

    return String(a.name || '').localeCompare(String(b.name || ''));
  });

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

export async function resolveUserProfile(profileIdentifier) {
  const identifier = String(profileIdentifier || '').trim();
  if (!identifier) return null;

  const exactProfile = await getUserProfile(identifier);
  if (exactProfile) return exactProfile;

  const slugUid = getUidFromProfileSlug(identifier);
  if (slugUid) {
    return getUserProfile(slugUid);
  }

  const uidPrefix = getUidPrefixFromProfileSlug(identifier);
  if (!uidPrefix) return null;

  const snapshot = await getDocs(query(
    collection(db, 'users'),
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
    status: String(data.status || '').trim().toLowerCase(),
    taxBranch: String(data.taxBranch || '').trim(),
    timestamp: data.timestamp || null,
    userId: String(data.userId || uid),
  };
}

export async function isBusinessIdInUseByAnotherUser(uid, businessId) {
  const rawBusinessId = String(businessId || '').trim();
  const normalizedBusinessId = normalizeBusinessId(businessId);
  if (!rawBusinessId || !normalizedBusinessId) return false;

  const normalizedQuery = query(
    collectionGroup(db, 'verification_info'),
    where('businessIdNormalized', '==', normalizedBusinessId),
    limit(10)
  );
  const exactQuery = query(
    collectionGroup(db, 'verification_info'),
    where('businessId', '==', rawBusinessId),
    limit(10)
  );

  const [normalizedSnapshot, exactSnapshot] = await Promise.all([
    getDocs(normalizedQuery),
    getDocs(exactQuery),
  ]);

  return [...normalizedSnapshot.docs, ...exactSnapshot.docs].some(
    (verificationDoc) => String(verificationDoc.data()?.userId || '').trim() !== String(uid || '').trim()
  );
}

export async function saveUserVerificationInfo(uid, verificationData) {
  if (!uid) throw new Error('Missing user id');

  const dealerType = String(verificationData?.dealerType || '').trim().toLowerCase();
  const businessId = String(verificationData?.businessId || '').trim();
  const businessIdNormalized = normalizeBusinessId(businessId);

  if (await isBusinessIdInUseByAnotherUser(uid, businessId)) {
    throw new Error('Business ID already in use');
  }

  const normalizedData = {
    address: String(verificationData?.address || '').trim(),
    businessId,
    businessIdNormalized,
    businessName: String(verificationData?.businessName || '').trim(),
    dealerType,
    legalAccepted: verificationData?.legalAccepted === true,
    accuracyAccepted: verificationData?.accuracyAccepted === true,
    responsibilityAccepted: verificationData?.responsibilityAccepted === true,
    status: String(verificationData?.status || 'pending').trim().toLowerCase(),
    userId: uid,
    timestamp: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', uid, 'verification_info', 'latest'), normalizedData, { merge: true });
  await setDoc(doc(db, 'users', uid), {
    dealerType,
    businessVerificationStatus: normalizedData.status,
  }, { merge: true });

  return normalizedData;
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
  await updateDoc(doc(db, 'users', uid), data);
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
  const counterId = getDocumentCounterId(normalizedDocType);

  await setDoc(doc(db, 'users', uid, 'counters', counterId), {
    docType: normalizedDocType,
    updatedAt: serverTimestamp(),
    value: normalizedStartNumber,
  }, { merge: true });

  return String(normalizedStartNumber);
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

export async function saveUserInvoice(uid, invoiceData) {
  if (!uid) throw new Error('Missing user id');

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

export async function addProject(uid, { description, imageUrl, media }) {
  await addDoc(collection(db, 'users', uid, 'projects'), {
    description,
    imageUrl,
    media: Array.isArray(media) ? media : [],
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
