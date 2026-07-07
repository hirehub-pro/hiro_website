import { jsPDF } from 'jspdf';
import {
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  buildA000,
  buildA100,
  buildB110,
  buildC100,
  buildD110,
  buildD120,
  buildIniCountLine,
  buildZ900,
  compactDateKey,
  formatDate,
  formatTime,
  mapDocumentType,
  normalizeBusinessNumber,
  normalizeDocumentType,
} from './bkmvDelimitedGenerator';

const EXPORT_BUCKETS = ['invoices', 'receipts', 'credit_notes'];
const CRLF = '\r\n';
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const PRINTED_SUMMARY_DOCUMENT_TYPES = [
  ['100', 'הזמנה'],
  ['200', 'תעודת משלוח'],
  ['205', 'תעודת משלוח סוכן'],
  ['210', 'תעודת החזרה'],
  ['300', 'חשבונית/חשבונית עסקה'],
  ['305', 'חשבונית-מס'],
  ['310', 'חשבונית ריכוז'],
  ['320', 'חשבונית מס / קבלה'],
  ['330', 'חשבונית מס זיכוי'],
  ['340', 'חשבונית סיום'],
  ['345', 'חשבונית סוכן'],
  ['400', 'קבלה'],
  ['405', 'קבלה על תרומות'],
  ['406', 'קבלה לפיקדון'],
  ['410', 'יציאה מקופה'],
  ['420', 'הפקדת בנק'],
  ['500', 'הזמנת רכש'],
  ['600', 'תעודת משלוח רכש'],
  ['610', 'החזר רכש'],
  ['700', 'חשבונית מס רכש'],
  ['710', 'זיכוי רכש'],
  ['800', 'יומן פקודות'],
  ['810', 'כניסה כללית למלאי'],
  ['820', 'יציאה כללית ממלאי'],
  ['830', 'העברה בין מחסנים'],
  ['840', 'עדכון בעקבות ספירה'],
  ['900', 'דוח ייצור-כניסה'],
  ['910', 'דוח ייצור-יציאה'],
];

class BkmvExportError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BkmvExportError';
    this.code = code;
  }
}

function valueFrom(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function numberFrom(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return Number(value) || 0;
}

function stampParts(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return {
    yy,
    folderStamp: `${MM}${dd}${HH}${mm}`,
    fileStamp: `${yyyy}${MM}${dd}_${HH}${mm}`,
  };
}

function normalizeSystemMetadata(data = {}) {
  const appName = String(data.appName || '').trim();
  return {
    softwareVersion: String(data.minRequiredVersion || '1.0.0').trim(),
    softwareRegistrationNumber: String(data.softwareRegistrationNumber || '').trim(),
    softwareMakerVatNumber: String(data.softwareMakerVatNumber || '').trim(),
    softwareMakerName: String(data.softwareMakerName || appName || 'hiro').trim(),
    softwareName: appName || 'hiro',
  };
}

function normalizeBusinessData(verificationData = {}, userData = {}) {
  const businessNumber = normalizeBusinessNumber(
    valueFrom(verificationData.businessId, verificationData.businessNumber, userData.businessId, userData.businessNumber)
  );
  const businessName = String(valueFrom(verificationData.businessName, userData.businessName, userData.name) || '').trim();
  const address = String(valueFrom(verificationData.address, userData.address, userData.city) || '').trim();

  if (!businessNumber || !businessName) {
    throw new BkmvExportError('Missing business export details', 'missing-business-details');
  }

  return { businessNumber, businessName, address };
}

async function loadBusiness(uid) {
  const [verificationSnap, userSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'verification_info', 'latest')),
    getDoc(doc(db, 'users', uid)),
  ]);
  return normalizeBusinessData(
    verificationSnap.exists() ? verificationSnap.data() : {},
    userSnap.exists() ? userSnap.data() : {}
  );
}

