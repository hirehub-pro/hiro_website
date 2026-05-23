import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { doc, getDoc } from 'firebase/firestore';
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiLayers,
  FiPlus,
  FiPrinter,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/firebase';
import {
  getNextUserDocumentNumber,
  getSystemVatPercent,
  getUserProfile,
  getUserVerificationInfo,
  initializeUserDocumentCounter,
} from '../../lib/firestore';
import {
  dueDateKey,
  formatCurrency,
  getInvoiceClientPrefillStorageKey,
  getInvoicePreviewStorageKey,
  todayKey,
} from '../../lib/invoices';

function buildLineItem(index, description, currency, unit) {
  return {
    id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    sku: '',
    description,
    quantity: 1,
    unitPrice: 0,
    currency,
    unit,
  };
}

function buildPayment(index, type, currency) {
  return {
    id: `${Date.now()}_pay_${index}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    date: todayKey(),
    amount: 0,
    currency,
    bankName: '',
    branch: '',
    accountNumber: '',
  };
}

function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-5">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/65">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-950">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p> : null}
    </div>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div className={clsx('rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-card backdrop-blur sm:p-7', className)}>
      {children}
    </div>
  );
}

function documentTypeUsesCounter(value) {
  return value !== 'quote' && value !== 'work_order';
}

function isTaxInvoiceDocumentType(value) {
  return value === 'tax_invoice' || value === 'tax_invoice_receipt';
}

function documentTypeConfig(value) {
  switch (value) {
    case 'quote':
      return { showDueDate: true, showPaymentDetails: false, showPaymentType: false };
    case 'work_order':
      return { showDueDate: false, showPaymentDetails: false, showPaymentType: false };
    case 'receipt':
      return { showDueDate: false, showPaymentDetails: true, showPaymentType: true };
    case 'tax_invoice':
      return { showDueDate: true, showPaymentDetails: false, showPaymentType: false };
    case 'tax_invoice_receipt':
      return { showDueDate: false, showPaymentDetails: true, showPaymentType: true };
    case 'credit_note':
      return { showDueDate: false, showPaymentDetails: false, showPaymentType: false };
    default:
      return { showDueDate: true, showPaymentDetails: true, showPaymentType: true };
  }
}

export default function WorkerInvoicesPage() {
  const router = useRouter();
  const { user, profile, isWorker, loading } = useAuth();
  const { t, locale } = useLanguage();
  const copy = t.invoices;
  const verificationCopy = t.businessVerification;
  const draftStorageKey = `hiro_invoice_draft_${user?.uid || 'guest'}`;
  const profileDealerType = String(profile?.dealerType || '').trim().toLowerCase();
  const [dealerType, setDealerType] = useState(profileDealerType);
  const [dealerTypeLoaded, setDealerTypeLoaded] = useState(profileDealerType === 'exempt');

  const currencyOptions = useMemo(() => ['ILS', 'USD', 'EUR'], []);
  const unitOptions = useMemo(() => ([
    { value: copy.unitEach, label: copy.unitEach },
    { value: copy.unitHour, label: copy.unitHour },
    { value: copy.unitDay, label: copy.unitDay },
    { value: copy.unitProject, label: copy.unitProject },
  ]), [copy.unitDay, copy.unitEach, copy.unitHour, copy.unitProject]);
  const paymentTypeOptions = useMemo(() => ([
    copy.bankTransfer,
    copy.cash,
    copy.card,
    copy.bit,
    copy.check,
  ]), [copy.bankTransfer, copy.bit, copy.card, copy.cash, copy.check]);
  const effectiveDealerType = dealerType || profileDealerType;
  const isExemptDealer = effectiveDealerType === 'exempt';
  const documentTypeOptions = useMemo(() => ([
    { value: 'quote', label: copy.quoteDoc },
    { value: 'work_order', label: copy.workOrderDoc },
    { value: 'receipt', label: copy.receiptDoc },
    { value: 'tax_invoice', label: copy.taxInvoiceDoc },
    { value: 'tax_invoice_receipt', label: copy.taxInvoiceReceiptDoc },
    { value: 'credit_note', label: copy.creditNoteDoc },
  ].filter((option) => {
    if (!dealerTypeLoaded && isTaxInvoiceDocumentType(option.value)) return false;
    if (isExemptDealer && isTaxInvoiceDocumentType(option.value)) return false;
    return true;
  })), [copy.creditNoteDoc, copy.quoteDoc, copy.receiptDoc, copy.taxInvoiceDoc, copy.taxInvoiceReceiptDoc, copy.workOrderDoc, dealerTypeLoaded, isExemptDealer]);
  const defaultLineItems = useMemo(
    () => [buildLineItem(0, copy.defaultLineDescription, 'ILS', copy.unitEach)],
    [copy.defaultLineDescription, copy.unitEach]
  );
  const defaultPayments = useMemo(
    () => [buildPayment(0, copy.bankTransfer, 'ILS')],
    [copy.bankTransfer]
  );

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayKey());
  const [dueDate, setDueDate] = useState(dueDateKey());
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [documentType, setDocumentType] = useState('receipt');
  const [documentDescription, setDocumentDescription] = useState('');
  const [vatRate, setVatRate] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState(defaultLineItems);
  const [payments, setPayments] = useState(defaultPayments);
  const [expandedLineItemId, setExpandedLineItemId] = useState(defaultLineItems[0]?.id || null);
  const [expandedPaymentId, setExpandedPaymentId] = useState(defaultPayments[0]?.id || null);
  const restoredDraftForUserRef = useRef('');
  const promptedCounterTypesRef = useRef({});
  const appliedClientPrefillRef = useRef('');
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const { showDueDate, showPaymentDetails, showPaymentType } = useMemo(
    () => documentTypeConfig(documentType),
    [documentType]
  );
  const canUseInvoiceBuilder = verificationStatus === 'approved';

  function getDocumentTypeLabel(value) {
    return documentTypeOptions.find((option) => option.value === value)?.label || copy.documentType;
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin?next=%2Fworker%2Finvoices');
      return;
    }

    if (!loading && user && !isWorker) {
      router.replace('/');
    }
  }, [isWorker, loading, router, user]);

  useEffect(() => {
    if (loading || !user?.uid || !isWorker) return;

    let cancelled = false;

    async function ensureVerificationInfo() {
      try {
        const verificationInfo = await getUserVerificationInfo(user.uid);
        if (cancelled) return;

        const verificationStatus = String(
          verificationInfo?.status || profile?.businessVerificationStatus || ''
        ).trim().toLowerCase();

        setVerificationStatus(verificationInfo ? (verificationStatus || 'pending') : 'not_submitted');
        setVerificationChecked(true);
      } catch (error) {
        if (!cancelled) {
          setVerificationStatus('not_submitted');
          setVerificationChecked(true);
        }
      }
    }

    ensureVerificationInfo();

    return () => {
      cancelled = true;
    };
  }, [isWorker, loading, profile?.businessVerificationStatus, user?.uid]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    if (restoredDraftForUserRef.current === user.uid) return;

    const savedDraft = window.localStorage.getItem(draftStorageKey);
    restoredDraftForUserRef.current = user.uid;
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft);
      setIssueDate(parsed.issueDate || todayKey());
      setDueDate(parsed.dueDate || dueDateKey());
      setClientName(parsed.clientName || '');
      setClientId(parsed.clientId || '');
      setClientEmail(parsed.clientEmail || '');
      setClientPhone(parsed.clientPhone || '');
      setClientCity(parsed.clientCity || '');
      setDocumentType(parsed.documentType || 'receipt');
      setDocumentDescription(parsed.documentDescription || '');
      setPaymentTerms(parsed.paymentTerms || '');
      setNotes(parsed.notes || '');
      const nextLineItems = Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0
        ? parsed.lineItems
        : defaultLineItems;
      const nextPayments = Array.isArray(parsed.payments) && parsed.payments.length > 0
        ? parsed.payments
        : defaultPayments;
      setLineItems(nextLineItems);
      setPayments(nextPayments);
      setExpandedLineItemId(nextLineItems[nextLineItems.length - 1]?.id || null);
      setExpandedPaymentId(nextPayments[nextPayments.length - 1]?.id || null);
    } catch (error) {
      // Keep default draft state when parsing fails.
    }
  }, [defaultLineItems, defaultPayments, draftStorageKey, user]);

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function loadDealerType() {
      if (!cancelled) {
        setDealerType(profileDealerType);
        setDealerTypeLoaded(false);
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const verificationSnap = await getDoc(doc(db, 'users', user.uid, 'verification_info', 'latest'));
        if (!cancelled) {
          const userDocDealerType = String(userSnap.data()?.dealerType || userSnap.data()?.dealertype || '').trim().toLowerCase();
          const verificationDealerType = String(verificationSnap.data()?.dealerType || verificationSnap.data()?.dealertype || '').trim().toLowerCase();
          setDealerType(verificationDealerType || userDocDealerType || profileDealerType);
          setDealerTypeLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setDealerType(profileDealerType);
          setDealerTypeLoaded(true);
        }
      }
    }

    loadDealerType();

    return () => {
      cancelled = true;
    };
  }, [profileDealerType, user?.uid]);

  useEffect(() => {
    if (!dealerTypeLoaded) return;
    if (!isExemptDealer || !isTaxInvoiceDocumentType(documentType)) return;
    setDocumentType('receipt');
  }, [dealerTypeLoaded, documentType, isExemptDealer]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const storageKey = getInvoiceClientPrefillStorageKey(user.uid);
    const storedPrefill = window.localStorage.getItem(storageKey);
    if (!storedPrefill) return;

    let parsedPrefill = null;
    try {
      parsedPrefill = JSON.parse(storedPrefill);
    } catch (error) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const rawClientUid = typeof parsedPrefill?.clientUid === 'string' ? parsedPrefill.clientUid : '';
    const rawClientName = typeof parsedPrefill?.clientName === 'string' ? parsedPrefill.clientName : '';
    const rawClientEmail = typeof parsedPrefill?.clientEmail === 'string' ? parsedPrefill.clientEmail : '';
    const rawClientPhone = typeof parsedPrefill?.clientPhone === 'string' ? parsedPrefill.clientPhone : '';
    const rawClientCity = typeof parsedPrefill?.clientCity === 'string' ? parsedPrefill.clientCity : '';
    const prefillKey = [rawClientUid, rawClientName, rawClientEmail, rawClientPhone, rawClientCity].join('|');

    if (!prefillKey.trim() || appliedClientPrefillRef.current === prefillKey) {
      return;
    }

    let cancelled = false;

    async function applyClientPrefill() {
      let clientProfile = null;
      let clientBusinessId = '';

      if (rawClientUid) {
        try {
          clientProfile = await getUserProfile(rawClientUid);
        } catch (error) {
          clientProfile = null;
        }

        try {
          const verificationSnap = await getDoc(doc(db, 'users', rawClientUid, 'verification_info', 'latest'));
          clientBusinessId = verificationSnap.exists() ? String(verificationSnap.data()?.businessId || '').trim() : '';
        } catch (error) {
          clientBusinessId = '';
        }
      }

      if (cancelled) return;

      setClientName(clientProfile?.name || rawClientName || '');
      setClientId(clientBusinessId || '');
      setClientEmail(clientProfile?.email || rawClientEmail || '');
      setClientPhone(clientProfile?.phone || clientProfile?.optionalPhone || rawClientPhone || '');
      setClientCity(clientProfile?.town || clientProfile?.city || rawClientCity || '');
      appliedClientPrefillRef.current = prefillKey;
      window.localStorage.removeItem(storageKey);
    }

    applyClientPrefill();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadVatPercent() {
      try {
        const nextVatPercent = await getSystemVatPercent();
        if (!cancelled && nextVatPercent !== null) {
          setVatRate(nextVatPercent);
        }
      } catch (error) {
        // Keep the fallback VAT value when metadata is unavailable.
      }
    }

    loadVatPercent();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || !canUseInvoiceBuilder) return undefined;

    let cancelled = false;

    async function loadDocumentNumber() {
      if (!documentTypeUsesCounter(documentType)) {
        setInvoiceNumber('');
        promptedCounterTypesRef.current[documentType] = false;
        return;
      }

      try {
        const nextDocumentNumber = await getNextUserDocumentNumber(user.uid, documentType);
        if (!cancelled) {
          if (nextDocumentNumber) {
            setInvoiceNumber(nextDocumentNumber);
            promptedCounterTypesRef.current[documentType] = false;
            return;
          }

          setInvoiceNumber('');

          if (typeof window === 'undefined' || promptedCounterTypesRef.current[documentType]) {
            return;
          }

          promptedCounterTypesRef.current[documentType] = true;
          const documentTypeLabel = getDocumentTypeLabel(documentType);
          const response = window.prompt(
            `${copy.documentCounterSetupTitle} ${documentTypeLabel}.\n\n${copy.documentCounterSetupPrompt}\n\n${copy.documentCounterSetupWarning}`,
            '1'
          );

          if (response === null) {
            toast.error(copy.documentCounterSetupCancel);
            router.push(`/profile/${user.uid}`);
            return;
          }

          const parsedStartNumber = Number(response.trim());
          if (!Number.isInteger(parsedStartNumber) || parsedStartNumber <= 0) {
            toast.error(copy.documentCounterSetupInvalid);
            promptedCounterTypesRef.current[documentType] = false;
            return;
          }

          const initializedNumber = await initializeUserDocumentCounter(user.uid, documentType, parsedStartNumber);
          if (!cancelled) {
            setInvoiceNumber(initializedNumber);
            toast.success(`${documentTypeLabel} ${copy.documentCounterSetupSuccess} ${initializedNumber}.`);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setInvoiceNumber('');
          promptedCounterTypesRef.current[documentType] = false;
        }
      }
    }

    loadDocumentNumber();

    return () => {
      cancelled = true;
    };
  }, [canUseInvoiceBuilder, documentType, user?.uid]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [lineItems]
  );
  const vatAmount = subtotal * ((Number(vatRate) || 0) / 100);
  const total = subtotal + vatAmount;
  const paidTotal = useMemo(
    () => payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [payments]
  );
  const amountDue = Math.max(total - paidTotal, 0);
  const paymentCoverage = total > 0 ? Math.min((paidTotal / total) * 100, 100) : 0;
  const clientCompletion = [clientName, clientId, clientEmail, clientPhone, clientCity].filter(Boolean).length;
  const readyServiceLines = lineItems.filter((item) => item.description && Number(item.quantity) > 0 && Number(item.unitPrice) > 0).length;
  const readyPayments = payments.filter((item) => item.type && Number(item.amount) > 0).length;

  if (loading || (user && isWorker && !verificationChecked)) {
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

  if (!canUseInvoiceBuilder) {
    const isPending = verificationStatus === 'pending';
    const statusLabel = isPending ? verificationCopy.pendingStatus : copy.verificationNotSubmittedStatus;
    const statusBody = isPending ? copy.verificationPendingBody : copy.verificationNotSubmittedBody;

    return (
      <>
        <Head>
          <title>{`Hiro | ${copy.title}`}</title>
        </Head>

        <main className="relative overflow-hidden px-4 py-6 md:py-8">
          <div className="absolute inset-0 bg-mesh opacity-60" />
          <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />

          <div className="relative mx-auto max-w-3xl">
            <Panel className="shadow-soft">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/65">{copy.shortTitle}</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">{copy.verificationStatusTitle}</h1>
              <p className="mt-3 text-sm leading-7 text-gray-500">{statusBody}</p>

              <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700/75">{copy.verificationStatusLabel}</p>
                <p className="mt-2 text-lg font-bold text-amber-950">{statusLabel}</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push(`/worker/verification?next=${encodeURIComponent('/worker/invoices')}`)}
                  className="btn-primary"
                >
                  {copy.verificationBlockedCta}
                </button>
              </div>
            </Panel>
          </div>
        </main>
      </>
    );
  }

  function updateLineItem(id, field, value) {
    setLineItems((current) => current.map((item) => (
      item.id === id
        ? { ...item, [field]: field === 'description' || field === 'sku' || field === 'currency' || field === 'unit' ? value : Number(value) }
        : item
    )));
  }

  function updatePayment(id, field, value) {
    setPayments((current) => current.map((item) => (
      item.id === id
        ? { ...item, [field]: field === 'amount' ? Number(value) : value }
        : item
    )));
  }

  function addLineItem() {
    const nextItem = buildLineItem(lineItems.length, '', 'ILS', copy.unitEach);
    setLineItems((current) => [...current, nextItem]);
    setExpandedLineItemId(nextItem.id);
  }

  function removeLineItem(id) {
    setLineItems((current) => {
      if (current.length === 1) return current;
      const next = current.filter((item) => item.id !== id);
      if (expandedLineItemId === id) {
        setExpandedLineItemId(next[next.length - 1]?.id || null);
      }
      return next;
    });
  }

  function addPaymentRow() {
    const nextPayment = buildPayment(payments.length, copy.bankTransfer, 'ILS');
    setPayments((current) => [...current, nextPayment]);
    setExpandedPaymentId(nextPayment.id);
  }

  function removePaymentRow(id) {
    setPayments((current) => {
      if (current.length === 1) return current;
      const next = current.filter((item) => item.id !== id);
      if (expandedPaymentId === id) {
        setExpandedPaymentId(next[next.length - 1]?.id || null);
      }
      return next;
    });
  }

  function saveDraft() {
    if (typeof window === 'undefined') return;

    const nextDraft = {
      invoiceNumber,
      issueDate,
      dueDate,
      clientName,
      clientId,
      clientEmail,
      clientPhone,
      clientCity,
      documentType,
      documentDescription,
      vatRate,
      paymentTerms,
      notes,
      lineItems,
      payments,
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(nextDraft));
    toast.success(copy.draftSaved);
  }

  function buildInvoicePayload() {
    return {
      invoiceNumber,
      issueDate,
      dueDate,
      clientName,
      clientId,
      clientEmail,
      clientPhone,
      clientCity,
      documentType,
      documentDescription,
      vatRate: Number(vatRate) || 0,
      paymentTerms,
      notes,
      subtotal,
      vatAmount,
      total,
      paidTotal,
      amountDue,
      locale,
      createdBy: {
        name: profile?.name || 'Hiro Pro',
        phone: profile?.phone || '',
        email: profile?.email || user?.email || '',
        city: profile?.town || profile?.city || '',
      },
      lineItems,
      payments,
    };
  }

  function openPdfPreview() {
    if (typeof window === 'undefined') return;
    if (!dealerTypeLoaded) {
      toast.error('Checking your business tax status. Please try again in a moment.');
      return;
    }
    if (isExemptDealer && isTaxInvoiceDocumentType(documentType)) {
      toast.error('Exempt businesses cannot generate tax invoice documents.');
      setDocumentType('receipt');
      return;
    }

    const previewStorageKey = getInvoicePreviewStorageKey(user?.uid);
    window.localStorage.setItem(previewStorageKey, JSON.stringify(buildInvoicePayload()));
    toast.success(copy.invoiceReady);
    router.push('/worker/invoices/preview');
  }

  return (
    <>
      <Head>
        <title>{`Hiro | ${copy.title}`}</title>
      </Head>

      <main className="relative overflow-hidden px-4 py-6 md:py-8">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-7xl space-y-6">
          <div>
            <section className="space-y-6">
              <Panel className="shadow-soft">
                <SectionTitle eyebrow={copy.invoiceProfile} title={copy.clientDetails} />
                <div className="mb-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClientName(clientName || '');
                      setClientEmail(clientEmail || '');
                      setClientPhone(clientPhone || '');
                      setClientCity(clientCity || profile?.town || profile?.city || '');
                    }}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-slate-200"
                  >
                    {profile?.town || profile?.city || copy.city}
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.clientName}</span>
                    <div className="relative">
                      <FiUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="input-field pl-12 rtl:pl-4 rtl:pr-12" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.clientId}</span>
                    <div className="relative">
                      <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input value={clientId} onChange={(event) => setClientId(event.target.value)} className="input-field pl-12 rtl:pl-4 rtl:pr-12" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.clientEmail}</span>
                    <input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="input-field" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.clientPhone}</span>
                    <input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="input-field" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.city}</span>
                    <input value={clientCity} onChange={(event) => setClientCity(event.target.value)} className="input-field" />
                  </label>
                </div>
              </Panel>

              <Panel>
                <SectionTitle eyebrow={copy.invoiceProfile} title={copy.invoiceDetails} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.issueDate}</span>
                    <div className="relative">
                      <FiCalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="input-field pl-12 rtl:pl-4 rtl:pr-12" />
                    </div>
                  </label>
                  {showDueDate ? (
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.dueDate}</span>
                      <div className="relative">
                        <FiCalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                        <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="input-field pl-12 rtl:pl-4 rtl:pr-12" />
                      </div>
                    </label>
                  ) : null}
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.documentType}</span>
                    <select
                      value={documentType}
                      onChange={(event) => setDocumentType(event.target.value)}
                      disabled={!dealerTypeLoaded}
                      className="input-field disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {documentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    {!dealerTypeLoaded ? (
                      <p className="mt-2 text-xs font-medium text-gray-500">Checking your business tax status...</p>
                    ) : null}
                    {dealerTypeLoaded && isExemptDealer ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">Exempt businesses cannot use tax invoice document types.</p>
                    ) : null}
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.documentDescription}</span>
                    <textarea
                      rows={3}
                      value={documentDescription}
                      onChange={(event) => setDocumentDescription(event.target.value)}
                      placeholder={copy.documentDescriptionPlaceholder}
                      className="input-field resize-none"
                    />
                  </label>
                </div>
              </Panel>

              <Panel>
                <SectionTitle eyebrow={copy.serviceLines} title={copy.serviceLines} />
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700/75">{copy.serviceLines}</p>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-950">{lineItems.length}</p>
                  </div>
                  <div className="rounded-[24px] border border-sky-100 bg-sky-50/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700/75">{copy.subtotal}</p>
                    <p className="mt-2 text-2xl font-extrabold text-sky-950">{formatCurrency(subtotal, locale)}</p>
                  </div>
                  <div className="rounded-[24px] border border-violet-100 bg-violet-50/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700/75">{copy.ready || copy.total}</p>
                    <p className="mt-2 text-2xl font-extrabold text-violet-950">{readyServiceLines}/{lineItems.length}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {lineItems.map((item, index) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    const isExpanded = expandedLineItemId === item.id;
                    return (
                      <div key={item.id} className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-700 shadow-inner">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{copy.lineItem} {index + 1}</p>
                              <p className="mt-1 text-xs text-gray-500">{item.description || copy.documentDescriptionPlaceholder}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-2 shadow-sm">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/70">{copy.total}</p>
                              <p className="mt-1 text-base font-extrabold text-gray-950">{formatCurrency(lineTotal, locale)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm">
                              {`${Number(item.quantity) || 0} × ${formatCurrency(item.unitPrice, locale)}`}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedLineItemId(isExpanded ? null : item.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-slate-50"
                            >
                              {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                              {isExpanded ? copy.collapse : copy.expand}
                            </button>
                          </div>
                        </div>

                        {isExpanded ? (
                        <>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <label className="block lg:col-span-2">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.description}</span>
                            <div className="relative">
                              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                              <input value={item.description} onChange={(event) => updateLineItem(item.id, 'description', event.target.value)} className="input-field pl-12 rtl:pl-4 rtl:pr-12" />
                            </div>
                          </label>

                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.sku}</span>
                            <input value={item.sku} onChange={(event) => updateLineItem(item.id, 'sku', event.target.value)} className="input-field" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.unit}</span>
                            <select value={item.unit} onChange={(event) => updateLineItem(item.id, 'unit', event.target.value)} className="input-field">
                              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.quantity}</span>
                            <input type="number" min="0" step="1" value={item.quantity} onChange={(event) => updateLineItem(item.id, 'quantity', event.target.value)} className="input-field" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.unitPrice}</span>
                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateLineItem(item.id, 'unitPrice', event.target.value)} className="input-field" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.currency}</span>
                            <select value={item.currency} onChange={(event) => updateLineItem(item.id, 'currency', event.target.value)} className="input-field">
                              {currencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.id)}
                              disabled={lineItems.length === 1}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-4 w-4" />
                              {copy.remove}
                            </button>
                          </div>
                        </div>
                        </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <button type="button" onClick={addLineItem} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 sm:w-auto sm:justify-start">
                  <FiPlus className="h-4.5 w-4.5" />
                  {copy.addLine}
                </button>
              </Panel>

              {showPaymentDetails ? (
              <Panel>
                <SectionTitle eyebrow={copy.paymentDetails} title={copy.paymentDetails} subtitle={copy.paymentDetailsSubtitle} />
                <div className="mb-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                  <div className="rounded-[24px] border border-primary/10 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary/65">{copy.paymentDetails}</p>
                        <p className="mt-2 text-2xl font-extrabold text-gray-950">{formatCurrency(paidTotal, locale)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-500">{readyPayments}/{payments.length}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{copy.total}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paymentCoverage}%` }} />
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700/75">{copy.total}</p>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-950">{formatCurrency(total, locale)}</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700/75">{copy.amountDue}</p>
                    <p className="mt-2 text-2xl font-extrabold text-amber-950">{formatCurrency(amountDue, locale)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {payments.map((payment, index) => {
                    const showBankFields = showPaymentType && (payment.type === copy.bankTransfer || payment.type === copy.check);
                    const isExpanded = expandedPaymentId === payment.id;
                    return (
                      <div key={payment.id} className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary/5 p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary shadow-inner">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{payment.type || copy.paymentType}</p>
                              <p className="mt-1 text-xs text-gray-500">{payment.date || todayKey()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 self-start sm:self-auto">
                            <div className="rounded-2xl border border-primary/10 bg-white px-4 py-2 shadow-sm">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary/65">{copy.paymentAmount}</p>
                              <p className="mt-1 text-base font-extrabold text-gray-950">{formatCurrency(payment.amount, locale)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-slate-50"
                            >
                              {isExpanded ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                              {isExpanded ? copy.collapse : copy.expand}
                            </button>
                            <button
                              type="button"
                              onClick={() => removePaymentRow(payment.id)}
                              disabled={payments.length === 1}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-4 w-4" />
                              {copy.remove}
                            </button>
                          </div>
                        </div>
 
                        {isExpanded ? (
                        <>                           
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          {showPaymentType ? (
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.paymentType}</span>
                              <select value={payment.type} onChange={(event) => updatePayment(payment.id, 'type', event.target.value)} className="input-field">
                                {paymentTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </label>
                          ) : null}
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.paymentDate}</span>
                            <input type="date" value={payment.date} onChange={(event) => updatePayment(payment.id, 'date', event.target.value)} className="input-field" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.paymentAmount}</span>
                            <input type="number" min="0" step="0.01" value={payment.amount} onChange={(event) => updatePayment(payment.id, 'amount', event.target.value)} className="input-field" />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.currency}</span>
                            <select value={payment.currency} onChange={(event) => updatePayment(payment.id, 'currency', event.target.value)} className="input-field">
                              {currencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>
                        </div>

                        {showBankFields ? (
                          <div className="mt-4 rounded-[24px] border border-slate-100 bg-white/80 p-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <label className="block lg:col-span-3 xl:col-span-1">
                                <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.bankName}</span>
                                <input value={payment.bankName} onChange={(event) => updatePayment(payment.id, 'bankName', event.target.value)} className="input-field" />
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.branch}</span>
                                <input value={payment.branch} onChange={(event) => updatePayment(payment.id, 'branch', event.target.value)} className="input-field" />
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.accountNumber}</span>
                                <input value={payment.accountNumber} onChange={(event) => updatePayment(payment.id, 'accountNumber', event.target.value)} className="input-field" />
                              </label>
                            </div>
                          </div>
                        ) : null}
                        </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <button type="button" onClick={addPaymentRow} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 sm:w-auto sm:justify-start">
                  <FiPlus className="h-4.5 w-4.5" />
                  {copy.addPayment}
                </button>
              </Panel>
              ) : null}

              <Panel>
                <SectionTitle title={copy.notes} subtitle={copy.paymentTerms} />
                <div className="grid gap-6 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.paymentTerms}</span>
                    <textarea
                      rows={6}
                      value={paymentTerms}
                      onChange={(event) => setPaymentTerms(event.target.value)}
                      placeholder={copy.paymentTermsPlaceholder}
                      className="input-field resize-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.notes}</span>
                    <textarea
                      rows={6}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={copy.notesPlaceholder}
                      className="input-field resize-none"
                    />
                  </label>
                </div>
              </Panel>

              <Panel className="shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{copy.summary}</p>
                    <p className="mt-2 text-lg font-bold text-gray-950">{formatCurrency(total, locale)}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={saveDraft} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                      <FiSave className="h-4.5 w-4.5" />
                      {copy.saveDraft}
                    </button>
                    <button
                      type="button"
                      onClick={openPdfPreview}
                      disabled={!dealerTypeLoaded}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiPrinter className="h-4.5 w-4.5" />
                      {copy.generatePdf}
                    </button>
                  </div>
                </div>
              </Panel>

            </section>
          </div>
        </div>
      </main>
    </>
  );
}
