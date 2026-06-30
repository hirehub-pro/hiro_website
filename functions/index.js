const admin = require('firebase-admin');
const crypto = require('crypto');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');

admin.initializeApp();

const TAX_AUTH_CLIENT_ID = defineSecret('TAX_AUTH_CLIENT_ID');
const TAX_AUTH_CLIENT_SECRET = defineSecret('TAX_AUTH_CLIENT_SECRET');

const TAX_FUNCTION_REGION = 'me-west1';
const TAX_AUTH_AUTHORIZE_URL = 'https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/authorize';
const TAX_AUTH_TOKEN_URL = 'https://openapi.taxes.gov.il/shaam/tsandbox/longtimetoken/oauth2/token';
const TAX_AUTH_ALLOCATION_URL = 'https://openapi.taxes.gov.il/shaam/tsandbox/Multi-invoices/v2/MultiApproval';
const TAX_AUTH_CALLBACK_URL = 'https://me-west1-hire-hub-fe6c4.cloudfunctions.net/taxesOAuthCallback';
const TAX_AUTH_ALLOWED_DEALER_TYPES = new Set(['licensed', 'company']);

function getAuthenticatedUid(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in before using the Tax Authority integration.');
  }
  return uid;
}

function normalizeNineDigitId(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function requireValidBusinessIdentity(uid, userData, verificationData) {
  const userApproved = userData?.isapproved === true;
  const verificationStatus = String(verificationData?.status || '').trim().toLowerCase();
  const dealerType = String(verificationData?.dealerType || verificationData?.dealertype || '').trim().toLowerCase();
  const businessId = normalizeNineDigitId(verificationData?.businessId || userData?.businessId);

  if (!userApproved) {
    throw new HttpsError('failed-precondition', 'Your Hiro account must be approved before connecting to the Tax Authority.');
  }

  if (verificationStatus !== 'approved') {
    throw new HttpsError('failed-precondition', 'Business verification must be approved before connecting to the Tax Authority.');
  }

  if (!TAX_AUTH_ALLOWED_DEALER_TYPES.has(dealerType)) {
    throw new HttpsError('failed-precondition', 'Only licensed dealers or companies can use Tax Authority invoice allocation.');
  }

  if (!/^\d{9}$/.test(businessId)) {
    throw new HttpsError('failed-precondition', 'Business ID must be exactly 9 digits.');
  }

  return {
    uid,
    businessId,
    dealerType,
    businessName: String(verificationData?.businessName || userData?.businessName || userData?.name || '').trim(),
  };
}

async function loadApprovedBusinessIdentity(uid) {
  const db = admin.firestore();
  const [userSnap, verificationSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`users/${uid}/verification_info/latest`).get(),
  ]);

  return requireValidBusinessIdentity(uid, userSnap.data() || {}, verificationSnap.data() || {});
}

async function exchangeToken(params) {
  const response = await fetch(TAX_AUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(params),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error('Tax Authority token request failed', { status: response.status, data });
    throw new HttpsError('internal', 'Tax Authority token request failed.', data);
  }

  return data;
}

function tokenExpiresAt(tokenData) {
  const expiresInSeconds = Number(tokenData?.expires_in || tokenData?.expiresIn || 0);
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return null;
  }
  return admin.firestore.Timestamp.fromMillis(Date.now() + expiresInSeconds * 1000);
}

async function getValidTaxAuthorityAccessToken(uid) {
  const tokenRef = admin.firestore().doc(`users/${uid}/tax_authority/oauth`);
  const tokenSnap = await tokenRef.get();
  const tokenData = tokenSnap.data() || {};
  const accessToken = tokenData.access_token || tokenData.accessToken;

  if (!accessToken) {
    throw new HttpsError('failed-precondition', 'Connect your Tax Authority account before requesting an allocation number.');
  }

  const expiresAtMs = tokenData.expiresAt?.toMillis?.() || 0;
  const hasUsableAccessToken = !expiresAtMs || expiresAtMs > Date.now() + 60000;
  if (hasUsableAccessToken) {
    return accessToken;
  }

  const refreshToken = tokenData.refresh_token || tokenData.refreshToken;
  if (!refreshToken) {
    throw new HttpsError('failed-precondition', 'Tax Authority connection expired. Reconnect your account.');
  }

  const refreshed = await exchangeToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: TAX_AUTH_CLIENT_ID.value(),
    client_secret: TAX_AUTH_CLIENT_SECRET.value(),
  });

  await tokenRef.set({
    ...refreshed,
    refresh_token: refreshed.refresh_token || refreshToken,
    connected: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: tokenExpiresAt(refreshed),
  }, { merge: true });

  return refreshed.access_token || refreshed.accessToken;
}