async function loadSystem() {
  const systemSnap = await getDoc(doc(db, 'metadata', 'system'));
  return normalizeSystemMetadata(systemSnap.exists() ? systemSnap.data() : {});
}

async function loadInvoice(uid, invoiceDocId) {
  if (!invoiceDocId) return {};
  const invoiceSnap = await getDoc(doc(db, 'users', uid, 'invoices', invoiceDocId));
  return invoiceSnap.exists() ? invoiceSnap.data() : {};
}

function buildDedupKey(snapshot, data) {
  const invoiceDocId = String(data.invoiceDocId || '').trim();
  const counter = String(data.counter || '').trim();
  if (invoiceDocId || counter) {
    return [data.userId || '', data.bucket || '', invoiceDocId, counter].join('|');
  }
  return snapshot.ref.path;
}

function normalizeClientDetails(logData = {}, invoiceData = {}) {
  const clientDetails = logData.clientDetails && typeof logData.clientDetails === 'object'
    ? logData.clientDetails
    : {};
  return {
    clientName: String(valueFrom(clientDetails.name, logData.clientName, invoiceData.clientName) || '').trim(),
    clientAddress: String(valueFrom(clientDetails.address, logData.clientAddress, invoiceData.clientAddress) || '').trim(),
    clientPhone: String(valueFrom(clientDetails.phone, logData.clientPhone, invoiceData.clientPhone) || '').trim(),
    customerVatNumber: String(valueFrom(
      clientDetails.customerVatNumber,
      clientDetails.vatNumber,
      logData.customerVatNumber,
      invoiceData.customerVatNumber,
      invoiceData.customerId,
      invoiceData.clientTaxId
    ) || '').trim(),
  };
}

function normalizeItems(logData = {}, invoiceData = {}) {
  const items = Array.isArray(logData.items) && logData.items.length > 0
    ? logData.items
    : Array.isArray(invoiceData.items)
      ? invoiceData.items
      : [];
  return items.length > 0 ? items : [{ description: logData.name || invoiceData.name || 'Document', quantity: 1, totalAmount: numberFrom(logData.subtotalBeforeTax, invoiceData.amount) }];
}

function normalizePayments(logData = {}, invoiceData = {}) {
  const payments = Array.isArray(logData.payments) && logData.payments.length > 0
    ? logData.payments
    : Array.isArray(invoiceData.payments) && invoiceData.payments.length > 0
      ? invoiceData.payments
      : Array.isArray(invoiceData.paymentMethods) && invoiceData.paymentMethods.length > 0
        ? invoiceData.paymentMethods
        : [];
  if (payments.length > 0) return payments;
  return [{ method: invoiceData.paymentMethod || logData.paymentMethod || 'cash', amount: numberFrom(logData.grandTotal, invoiceData.amount) }];
}

function normalizeDocument(snapshot, logData, invoiceData) {
  const bucket = String(logData.bucket || '').trim().toLowerCase();
  const rawType = valueFrom(logData.docType, invoiceData.docType, invoiceData.type, logData.type, bucket);
  const documentTypeCode = mapDocumentType(rawType, bucket);
  const normalizedType = normalizeDocumentType(rawType, bucket);
  if (!documentTypeCode || !normalizedType) return null;

  const invoiceDocId = String(valueFrom(logData.invoiceDocId, invoiceData.invoiceDocId, snapshot.id) || '').trim();
  const documentNumber = String(valueFrom(logData.documentNumber, logData.counter, invoiceData.invoiceNumber, invoiceDocId, snapshot.id) || '').trim();
  const documentDate = valueFrom(logData.date, logData.issueDate, invoiceData.date, invoiceData.issueDate, invoiceData.createdAt, logData.timestamp);
  const grandTotal = numberFrom(logData.grandTotal, logData.subtotalAfterTax, invoiceData.grandTotal, invoiceData.total, invoiceData.amount, logData.amount);
  const vatAmount = numberFrom(logData.vatAmount, invoiceData.vatAmount);
  const subtotalBeforeTax = numberFrom(logData.subtotalBeforeTax, invoiceData.subtotalBeforeTax, grandTotal - vatAmount, invoiceData.amount);
  const discountAmount = numberFrom(logData.discountAmount, invoiceData.discountAmount);

  return {
    path: snapshot.ref.path,
    bucket,
    normalizedType,
    documentTypeCode,
    invoiceDocId,
    documentNumber,
    date: documentDate,
    subtotalBeforeTax,
    discountAmount,
    vatAmount,
    grandTotal,
    ...normalizeClientDetails(logData, invoiceData),
    items: normalizeItems(logData, invoiceData),
    payments: normalizePayments(logData, invoiceData),
    paymentMethod: invoiceData.paymentMethod || logData.paymentMethod || 'cash',
  };
}

