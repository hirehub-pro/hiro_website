const DOCUMENT_TYPE_CODES = {
  invoice: '305',
  tax_invoice: '305',
  receipt: '400',
  invoice_receipt: '320',
  tax_invoice_receipt: '320',
  credit_note: '330',
};

export function normalizeDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeBusinessNumber(value) {
  return normalizeDigits(value).slice(0, 9);
}

export function normalizePhone(value) {
  return normalizeDigits(value).slice(0, 15);
}

export function padText(value, length) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').slice(0, length);
  return text.padEnd(length, ' ');
}

export function padNumber(value, length) {
  return normalizeDigits(value).slice(0, length).padStart(length, '0');
}

export function formatMoney(value, length = 12) {
  const amount = Math.round((Number(value) || 0) * 100);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${String(Math.abs(amount)).padStart(length - sign.length, '0')}`.slice(0, length);
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const text = String(value);
  if (/^\d{8}$/.test(text)) {
    const year = Number(text.slice(0, 4));
    const month = Number(text.slice(4, 6)) - 1;
    const day = Number(text.slice(6, 8));
    return new Date(year, month, day);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value) {
  const date = toDate(value) || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function formatTime(value) {
  const date = toDate(value) || new Date();
  return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
}

export function compactDateKey(value) {
  return formatDate(value);
}

export function mapDocumentType(value, bucket = '') {
  const raw = String(value || bucket || '').trim().toLowerCase();
  const normalized = raw === 'invoices'
    ? 'invoice'
    : raw === 'receipts'
      ? 'receipt'
      : raw === 'credit_notes'
        ? 'credit_note'
        : raw;
  return DOCUMENT_TYPE_CODES[normalized] || '';
}

export function normalizeDocumentType(value, bucket = '') {
  const raw = String(value || bucket || '').trim().toLowerCase();
  if (raw === 'invoices') return 'invoice';
  if (raw === 'receipts') return 'receipt';
  if (raw === 'credit_notes') return 'credit_note';
  return DOCUMENT_TYPE_CODES[raw] ? raw : '';
}

export function buildA000({ business, system, exportedAt, folderPath }) {
  return [
    'A000',
    padNumber(business.businessNumber, 9),
    padText(business.businessName, 50),
    padText(business.address, 50),
    padText(system.softwareName, 30),
    padText(system.softwareVersion, 10),
    padNumber(system.softwareRegistrationNumber, 9),
    formatDate(exportedAt),
    formatTime(exportedAt),
    padText(folderPath, 80),
  ].join('');
}

export function buildA100({ business, system, exportedAt }) {
  return [
    'A100',
    padNumber(business.businessNumber, 9),
    padText(business.businessName, 50),
    padText(business.address, 50),
    padText(system.softwareName, 30),
    padNumber(system.softwareRegistrationNumber, 9),
    formatDate(exportedAt),
    formatTime(exportedAt),
  ].join('');
}

export function buildB110({ business, system }) {
  return [
    'B110',
    padNumber(business.businessNumber, 9),
    padText(system.softwareMakerName, 40),
    padNumber(system.softwareMakerVatNumber, 9),
    padText(system.softwareVersion, 10),
  ].join('');
}

export function buildC100({ document }) {
  return [
    'C100',
    padText(document.documentNumber, 20),
    padText(document.invoiceDocId, 40),
    padNumber(document.documentTypeCode, 3),
    formatDate(document.date),
    padNumber(document.customerVatNumber, 9),
    padText(document.clientName, 50),
    padText(document.clientAddress, 50),
    normalizePhone(document.clientPhone).padEnd(15, ' '),
    formatMoney(document.subtotalBeforeTax),
    formatMoney(document.discountAmount),
    formatMoney(document.vatAmount),
    formatMoney(document.grandTotal),
  ].join('');
}

export function buildD110({ document, item, index }) {
  const quantity = Number(item?.quantity) || 1;
  const price = Number(item?.price ?? item?.unitPrice ?? item?.totalAmount ?? item?.lineSubtotal ?? 0);
  const lineTotal = Number(item?.totalAmount ?? item?.lineSubtotal ?? item?.amount ?? (price * quantity)) || 0;
  return [
    'D110',
    padText(document.documentNumber, 20),
    padNumber(index, 4),
    padText(item?.description || item?.name || 'Service', 60),
    formatMoney(quantity, 8),
    formatMoney(price),
    formatMoney(lineTotal),
  ].join('');
}

export function buildD120({ document, payment, index }) {
  return [
    'D120',
    padText(document.documentNumber, 20),
    padNumber(index, 4),
    padText(payment?.method || payment?.type || document.paymentMethod || 'cash', 20),
    formatMoney(payment?.amount ?? document.grandTotal),
    formatDate(payment?.date || document.date),
  ].join('');
}

export function buildZ900(recordCounts) {
  const total = Object.values(recordCounts).reduce((sum, value) => sum + value, 0) + 1;
  return ['Z900', padNumber(total, 10)].join('');
}

export function buildIniCountLine(recordType, count) {
  return [padText(recordType, 4), padNumber(count, 10)].join('');
}