async function findInvoiceRef(uid, invoiceDocId) {
  const db = admin.firestore();
  const directRef = db.doc(`users/${uid}/invoices/${invoiceDocId}`);
  const directSnap = await directRef.get();
  if (directSnap.exists) {
    return directRef;
  }

  const matches = await db.collection(`users/${uid}/invoices`)
    .where('invoiceDocId', '==', invoiceDocId)
    .limit(1)
    .get();

  if (!matches.empty) {
    return matches.docs[0].ref;
  }

  return directRef;
}

async function getAllocationNumberMinAmountBeforeVat() {
  const systemSnap = await admin.firestore().doc('metadata/system').get();
  const minAmount = Number(systemSnap.data()?.allocationNumberMinAmountBeforeVat);
  if (!Number.isFinite(minAmount) || minAmount < 0) {
    return 0;
  }
  return minAmount;
}

function getAllocationNumber(data) {
  return String(
    data?.confirmationNumber ||
    data?.ConfirmationNumber ||
    data?.allocationNumber ||
    data?.AllocationNumber ||
    data?.taxAuthorityAllocationNumber ||
    data?.confirmation_number ||
    data?.message?.success?.[0]?.confirmation_number ||
    data?.message?.errors?.[0]?.confirmation_number ||
    ''
  ).trim();
}

function findTaxAuthorityResultItem(responseData, allocationRequest) {
  const invoiceId = allocationRequest?.invoices_list?.[0]?.invoice_id || null;
  const successItems = Array.isArray(responseData?.message?.success) ? responseData.message.success : [];
  const errorItems = Array.isArray(responseData?.message?.errors) ? responseData.message.errors : [];
  const successItem = successItems.find((item) => item?.invoice_id === invoiceId) || successItems[0] || null;
  const errorItem = errorItems.find((item) => item?.invoice_id === invoiceId) || errorItems[0] || null;

  return { invoiceId, successItem, errorItem };
}

function summarizeTaxAuthorityInvoiceError(errorItem) {
  const errors = Array.isArray(errorItem?.message?.errors) ? errorItem.message.errors : [];
  const messages = errors
    .map((error) => [error?.param, error?.message].filter(Boolean).join(': '))
    .filter(Boolean);

  return messages[0] || 'Tax Authority did not approve this invoice.';
}

function roundMoney(value) {
  const numberValue = Number(value) || 0;
  return Math.round(numberValue * 100) / 100;
}

function intOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

function stringOrNull(value, maxLength) {
  const stringValue = String(value || '').trim();
  if (!stringValue) {
    return null;
  }

  return maxLength ? stringValue.slice(0, maxLength) : stringValue;
}

function omitNullish(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined)
  );
}

function normalizeTaxAuthorityItem(item, index) {
  const quantity = Number(item?.quantity) || 1;
  const pricePerUnit = Number(item?.price_per_unit ?? item?.pricePerUnit ?? 0);
  const totalAmount = Number(item?.total_amount ?? item?.totalAmount ?? quantity * pricePerUnit);
  const vatRate = Number(item?.vat_rate ?? item?.vatRate ?? 0);
  const vatAmount = Number(item?.vat_amount ?? item?.vatAmount ?? totalAmount * (vatRate / 100));

  return omitNullish({
    index: Number.isInteger(Number(item?.index)) ? Number(item.index) : index + 1,
    catalog_id: stringOrNull(item?.catalog_id || item?.catalogId, 13),
    category: Number.isInteger(Number(item?.category)) ? Number(item.category) : 200000,
    description: stringOrNull(item?.description || 'Service', 30),
    measure_unit_description: stringOrNull(item?.measure_unit_description || item?.measureUnitDescription, 20),
    quantity: roundMoney(quantity),
    price_per_unit: roundMoney(pricePerUnit),
    discount: roundMoney(item?.discount),
    total_amount: roundMoney(totalAmount),
    vat_rate: roundMoney(vatRate),
    vat_amount: roundMoney(vatAmount),
  });
}

