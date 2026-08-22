const DOCUMENT_TYPE_CODES = {
  invoice: '305',
  tax_invoice: '305',
  transaction_account: '300',
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
  const text = cleanFixedText(value).slice(0, length);
  return text.padEnd(length, ' ');
}

export function padNumber(value, length) {
  return normalizeDigits(value).slice(-length).padStart(length, '0');
}

function cleanFixedText(value) {
  return String(value ?? '')
    .replace(/[\r\n|]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixedAlpha(value, length) {
  return cleanFixedText(value).slice(0, length).padEnd(length, ' ');
}

function fixedNumeric(value, length, options = {}) {
  const digits = normalizeDigits(value);
  if (options.required && !digits) {
    throw new Error(options.message || 'Missing required numeric value');
  }
  if (options.strict && digits.length > length) {
    throw new Error(options.message || `Numeric value is longer than ${length} digits`);
  }
  return digits.slice(-length).padStart(length, '0');
}

function parseAddress(address) {
  const cleaned = cleanFixedText(address);
  if (!cleaned) {
    return { street: '', houseNumber: '', city: '', postalCode: '' };
  }

  const postalMatch = cleaned.match(/(?:^|\s)(\d{5,8})$/);
  const postalCode = postalMatch ? postalMatch[1] : '';
  const withoutPostal = postalCode
    ? cleaned.slice(0, cleaned.lastIndexOf(postalCode)).replace(/[,\s]+$/, '')
    : cleaned;
  const parts = withoutPostal.split(',').map((part) => part.trim()).filter(Boolean);
  const streetPart = parts[0] || withoutPostal;
  const city = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const houseMatch = streetPart.match(/^(.*?)[\s,]+(\d+[א-תA-Za-z/-]*)$/);

  return {
    street: houseMatch ? houseMatch[1].trim() : streetPart,
    houseNumber: houseMatch ? houseMatch[2].trim() : '',
    city,
    postalCode,
  };
}

function assertFixedLength(value, length, label) {
  if (value.length !== length) {
    throw new Error(`${label} must be exactly ${length} characters, got ${value.length}`);
  }
  return value;
}

export function formatMoney(value, length = 12) {
  const amount = Math.round((Number(value) || 0) * 100);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${String(Math.abs(amount)).padStart(length - sign.length, '0')}`.slice(0, length);
}

function signedAmount(value, wholeDigits = 12, decimalDigits = 2) {
  const multiplier = 10 ** decimalDigits;
  const scaled = Math.round((Number(value) || 0) * multiplier);
  const sign = scaled < 0 ? '-' : '+';
  return `${sign}${String(Math.abs(scaled)).padStart(wholeDigits + decimalDigits, '0')}`;
}

function stableLinkId(...values) {
  const text = values.map((value) => cleanFixedText(value)).join('|');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) % 10000000;
  }
  return String(hash || 1).padStart(7, '0');
}

function paymentTypeCode(payment) {
  const raw = cleanFixedText(payment?.method || payment?.type || '').toLowerCase();
  if (/cash|מזומן/.test(raw)) return '1';
  if (/cheque|check|צ'ק|שיק/.test(raw)) return '2';
  if (/credit|card|אשראי/.test(raw)) return '3';
  if (/bank|transfer|העברה|בנק/.test(raw)) return '4';
  return '9';
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
        : raw === 'transaction_account'
          ? 'transaction_account'
        : raw;
  return DOCUMENT_TYPE_CODES[normalized] || '';
}

export function normalizeDocumentType(value, bucket = '') {
  const raw = String(value || bucket || '').trim().toLowerCase();
  if (raw === 'invoices') return 'invoice';
  if (raw === 'receipts') return 'receipt';
  if (raw === 'credit_notes') return 'credit_note';
  if (raw === 'transaction_account') return 'transaction_account';
  return DOCUMENT_TYPE_CODES[raw] ? raw : '';
}

export function buildExportMainId({ businessNumber, exportedAt }) {
  return `${String(toDate(exportedAt)?.getTime() || Date.now())}${normalizeDigits(businessNumber).slice(-2)}`.slice(-15);
}

export function buildA000({
  business,
  system,
  exportedAt,
  fromDate,
  toDate: exportToDate,
  totalBkmvRecords,
  mainId,
}) {
  const address = parseAddress(business.address);
  const businessNumber = business.businessNumber;
  const softwareName = system.softwareName || system.appName || 'hiro';
  const softwareMakerName = system.softwareMakerName || system.appName || 'hiro';
  const line = [
    fixedAlpha('A000', 4),
    fixedAlpha('', 5),
    fixedNumeric(totalBkmvRecords, 15),
    fixedNumeric(businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric(mainId, 15),
    fixedAlpha('&OF1.31&', 8),
    fixedNumeric(system.softwareRegistrationNumber, 8),
    fixedAlpha(softwareName, 20),
    fixedAlpha(system.softwareVersion || '1.0.0', 20),
    fixedNumeric(system.softwareMakerVatNumber, 9),
    fixedAlpha(softwareMakerName, 20),
    fixedNumeric(2, 1),
    fixedAlpha('', 50),
    fixedNumeric(0, 1),
    fixedNumeric(0, 1),
    fixedNumeric(businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric('', 9),
    fixedAlpha('', 10),
    fixedAlpha(business.businessName, 50),
    fixedAlpha(address.street, 50),
    fixedAlpha(address.houseNumber, 10),
    fixedAlpha(address.city, 30),
    fixedAlpha(address.postalCode, 8),
    fixedNumeric('', 4),
    fixedNumeric(formatDate(fromDate), 8),
    fixedNumeric(formatDate(exportToDate), 8),
    fixedNumeric(formatDate(exportedAt), 8),
    fixedNumeric(formatTime(exportedAt), 4),
    fixedNumeric(0, 1),
    fixedNumeric(1, 1),
    fixedAlpha('zip', 20),
    fixedAlpha('ILS', 3),
    fixedNumeric(0, 1),
    fixedAlpha('', 46),
  ].join('');

  return assertFixedLength(line, 466, 'A000 line');
}

export function buildA100({ business, recordNumber, mainId }) {
  return assertFixedLength([
    fixedAlpha('A100', 4),
    fixedNumeric(recordNumber, 9),
    fixedNumeric(business.businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric(mainId, 15),
    fixedAlpha('&OF1.31&', 8),
    fixedAlpha('', 50),
  ].join(''), 95, 'A100 line');
}

export function buildB110({ business, recordNumber }) {
  const address = parseAddress(business.address);
  return assertFixedLength([
    fixedAlpha('B110', 4),
    fixedNumeric(recordNumber, 9),
    fixedNumeric(business.businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedAlpha('aaaaaaaaaaaa', 15),
    fixedAlpha('aaaaaaaaaaaa', 50),
    fixedAlpha('aaaaaaaaaaaa', 15),
    fixedAlpha('aaaaaaaaaaaa', 30),
    fixedAlpha(address.street || 'aaaaaaaaaaaa', 50),
    fixedAlpha(address.houseNumber || 'aaaaaaaa', 10),
    fixedAlpha(address.city || 'aaaaaaaaaaaa', 30),
    fixedAlpha(address.postalCode || 'aaaaaaaa', 8),
    fixedAlpha('aaaaaaaaaaaa', 30),
    fixedAlpha('aa', 2),
    fixedAlpha('aaaaaaaaaaaa', 15),
    signedAmount(0),
    signedAmount(0),
    signedAmount(0),
    fixedNumeric(0, 4),
    fixedNumeric('', 9),
    fixedAlpha('', 7),
    signedAmount(0),
    fixedAlpha('', 3),
    fixedAlpha('', 16),
  ].join(''), 376, 'B110 line');
}

export function buildC100({ business, document, recordNumber, linkId }) {
  const address = parseAddress(document.clientAddress);
  const documentDate = formatDate(document.date);
  return assertFixedLength([
    fixedAlpha('C100', 4),
    fixedNumeric(recordNumber, 9),
    fixedNumeric(business.businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric(document.documentTypeCode, 3, { required: true, strict: true, message: 'Document type must be 3 digits' }),
    fixedAlpha(document.documentNumber, 20),
    fixedNumeric(documentDate, 8, { required: true, strict: true, message: 'Document date must be 8 digits' }),
    fixedNumeric(formatTime(document.time || document.date), 4),
    fixedAlpha(document.clientName, 50),
    fixedAlpha(address.street, 50),
    fixedAlpha(address.houseNumber, 10),
    fixedAlpha(address.city, 30),
    fixedAlpha(address.postalCode, 8),
    fixedAlpha('', 30),
    fixedAlpha('', 2),
    fixedAlpha(normalizePhone(document.clientPhone), 15),
    fixedNumeric(document.customerVatNumber, 9),
    fixedNumeric(documentDate, 8),
    signedAmount(document.grandTotal),
    fixedAlpha('ILS', 3),
    signedAmount(document.subtotalBeforeTax),
    signedAmount(0),
    signedAmount(document.subtotalBeforeTax),
    signedAmount(document.vatAmount),
    signedAmount(document.grandTotal),
    signedAmount(0, 9, 2),
    fixedAlpha(document.customerVatNumber || document.clientName, 15),
    fixedAlpha('', 10),
    fixedAlpha('', 1),
    fixedNumeric(documentDate, 8),
    fixedAlpha('', 7),
    fixedAlpha('', 9),
    fixedNumeric(linkId || stableLinkId(document.documentNumber, documentDate), 7),
    fixedAlpha('', 13),
  ].join(''), 444, 'C100 line');
}

export function buildD110({ business, document, item, index, recordNumber, linkId }) {
  const quantity = Number(item?.quantity) || 1;
  const rawPrice = Number(item?.price ?? item?.unitPrice ?? 0) || 0;
  const priceBeforeTax = Number(item?.unitPriceWithoutTax ?? item?.priceBeforeTax ?? 0)
    || (quantity > 0
      ? (Number(item?.subtotal ?? item?.lineSubtotal ?? 0) || 0) / quantity
      : rawPrice);
  const lineTotalBeforeTax = priceBeforeTax * quantity;
  const vatRate = Number(item?.vatRate ?? document.vatRate ?? 0) || 0;
  const documentDate = formatDate(document.date);
  return assertFixedLength([
    fixedAlpha('D110', 4),
    fixedNumeric(recordNumber, 9),
    fixedNumeric(business.businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric(document.documentTypeCode, 3, { required: true, strict: true, message: 'Document type must be 3 digits' }),
    fixedAlpha(document.documentNumber, 20),
    fixedNumeric(index, 4),
    fixedNumeric(document.normalizedType === 'credit_note' ? 305 : '', 3),
    fixedAlpha(item?.baseDocumentNumber || document.baseDocumentNumber || document.originalInvoiceNumber || '', 20),
    fixedNumeric(1, 1),
    fixedAlpha(item?.sku || item?.code || index, 20),
    fixedAlpha(item?.description || item?.name || 'Service', 30),
    fixedAlpha(item?.manufacturer || '', 50),
    fixedAlpha(item?.serialNumber || '', 30),
    fixedAlpha('UNIT', 20),
    signedAmount(quantity, 12, 4),
    signedAmount(priceBeforeTax),
    signedAmount(item?.discountAmount || 0),
    signedAmount(lineTotalBeforeTax), 
    fixedNumeric(Number(item?.vatAmount ?? document.vatAmount) > 0 ? vatRate : 0, 4),
    fixedAlpha('', 7),
    fixedNumeric(documentDate, 8),
    fixedNumeric(linkId || stableLinkId(document.documentNumber, documentDate), 7),
    fixedAlpha('', 7),
    fixedAlpha('', 21),
  ].join(''), 339, 'D110 line');
}

export function buildD120({ business, document, payment, index, recordNumber, linkId }) {
  const documentDate = formatDate(document.date);
  return assertFixedLength([
    fixedAlpha('D120', 4),
    fixedNumeric(recordNumber, 9),
    fixedNumeric(business.businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric(document.documentTypeCode, 3, { required: true, strict: true, message: 'Document type must be 3 digits' }),
    fixedAlpha(document.documentNumber, 20),
    fixedNumeric(index, 4),
    fixedNumeric(paymentTypeCode(payment), 1),
    fixedNumeric(payment?.bankNumber || payment?.bank, 10),
    fixedNumeric(payment?.branchNumber || payment?.branch, 10),
    fixedNumeric(payment?.accountNumber || payment?.account, 15),
    fixedNumeric(payment?.chequeNumber || payment?.checkNumber || payment?.check, 10),
    fixedNumeric(formatDate(payment?.date || document.date), 8),
    signedAmount(payment?.amount ?? document.grandTotal),
    fixedNumeric(payment?.creditCompanyCode, 1),
    fixedAlpha(payment?.cardName || payment?.cardType || '', 20),
    fixedNumeric(payment?.creditDealType, 1),
    fixedAlpha('', 7),
    fixedNumeric(documentDate, 8),
    fixedNumeric(linkId || stableLinkId(document.documentNumber, documentDate), 7),
    fixedAlpha('', 60),
  ].join(''), 222, 'D120 line');
}

export function buildZ900({ business, recordNumber, mainId, totalRecords }) {
  return assertFixedLength([
    fixedAlpha('Z900', 4),
    fixedNumeric(recordNumber, 9),
    fixedNumeric(business.businessNumber, 9, { required: true, strict: true, message: 'Business number must be 9 digits or less' }),
    fixedNumeric(mainId, 15),
    fixedAlpha('&OF1.31&', 8),
    fixedNumeric(totalRecords, 15),
    fixedAlpha('', 50),
  ].join(''), 110, 'Z900 line');
}

export function buildIniCountLine(recordType, count) {
  return assertFixedLength([fixedAlpha(recordType, 4), fixedNumeric(count, 15)].join(''), 19, `${recordType} count line`);
}
