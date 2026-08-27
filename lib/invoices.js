export function localeToIntl(locale) {
  if (locale === 'he') return 'he-IL';
  if (locale === 'ar') return 'ar';
  return 'en-US';
}

export function formatCurrency(value, locale) {
  const safeValue = Number(value) || 0;
  return new Intl.NumberFormat(localeToIntl(locale), {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dueDateKey() {
  const next = new Date();
  next.setDate(next.getDate() + 14);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getInvoicePreviewStorageKey(userId) {
  return `hiro_invoice_preview_${userId || 'guest'}`;
}

export function getInvoiceClientPrefillStorageKey(userId) {
  return `hiro_invoice_client_prefill_${userId || 'guest'}`;
}
