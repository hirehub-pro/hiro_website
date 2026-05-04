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
  return new Date().toISOString().slice(0, 10);
}

export function dueDateKey() {
  const next = new Date();
  next.setDate(next.getDate() + 14);
  return next.toISOString().slice(0, 10);
}

export function getInvoicePreviewStorageKey(userId) {
  return `hiro_invoice_preview_${userId || 'guest'}`;
}
