import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiFileText,
  FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getUserSavedInvoices } from '../../../lib/firestore';
import { formatCurrency, getInvoicePreviewStorageKey } from '../../../lib/invoices';

function formatSavedDate(value, locale) {
  if (!value) return '';

  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : locale === 'ar' ? 'ar' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function buildPreviewPayloadFromSavedInvoice(item) {
  const createdAt = item?.createdAt instanceof Date ? item.createdAt : null;
  const issueDate = createdAt
    ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`
    : '';
  const storedItems = Array.isArray(item?.items) && item.items.length > 0
    ? item.items.map((savedItem, index) => ({
      id: `${item?.id || 'saved-line'}_${index}`,
      sku: '',
      description: savedItem?.description || '',
      quantity: Number(savedItem?.quantity) || 0,
      unitPrice: Number(savedItem?.price) || 0,
      currency: 'ILS',
      unit: '',
    }))
    : [
      {
        id: item?.id || 'saved-line-0',
        sku: '',
        description: item?.name || item?.docType || '',
        quantity: 1,
        unitPrice: Number(item?.amount) || 0,
        currency: 'ILS',
        unit: '',
      },
    ];
  const storedPayments = Array.isArray(item?.paymentMethods) && item.paymentMethods.length > 0
    ? item.paymentMethods.map((paymentMethod, index) => ({
      id: `${item?.id || 'saved'}_payment_${index}`,
      type: paymentMethod?.method || item?.paymentMethod || item?.docType || 'receipt',
      date: issueDate,
      amount: Number(paymentMethod?.amount) || 0,
      currency: 'ILS',
      bankName: '',
      branch: '',
      accountNumber: '',
    }))
    : [
      {
        id: `${item?.id || 'saved'}_payment`,
        type: item?.paymentMethod || item?.docType || 'receipt',
        date: issueDate,
        amount: Number(item?.paymentAmountTotal ?? item?.paidAmount ?? item?.amount) || 0,
        currency: 'ILS',
        bankName: '',
        branch: '',
        accountNumber: '',
      },
    ];

  return {
    id: item?.id || '',
    invoiceDocId: item?.invoiceDocId || item?.id || '',
    invoiceNumber: item?.invoiceNumber || '',
    issueDate,
    dueDate: issueDate,
    clientName: item?.clientName || '',
    clientId: item?.clientTaxId || '',
    clientEmail: item?.clientEmail || '',
    clientPhone: item?.clientPhone || '',
    clientCity: item?.clientAddress || '',
    documentType: normalizeSavedDocType(item?.type || item?.docType),
    documentDescription: item?.name || '',
    vatRate: 0,
    paymentTerms: '',
    notes: item?.notes || '',
    footerNotes: '',
    bottomNotes: '',
    subtotal: Math.max((Number(item?.amount) || 0) - (Number(item?.vatAmount) || 0), 0),
    vatAmount: Number(item?.vatAmount) || 0,
    total: Number(item?.amount) || 0,
    paidTotal: Number(item?.paidAmount ?? item?.paymentAmountTotal) || 0,
    amountDue: Math.max((Number(item?.amount) || 0) - (Number(item?.paidAmount ?? item?.paymentAmountTotal) || 0), 0),
    createdBy: {
      id: item?.createdBy?.id || '',
      name: item?.createdBy?.name || '',
      phone: item?.createdBy?.phone || '',
      email: item?.createdBy?.email || '',
      city: item?.createdBy?.city || '',
    },
    lineItems: storedItems,
    payments: storedPayments,
    savedFileName: item?.fileName || '',
    savedInvoiceUrl: item?.url || '',
    savedStoragePath: item?.storagePath || '',
    taxAuthorityAllocation: item?.taxAuthorityAllocation || null,
    allocationNumber: item?.allocationNumber || '',
    taxAuthorityAllocationNumber: item?.taxAuthorityAllocationNumber || '',
  };
}

function normalizeSavedDocType(value) {
  const raw = String(value || '').toLowerCase();
  if (raw === 'tax_invoice') return 'invoice';
  if (raw === 'tax_invoice_receipt') return 'invoice_receipt';
  return raw || 'receipt';
}

export default function SavedInvoicesPage() {
  const router = useRouter();
  const { user, isWorker, loading } = useAuth();
  const { t, locale, dir } = useLanguage();
  const copy = t.invoices;
  const isRtl = dir === 'rtl';
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin?next=%2Fworker%2Finvoices%2Fsaved');
      return;
    }

    if (!loading && user && !isWorker) {
      router.replace('/');
    }
  }, [isWorker, loading, router, user]);

  useEffect(() => {
    let active = true;

    async function loadSavedInvoices() {
      if (!user?.uid) return;

      setLoadingInvoices(true);
      try {
        const records = await getUserSavedInvoices(user.uid);
        if (!active) return;
        setSavedInvoices(records);
      } catch (error) {
        if (active) {
          setSavedInvoices([]);
          toast.error(t.common.error);
        }
      } finally {
        if (active) {
          setLoadingInvoices(false);
        }
      }
    }

    loadSavedInvoices();
    return () => {
      active = false;
    };
  }, [t.common.error, user?.uid]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return savedInvoices.filter((item) => {
      const matchesSearch = !normalizedSearch || [
        item.clientName,
        item.invoiceNumber,
        item.name,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const itemDateKey = item.createdAt
        ? `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, '0')}-${String(item.createdAt.getDate()).padStart(2, '0')}`
        : '';
      const matchesDate = !selectedDate || itemDateKey === selectedDate;

      const normalizedType = normalizeSavedDocType(item.docType);
      const matchesType = selectedType === 'all'
        || (selectedType === 'invoice' && normalizedType === 'invoice')
        || (selectedType === 'receipt' && normalizedType === 'receipt')
        || (selectedType === 'invoice_receipt' && normalizedType === 'invoice_receipt')
        || (selectedType === 'credit_note' && normalizedType === 'credit_note')
        || (selectedType === 'quote' && normalizedType === 'quote')
        || (selectedType === 'work_order' && normalizedType === 'work_order');

      return matchesSearch && matchesDate && matchesType;
    });
  }, [savedInvoices, searchTerm, selectedDate, selectedType]);

  const totalAmount = useMemo(
    () => filteredInvoices.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [filteredInvoices]
  );

  function openSavedInvoice(item) {
    if (!user?.uid) return;

    const previewStorageKey = getInvoicePreviewStorageKey(user.uid);
    const previewPayload = {
      ...buildPreviewPayloadFromSavedInvoice(item),
      ...(item?.payload || {}),
      savedFileName: item?.fileName || item?.payload?.savedFileName || '',
      savedInvoiceUrl: item?.url || item?.payload?.savedInvoiceUrl || '',
      savedStoragePath: item?.storagePath || item?.payload?.savedStoragePath || '',
    };
    window.localStorage.setItem(previewStorageKey, JSON.stringify(previewPayload));
    toast.success(copy.savedInvoiceReady);
    router.push('/worker/invoices/preview?source=saved');
  }

  if (loading || (user && loadingInvoices)) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (!isWorker) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-soft">
          <p className="text-sm font-semibold text-gray-700">{copy.workerOnly}</p>
        </div>
      </div>
    );
  }

  const filterChips = [
    { key: 'all', label: copy.allDocs },
    { key: 'invoice', label: copy.taxInvoiceDoc },
    { key: 'receipt', label: copy.receiptDoc },
    { key: 'invoice_receipt', label: copy.taxInvoiceReceiptDoc },
    { key: 'credit_note', label: copy.creditNoteDoc },
    { key: 'quote', label: copy.quoteDoc },
    { key: 'work_order', label: copy.workOrderDoc },
  ];

  return (
    <>
      <Head>
        <title>{`Hiro | ${copy.savedTitle}`}</title>
      </Head>

      <main className="min-h-screen bg-[#f1f5fa] px-4 py-6 sm:px-6 sm:py-8" dir={dir}>
        <div className="mx-auto max-w-[920px]">
          <div className="flex items-center gap-4">
            <Link href="/worker/invoices" className="text-primary transition-opacity hover:opacity-80" aria-label={copy.backToEditor}>
              <FiArrowLeft className={`h-7 w-7 ${isRtl ? 'rotate-180' : ''}`} />
            </Link>
            <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 sm:text-[38px]">{copy.savedTitle}</h1>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_max-content]">
            <label className="flex items-center gap-3 rounded-[20px] border border-[#d4e0ef] bg-white px-4 py-3.5 shadow-sm">
              <FiSearch className="h-6 w-6 text-slate-600" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={copy.savedSearchPlaceholder}
                className="w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-500 sm:text-lg"
              />
            </label>

            <div className="w-full max-w-full rounded-[20px] bg-[#dcebfa] px-4 py-3.5 text-slate-700 shadow-sm md:w-fit md:min-w-[122px]">
              <p className="text-3xl font-extrabold leading-none text-primary">{filteredInvoices.length}</p>
              <p className="mt-1.5 text-sm font-bold uppercase tracking-wide">{copy.docsShort}</p>
              <p className="mt-2 whitespace-nowrap text-[clamp(1rem,4.8vw,1.375rem)] font-extrabold">{formatCurrency(totalAmount, locale)}</p>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-[18px] border border-[#d4e0ef] bg-white px-4 py-3.5 text-primary shadow-sm">
            <FiCalendar className="h-5 w-5" />
            <span className="text-base font-bold sm:text-lg">{copy.filterByDate}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="ml-auto min-w-[148px] bg-transparent text-sm font-semibold text-slate-700 outline-none rtl:ml-0 rtl:mr-auto"
            />
          </label>

          <div className="mt-5 flex gap-2.5 overflow-x-auto pb-2">
            {filterChips.map((chip) => {
              const active = selectedType === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setSelectedType(chip.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors sm:px-5 sm:text-base ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-[#edf2f8] text-slate-600'
                  }`}
                >
                  {active ? <FiCheck className="h-4.5 w-4.5" /> : null}
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-3.5">
            {filteredInvoices.length === 0 ? (
              <div className="rounded-[24px] border border-[#dbe5f0] bg-white px-8 py-8 text-center shadow-sm">
                <p className="text-base font-semibold text-slate-600">{copy.noSavedInvoices}</p>
              </div>
            ) : (
              filteredInvoices.map((item) => {
                const normalizedType = normalizeSavedDocType(item.docType);
                const typeLabel = normalizedType === 'invoice'
                  ? copy.taxInvoiceDoc
                  : normalizedType === 'invoice_receipt'
                    ? copy.taxInvoiceReceiptDoc
                    : normalizedType === 'credit_note'
                      ? copy.creditNoteDoc
                      : normalizedType === 'quote'
                        ? copy.quoteDoc
                        : normalizedType === 'work_order'
                          ? copy.workOrderDoc
                      : copy.receiptDoc;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openSavedInvoice(item)}
                    className="w-full rounded-[22px] border border-[#dbe5f0] bg-white p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[#fff1e3] text-[#f47c00]">
                        <FiFileText className="h-7 w-7" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-full bg-[#fff1e3] px-3 py-1 text-sm font-bold text-[#f47c00]">{typeLabel}</span>
                          <span className="rounded-full bg-[#f0f5fb] px-2.5 py-1 text-sm font-bold text-slate-600">#{item.invoiceNumber || '-'}</span>
                        </div>

                        <h2 className="mt-2.5 truncate text-[26px] font-extrabold leading-tight text-slate-900">{item.name || `${typeLabel} #${item.invoiceNumber || '-'}`}</h2>
                        <p className="mt-1 text-base text-slate-500">{item.clientName || '-'}</p>

                        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2.5 text-slate-600">
                            <FiCalendar className="h-5 w-5" />
                            <span className="text-base font-bold">{formatSavedDate(item.createdAt, locale)}</span>
                          </div>

                          <div className="inline-flex items-center justify-center rounded-[16px] bg-[#dcebfa] px-4 py-2.5 text-xl font-extrabold text-primary">
                            {formatCurrency(item.amount, locale)}
                          </div>
                        </div>
                      </div>

                      <FiChevronRight className={`mt-1 h-7 w-7 shrink-0 text-slate-400 ${isRtl ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>
    </>
  );
}