function normalizeTaxAuthorityAllocationRequest(invoice) {
  const vatNumber = Number(invoice?.vat_number);
  const paymentAmount = roundMoney(invoice?.payment_amount);
  const vatAmount = roundMoney(invoice?.vat_amount);
  const invoiceRequest = omitNullish({
    invoice_id: String(invoice?.invoice_id || '').trim(),
    invoice_type: Number(invoice?.invoice_type) || 305,
    vat_number: vatNumber,
    union_vat_number: intOrNull(invoice?.union_vat_number),
    authorized_company: intOrNull(invoice?.authorized_company),
    user_id: intOrNull(invoice?.user_id),
    user_name: stringOrNull(invoice?.user_name, 25),
    invoice_reference_number: String(invoice?.invoice_reference_number || invoice?.invoice_id || '').trim().slice(0, 20),
    customer_vat_number: Number(invoice?.customer_vat_number),
    customer_name: stringOrNull(invoice?.customer_name, 25),
    customer_country_code: stringOrNull(invoice?.customer_country_code, 3),
    invoice_date: String(invoice?.invoice_date || '').trim(),
    invoice_issuance_date: String(invoice?.invoice_issuance_date || invoice?.invoice_date || '').trim(),
    branch_id: stringOrNull(invoice?.branch_id, 7),
    accounting_software_number: Number(invoice?.accounting_software_number),
    client_software_key: stringOrNull(invoice?.client_software_key, 50),
    amount_before_discount: roundMoney(invoice?.amount_before_discount ?? paymentAmount),
    discount: roundMoney(invoice?.discount),
    payment_amount: paymentAmount,
    vat_amount: vatAmount,
    payment_amount_including_vat: roundMoney(invoice?.payment_amount_including_vat ?? paymentAmount + vatAmount),
    invoice_note: stringOrNull(invoice?.invoice_note, 100),
    action: Number.isInteger(Number(invoice?.action)) ? Number(invoice.action) : 0,
    delivery_address: stringOrNull(invoice?.delivery_address, 60),
    items: Array.isArray(invoice?.items)
      ? invoice.items.map((item, index) => normalizeTaxAuthorityItem(item, index))
      : undefined,
  });

  return {
    vat_number: vatNumber,
    union_vat_number: intOrNull(invoice?.union_vat_number),
    invoices_amount: 1,
    invoices_payment_amount: paymentAmount,
    invoices_vat_amount: vatAmount,
    invoices_list: [invoiceRequest],
  };
}

exports.createTaxAuthorityAuthorizationUrl = onCall({
  region: TAX_FUNCTION_REGION,
  secrets: [TAX_AUTH_CLIENT_ID],
}, async (request) => {
  const uid = getAuthenticatedUid(request);
  await loadApprovedBusinessIdentity(uid);

  const state = crypto.randomBytes(32).toString('hex');
  await admin.firestore().doc(`taxAuthorityOAuthStates/${state}`).set({
    uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
  });

  const authorizationUrl = new URL(TAX_AUTH_AUTHORIZE_URL);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', TAX_AUTH_CLIENT_ID.value());
  authorizationUrl.searchParams.set('redirect_uri', TAX_AUTH_CALLBACK_URL);
  authorizationUrl.searchParams.set('state', state);

  return { authorizationUrl: authorizationUrl.toString() };
});

exports.getTaxAuthorityConnectionStatus = onCall({
  region: TAX_FUNCTION_REGION,
}, async (request) => {
  const uid = getAuthenticatedUid(request);
  const identity = await loadApprovedBusinessIdentity(uid);
  const tokenSnap = await admin.firestore().doc(`users/${uid}/tax_authority/oauth`).get();
  const tokenData = tokenSnap.data() || {};
  const connected = tokenSnap.exists && tokenData.connected === true && Boolean(tokenData.access_token || tokenData.accessToken);

  return {
    connected,
    businessId: identity.businessId,
    dealerType: identity.dealerType,
    connectedAt: tokenData.connectedAt || null,
    updatedAt: tokenData.updatedAt || null,
  };
});