async function loadDocuments(uid, fromDate, toDate) {
  const fromKey = compactDateKey(fromDate);
  const toKey = compactDateKey(toDate);
  const filesQuery = query(
    collectionGroup(db, 'files'),
    where('bucket', 'in', EXPORT_BUCKETS),
    where('userId', '==', uid),
    where('date', '>=', fromKey),
    where('date', '<=', toKey),
    orderBy('date'),
    orderBy('timestamp')
  );
  const snapshot = await getDocs(filesQuery);
  const seen = new Set();
  const documents = [];

  for (const fileDoc of snapshot.docs) {
    const logData = fileDoc.data();
    const key = buildDedupKey(fileDoc, logData);
    if (seen.has(key)) continue;
    seen.add(key);

    const invoiceData = await loadInvoice(uid, String(logData.invoiceDocId || '').trim());
    const documentData = normalizeDocument(fileDoc, logData, invoiceData);
    if (documentData) documents.push(documentData);
  }

  if (documents.length === 0) {
    throw new BkmvExportError('No documents found in the selected date range', 'no-documents');
  }

  return documents;
}

function buildBkmvData({ business, system, documents, exportedAt }) {
  const lines = [];
  const counts = { A100: 0, B110: 0, C100: 0, D110: 0, D120: 0 };

  lines.push(buildA100({ business, system, exportedAt }));
  counts.A100 += 1;
  lines.push(buildB110({ business, system }));
  counts.B110 += 1;

  documents.forEach((documentData) => {
    lines.push(buildC100({ document: documentData }));
    counts.C100 += 1;

    if (documentData.normalizedType !== 'receipt') {
      documentData.items.forEach((item, index) => {
        lines.push(buildD110({ document: documentData, item, index: index + 1 }));
        counts.D110 += 1;
      });
    }

    if (documentData.normalizedType === 'receipt' || documentData.normalizedType.includes('receipt')) {
      documentData.payments.forEach((payment, index) => {
        lines.push(buildD120({ document: documentData, payment, index: index + 1 }));
        counts.D120 += 1;
      });
    }
  });

  const z900 = buildZ900(counts);
  lines.push(z900);
  counts.Z900 = 1;

  return { text: `${lines.join(CRLF)}${CRLF}`, counts };
}

function buildIni({ business, system, exportedAt, folderPath, counts }) {
  const lines = [
    buildA000({ business, system, exportedAt, folderPath }),
    buildIniCountLine('B110', counts.B110 || 0),
    buildIniCountLine('C100', counts.C100 || 0),
    buildIniCountLine('D110', counts.D110 || 0),
    buildIniCountLine('D120', counts.D120 || 0),
  ];
  return `${lines.join(CRLF)}${CRLF}`;
}

function summarizeDocuments(documents) {
  return documents.reduce((rows, documentData) => {
    const key = documentData.documentTypeCode;
    if (!rows[key]) {
      rows[key] = { documentType: key, quantity: 0, total: 0 };
    }
    rows[key].quantity += 1;
    rows[key].total += Number(documentData.grandTotal) || 0;
    return rows;
  }, {});
}

function formatIsraeliShortDate(value) {
  const dateText = formatDate(value);
  return `${dateText.slice(6, 8)}/${dateText.slice(4, 6)}/${dateText.slice(2, 4)}`;
}

function formatIsraeliDateTime(value) {
  return `${formatIsraeliShortDate(value)} ${formatTime(value).replace(/^(\d{2})(\d{2})$/, '$1:$2')}`;
}

function formatSummaryAmount(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addPdfTable(doc, rows, startY, columns) {
  let y = startY;
  columns.forEach((column, index) => doc.text(column.label, column.x, y));
  y += 8;
  rows.forEach((row) => {
    columns.forEach((column) => doc.text(String(column.value(row)), column.x, y));
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });
  return y;
}

function makeCrcTable() {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function uint32(value) {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function encodeText(value) {
  if (!textEncoder) {
    throw new BkmvExportError('ZIP generation is not supported in this browser', 'zip-unsupported');
  }
  return textEncoder.encode(value);
}

async function entryBytes(entry) {
  if (entry.content instanceof Blob) {
    return new Uint8Array(await entry.content.arrayBuffer());
  }
  if (entry.content instanceof Uint8Array) {
    return entry.content;
  }
  return encodeText(entry.content);
}

async function buildZipBlob(entries) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  const modified = dosDateTime(new Date());

  for (const entry of entries) {
    const nameBytes = encodeText(entry.name);
    const dataBytes = await entryBytes(entry);
    const checksum = crc32(dataBytes);
    const localHeader = new Uint8Array([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0x0800),
      ...uint16(0),
      ...uint16(modified.time),
      ...uint16(modified.date),
      ...uint32(checksum),
      ...uint32(dataBytes.length),
      ...uint32(dataBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
    ]);

    chunks.push(localHeader, nameBytes, dataBytes);
    centralDirectory.push({
      nameBytes,
      checksum,
      size: dataBytes.length,
      offset,
    });
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralStart = offset;
  centralDirectory.forEach((entry) => {
    const header = new Uint8Array([
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0x0800),
      ...uint16(0),
      ...uint16(modified.time),
      ...uint16(modified.date),
      ...uint32(entry.checksum),
      ...uint32(entry.size),
      ...uint32(entry.size),
      ...uint16(entry.nameBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(entry.offset),
    ]);
    chunks.push(header, entry.nameBytes);
    offset += header.length + entry.nameBytes.length;
  });

  const centralSize = offset - centralStart;
  chunks.push(new Uint8Array([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(centralDirectory.length),
    ...uint16(centralDirectory.length),
    ...uint32(centralSize),
    ...uint32(centralStart),
    ...uint16(0),
  ]));

  return new Blob(chunks, { type: 'application/zip' });
}

async function renderHtmlPagesToPdf(pageHtml) {
  if (typeof document === 'undefined') {
    throw new BkmvExportError('PDF rendering is only available in the browser', 'pdf-rendering-unavailable');
  }

  const { default: html2canvas } = await import('html2canvas');
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.innerHTML = pageHtml;
  document.body.appendChild(wrapper);

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pages = Array.from(wrapper.querySelectorAll('.bkmv-print-page'));

    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await html2canvas(pages[index], {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const imageData = canvas.toDataURL('image/jpeg', 0.98);
      if (index > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297);
    }

    return pdf.output('blob');
  } finally {
    wrapper.remove();
  }
}

async function buildPrintedSummaryPdf({ business, system, fromDate, toDate, exportedAt, documents }) {
  const summaryByType = summarizeDocuments(documents);
  const totalQuantity = documents.length;
  const totalAmount = documents.reduce((sum, documentData) => sum + (Number(documentData.grandTotal) || 0), 0);
  const dateRange = `${formatIsraeliShortDate(fromDate)}-${formatIsraeliShortDate(toDate)}`;
  const businessName = escapeHtml(business.businessName);
  const businessNumber = escapeHtml(business.businessNumber);
  const softwareName = escapeHtml(system.softwareName);
  const registrationNumber = escapeHtml(system.softwareRegistrationNumber || business.businessNumber);
  const tableRows = PRINTED_SUMMARY_DOCUMENT_TYPES.map(([code, label]) => {
    const summary = summaryByType[code] || { quantity: 0, total: 0 };
    return `
      <tr>
        <td class="code">${code}</td>
        <td class="label">${escapeHtml(label)}</td>
        <td class="quantity">${summary.quantity || 0}</td>
        <td class="amount">${formatSummaryAmount(summary.total)}</td>
      </tr>
    `;
  }).join('');
  const html = `
    <style>
      .bkmv-print-page {
        box-sizing: border-box;
        width: 794px;
        height: 1123px;
        padding: 44px 38px;
        background: #ffffff;
        color: #222222;
        direction: rtl;
        font-family: Arial, "Helvetica Neue", sans-serif;
        font-size: 15px;
      }
      .bkmv-title {
        margin: 0;
        text-align: right;
        font-size: 19px;
        font-weight: 400;
        line-height: 1.35;
      }
      .bkmv-subtitle {
        margin: 2px 0 12px;
        text-align: right;
        font-size: 13px;
        line-height: 1.35;
      }
      .bkmv-summary-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        direction: rtl;
      }
      .bkmv-summary-table th,
      .bkmv-summary-table td {
        border: 1px solid #666666;
        padding: 7px 10px;
        vertical-align: middle;
        font-size: 15px;
        line-height: 1.2;
      }
      .bkmv-summary-table th {
        background: #eeeeee;
        font-weight: 400;
        text-align: center;
      }
      .bkmv-summary-table .code {
        width: 14%;
        text-align: left;
      }
      .bkmv-summary-table .label {
        width: 38%;
        text-align: right;
      }
      .bkmv-summary-table .quantity {
        width: 20%;
        text-align: left;
      }
      .bkmv-summary-table .amount {
        width: 28%;
        text-align: left;
      }
      .bkmv-page-two {
        padding-top: 42px;
      }
      .bkmv-page-two-grid {
        display: grid;
        grid-template-columns: 1fr 170px;
        column-gap: 40px;
        width: 360px;
        margin-right: auto;
        text-align: right;
        font-size: 15px;
        line-height: 1.7;
      }
      .bkmv-page-two-grid .value {
        text-align: center;
      }
    </style>
    <section class="bkmv-print-page">
      <h1 class="bkmv-title">פלט מודפס לפי המבנה הנדרש בסעיף 2.6</h1>
      <p class="bkmv-subtitle">${businessName} | ${dateRange} | ח.פ. ${businessNumber}</p>
      <table class="bkmv-summary-table">
        <thead>
          <tr>
            <th>מספר המסמך</th>
            <th>סוג המסמך</th>
            <th>סה"כ כמות</th>
            <th>סה"כ כספי כולל מע"מ<br>(שדה 1223)</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </section>
    <section class="bkmv-print-page bkmv-page-two">
      <div class="bkmv-page-two-grid">
        <div>סה"כ כמות:</div>
        <div class="value">${totalQuantity}</div>
        <div>סה"כ כספי:</div>
        <div class="value">${formatSummaryAmount(totalAmount)}</div>
        <div>הנתונים הופקו באמצעות תוכנת</div>
        <div class="value">${softwareName}</div>
        <div>מספר תעודת רישום:</div>
        <div class="value">${registrationNumber}</div>
        <div>תאריך הפקה:</div>
        <div class="value">${formatIsraeliDateTime(exportedAt)}</div>
      </div>
    </section>
  `;

  return renderHtmlPagesToPdf(html);
}

function buildAnnexPdf({ business, system, fromDate, toDate, exportedAt, folderPath, counts }) {
  const doc = new jsPDF();
  const rows = Object.entries(counts)
    .filter(([recordType]) => recordType !== 'A100' && recordType !== 'Z900')
    .map(([recordType, quantity]) => ({ recordType, quantity }));
  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  doc.setFontSize(16);
  doc.text('BKMV Annex 4 - Section 5.4', 14, 18);
  doc.setFontSize(10);
  doc.text(`Business: ${business.businessName}`, 14, 32);
  doc.text(`Business number: ${business.businessNumber}`, 14, 40);
  doc.text(`Software: ${system.softwareName}`, 14, 48);
  doc.text(`Registration number: ${system.softwareRegistrationNumber || '-'}`, 14, 56);
  doc.text(`Folder: ${folderPath}`, 14, 64);
  doc.text(`Date range: ${formatDate(fromDate)} - ${formatDate(toDate)}`, 14, 72);
  doc.text(`Exported: ${formatDate(exportedAt)} ${formatTime(exportedAt)}`, 14, 80);
  const y = addPdfTable(doc, rows, 96, [
    { label: 'Record type', x: 14, value: (row) => row.recordType },
    { label: 'Quantity', x: 74, value: (row) => row.quantity },
  ]);
  doc.text(`Total records: ${total}`, 14, y + 8);
  return doc.output('blob');
}

function buildZip({ bkmvText, iniText, folderPath, printedSummaryName, printedSummaryBlob, annex4Name, annex4Blob }) {
  return buildZipBlob([
    { name: `${folderPath}/BKMVDATA.txt`, content: bkmvText },
    { name: `${folderPath}/INI.txt`, content: iniText },
    { name: printedSummaryName, content: printedSummaryBlob },
    { name: annex4Name, content: annex4Blob },
  ]);
}

export const BkmvExportService = {
  async exportForUser({ user, fromDate, toDate }) {
    if (!user?.uid || user.isAnonymous) {
      throw new BkmvExportError('Sign in is required to generate uniform files', 'auth-required');
    }

    const exportedAt = new Date();
    const [business, system, documents] = await Promise.all([
      loadBusiness(user.uid),
      loadSystem(),
      loadDocuments(user.uid, fromDate, toDate),
    ]);
    const stamps = stampParts(exportedAt);
    const businessFolder = `${business.businessNumber.slice(0, 8)}.${stamps.yy}`;
    const folderPath = `OPENFRMT/${businessFolder}/${stamps.folderStamp}`;
    const zipName = `OPENFRMT_${stamps.fileStamp}.zip`;
    const printedSummaryName = `BKMV_printed_summary_${stamps.fileStamp}.pdf`;
    const annex4Name = `BKMV_annex_4_${stamps.fileStamp}.pdf`;
    const { text: bkmvText, counts } = buildBkmvData({ business, system, documents, exportedAt });
    const iniText = buildIni({ business, system, exportedAt, folderPath, counts });
    const [printedSummaryBlob, annex4Blob] = await Promise.all([
      Promise.resolve(buildPrintedSummaryPdf({ business, system, fromDate, toDate, exportedAt, documents })),
      Promise.resolve(buildAnnexPdf({ business, system, fromDate, toDate, exportedAt, folderPath, counts })),
    ]);
    const zipBlob = await buildZip({
      bkmvText,
      iniText,
      folderPath,
      printedSummaryName,
      printedSummaryBlob,
      annex4Name,
      annex4Blob,
    });

    return {
      hasFiles: true,
      packages: [{
        userId: user.uid,
        businessName: business.businessName,
        businessNumber: business.businessNumber,
        directory: folderPath,
        bkmvFile: `${folderPath}/BKMVDATA.txt`,
        iniFile: `${folderPath}/INI.txt`,
        printedSummaryPdf: printedSummaryName,
        annex4Pdf: annex4Name,
      }],
      zipFile: zipName,
      warnings: [],
      files: [
        { name: zipName, blob: zipBlob, type: 'application/zip' },
      ],
    };
  },
};

export { BkmvExportError };