exports.requestTaxInvoiceAllocation = onCall({
  region: TAX_FUNCTION_REGION,
  secrets: [TAX_AUTH_CLIENT_ID, TAX_AUTH_CLIENT_SECRET],
}, async (request) => {
  const uid = getAuthenticatedUid(request);
  const identity = await loadApprovedBusinessIdentity(uid);
  const invoiceDocId = String(request.data?.invoiceDocId || '').trim();
  const invoice = request.data?.invoice || {};

  if (!invoiceDocId) {
    throw new HttpsError('invalid-argument', 'Missing invoiceDocId.');
  }

  if (normalizeNineDigitId(invoice.vat_number) !== identity.businessId) {
    throw new HttpsError('failed-precondition', 'Invoice VAT number must match your verified business ID.');
  }

  const amountBeforeVat = Number(invoice.payment_amount ?? invoice.amount_before_discount ?? 0);
  const minAmountBeforeVat = await getAllocationNumberMinAmountBeforeVat();
  if (amountBeforeVat <= minAmountBeforeVat) {
    throw new HttpsError(
      'failed-precondition',
      `Tax Authority allocation is available only when the invoice total before VAT is greater than ${minAmountBeforeVat}.`,
      { amountBeforeVat, minAmountBeforeVat }
    );
  }

  const accessToken = await getValidTaxAuthorityAccessToken(uid);
  const allocationRequest = normalizeTaxAuthorityAllocationRequest(invoice);
  const response = await fetch(TAX_AUTH_ALLOCATION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(allocationRequest),
  });

  const text = await response.text();
  let responseData = {};
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (error) {
    responseData = { raw: text };
  }

  if (!response.ok) {
    console.error('Tax Authority allocation request failed', { uid, invoiceDocId, status: response.status, responseData });
    throw new HttpsError('internal', 'Tax Authority invoice allocation failed.', responseData);
  }

  const { invoiceId, successItem, errorItem } = findTaxAuthorityResultItem(responseData, allocationRequest);
  if (!successItem || successItem.approved !== true) {
    console.error('Tax Authority allocation logical error', { uid, invoiceDocId, responseData });
    throw new HttpsError(
      'failed-precondition',
      summarizeTaxAuthorityInvoiceError(errorItem),
      responseData
    );
  }

  const confirmationNumber = getAllocationNumber(successItem) || getAllocationNumber(responseData);
  const result = {
    approved: true,
    confirmationNumber,
    invoiceId: successItem.invoice_id || responseData.invoiceId || responseData.invoice_id || invoiceId || invoiceDocId,
    transactionId: responseData.transactionId || responseData.transaction_id || '',
    response: responseData,
  };

  const invoiceRef = await findInvoiceRef(uid, invoiceDocId);
  await invoiceRef.set({
    taxAuthorityAllocation: result,
    allocationNumber: confirmationNumber,
    taxAuthorityAllocationNumber: confirmationNumber,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return result;
});

exports.taxesOAuthCallback = onRequest({
  region: TAX_FUNCTION_REGION,
  secrets: [TAX_AUTH_CLIENT_ID, TAX_AUTH_CLIENT_SECRET],
}, async (request, response) => {
  try {
    const code = String(request.query.code || '').trim();
    const state = String(request.query.state || '').trim();

    if (!code || !state) {
      response.status(400).send('Missing OAuth code or state.');
      return;
    }

    const stateRef = admin.firestore().doc(`taxAuthorityOAuthStates/${state}`);
    const stateSnap = await stateRef.get();
    const stateData = stateSnap.data() || {};
    const uid = stateData.uid;
    const expiresAtMs = stateData.expiresAt?.toMillis?.() || 0;

    if (!stateSnap.exists || !uid || expiresAtMs < Date.now()) {
      response.status(400).send('OAuth state is invalid or expired.');
      return;
    }

    await loadApprovedBusinessIdentity(uid);

    const tokenData = await exchangeToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: TAX_AUTH_CALLBACK_URL,
      client_id: TAX_AUTH_CLIENT_ID.value(),
      client_secret: TAX_AUTH_CLIENT_SECRET.value(),
    });

    await admin.firestore().doc(`users/${uid}/tax_authority/oauth`).set({
      ...tokenData,
      connected: true,
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: tokenExpiresAt(tokenData),
    }, { merge: true });
    await stateRef.delete();

    response.status(200).send(`
      <!doctype html>
      <html>
        <head><title>Tax Authority connected</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 32px;">
          <h1>Tax Authority connected</h1>
          <p>You can close this window and return to Hiro.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Tax Authority OAuth callback failed', error);
    response.status(500).send('Tax Authority connection failed.');
  }
});

exports.sendNotificationPush = onDocumentCreated('users/{userId}/notifications/{notificationId}', async (event) => {
  const notification = event.data && event.data.data();
  if (!notification) return;

  console.log('sendNotificationPush triggered', {
    userId: event.params.userId,
    notificationId: event.params.notificationId,
    notification,
  });

  const userRef = admin.firestore().doc(`users/${event.params.userId}`);
  const deviceTokensRef = admin.firestore().collection(`users/${event.params.userId}/deviceTokens`);
  const [userSnap, deviceTokensSnap] = await Promise.all([
    userRef.get(),
    deviceTokensRef.get(),
  ]);

  const userData = userSnap.data() || {};
  const docTokens = [
    ...(Array.isArray(userData.fcmTokens) ? userData.fcmTokens : []),
    userData.fcmToken,
  ].filter(Boolean);

  const subcollectionTokens = deviceTokensSnap.docs
    .map((tokenDoc) => tokenDoc.data()?.token)
    .filter(Boolean);

  const tokens = Array.from(new Set([
    ...docTokens,
    ...subcollectionTokens,
  ]));

  console.log('tokens found', { tokens });

  if (tokens.length === 0) {
    console.log('no tokens, skipping send');
    return;
  }

  const title = notification.title || 'Hiro';
  const body = notification.message || 'You have a new notification.';
  const url = notification.url || '/messages';

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      url,
      type: notification.type || 'notification',
      roomId: notification.roomId || '',
      notificationId: event.params.notificationId,
    },
    webpush: {
      fcmOptions: {
        link: url,
      },
      notification: {
        title,
        body,
        icon: '/favicon.ico',
      },
    },
    android: {
      priority: 'high',
      notification: {
        title,
        body,
        channelId: 'default',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'default',
          badge: 1,
        },
      },
    },
  });

  console.log('sendEachForMulticast response', response);
});
