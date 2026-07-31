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
  FiLayers,
  FiPlus,
  FiPrinter,
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
import {
  claimInvoiceBuilderLock,
  getInvoiceBuilderDeviceId,
  releaseInvoiceBuilderLock,
  renewInvoiceBuilderLock,
  subscribeToInvoiceBuilderLock,
} from '../../lib/invoice-builder-lock';

function buildLineItem(index, description, currency) {
  return {
    id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    sku: '',
    description,
    quantity: 1,
    unitPrice: 0,
    currency,
    vatMode: 'before_vat',
  };
}

function buildPayment(index, type, currency) {
  return {
    id: `${Date.now()}_pay_${index}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    date: todayKey(),
    amount: 0,
    currency,
    details: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    cardName: '',
    cardNumber: '',
    cardExpiration: '',
    numberOfPayments: 1,
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
  return value === 'invoice' || value === 'invoice_receipt' || value === 'tax_invoice' || value === 'tax_invoice_receipt';
}

function normalizeDocumentType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'tax_invoice') return 'invoice';
  if (raw === 'tax_invoice_receipt') return 'invoice_receipt';
  return raw || 'receipt';
}

function normalizeNineDigitInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 9);
}

function getBankCode(value) {
  const normalizedValue = String(value || '').trim();
  const leadingCode = normalizedValue.match(/^(\d+)\s*-/);
  const trailingCode = normalizedValue.match(/-\s*(\d+)$/);
  return leadingCode?.[1] || trailingCode?.[1] || '';
}

function isValidClientTaxId(value) {
  const normalizedValue = String(value || '').trim();
  return normalizedValue === '' || normalizedValue === '0' || /^\d{9}$/.test(normalizedValue);
}

function requiredPlaceholder(label) {
  return `${label} *`;
}

function hasFieldValue(value) {
  return value !== undefined && value !== null && String(value).length > 0;
}

function floatingFieldClass(value, extraClassName = '') {
  return clsx('floating-field', hasFieldValue(value) && 'is-filled', extraClassName);
}

function normalizeLineItem(item, fallbackIndex = 0) {
  const normalizedVatMode = ['before_vat', 'after_vat', 'no_vat'].includes(item?.vatMode)
    ? item.vatMode
    : 'before_vat';

  return {
    id: item?.id || `${Date.now()}_${fallbackIndex}_${Math.random().toString(36).slice(2, 7)}`,
    sku: String(item?.sku || ''),
    description: String(item?.description || ''),
    quantity: Number(item?.quantity ?? 1),
    unitPrice: Number(item?.unitPrice ?? 0),
    currency: String(item?.currency || 'ILS'),
    vatMode: normalizedVatMode,
  };
}

function calculateLineAmounts(item, vatRate) {
  const quantity = Number(item?.quantity) || 0;
  const unitPrice = Number(item?.unitPrice) || 0;
  const rate = Math.max(Number(vatRate) || 0, 0) / 100;
  const rawLineAmount = quantity * unitPrice;

  if (item?.vatMode === 'after_vat') {
    const total = rawLineAmount;
    const subtotal = rate > 0 ? total / (1 + rate) : total;
    return {
      subtotal,
      vatAmount: Math.max(total - subtotal, 0),
      total,
    };
  }

  if (item?.vatMode === 'no_vat') {
    return {
      subtotal: rawLineAmount,
      vatAmount: 0,
      total: rawLineAmount,
    };
  }

  const vatAmount = rawLineAmount * rate;
  return {
    subtotal: rawLineAmount,
    vatAmount,
    total: rawLineAmount + vatAmount,
  };
}

function calculateInvoiceDiscount(subtotal, discountType, discountAmount) {
  const normalizedSubtotal = Math.max(Number(subtotal) || 0, 0);
  const normalizedDiscount = Math.max(Number(discountAmount) || 0, 0);
  const rawDiscount = discountType === 'fixed'
    ? normalizedDiscount
    : normalizedSubtotal * (Math.min(normalizedDiscount, 100) / 100);

  return Math.min(rawDiscount, normalizedSubtotal);
}

function documentTypeConfig(value) {
  switch (value) {
    case 'quote':
      return { showDueDate: true, showPaymentDetails: false, showPaymentType: false };
    case 'work_order':
      return { showDueDate: false, showPaymentDetails: false, showPaymentType: false };
    case 'receipt':
      return { showDueDate: false, showPaymentDetails: true, showPaymentType: true };
    case 'invoice':
    case 'tax_invoice':
      return { showDueDate: true, showPaymentDetails: false, showPaymentType: false };
    case 'invoice_receipt':
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
  const bankOptions = useMemo(() => [
    'יהב - 4',
    'U-Bank - 26',
    'בנק פאגי - 52',
    'בנק אוצר החייל - 14',
    'בנק וואן זירו - 18',
    'מזרחי-טפחות - 20',
    'מרכנתיל - 17',
    'בנק מסד - 46',
    'לאומי - 10',
    'בנק ירושלים - 54',
    'הפועלים - 12',
    'דיסקונט - 11',
    'הבינלאומי - 31',
    'בנק הדואר - 9',
    'סיטי בנק - 22',
    'בנק פועלי אגודת ישראל - פאגי - 52',
    'בנק ישראל - 99',
  ], []);
  const vatModeOptions = useMemo(() => ([
    { value: 'before_vat', label: copy.beforeVat },
    { value: 'after_vat', label: copy.afterVat },
    { value: 'no_vat', label: copy.noVat },
  ]), [copy.afterVat, copy.beforeVat, copy.noVat]);
  const discountTypeOptions = useMemo(() => ([
    { value: 'percent', label: '%' },
    { value: 'fixed', label: '₪' },
  ]), []);
  const paymentTypeOptions = useMemo(() => ([
    copy.cash,
    copy.card,
    copy.bankTransfer,
    copy.bit,
    copy.paybox,
    copy.otherPaymentMethod,
    copy.withholdingTax,
    copy.check,
  ]), [copy.bankTransfer, copy.bit, copy.card, copy.cash, copy.check, copy.otherPaymentMethod, copy.paybox, copy.withholdingTax]);
  const effectiveDealerType = dealerType || profileDealerType;
  const isExemptDealer = effectiveDealerType === 'exempt';
  const documentTypeOptions = useMemo(() => ([
    { value: 'quote', label: copy.quoteDoc },
    { value: 'work_order', label: copy.workOrderDoc },
    { value: 'receipt', label: copy.receiptDoc },
    { value: 'invoice', label: copy.taxInvoiceDoc },
    { value: 'invoice_receipt', label: copy.taxInvoiceReceiptDoc },
    { value: 'credit_note', label: copy.creditNoteDoc },
  ].filter((option) => {
    if (!dealerTypeLoaded && isTaxInvoiceDocumentType(option.value)) return false;
    if (isExemptDealer && isTaxInvoiceDocumentType(option.value)) return false;
    return true;
  })), [copy.creditNoteDoc, copy.quoteDoc, copy.receiptDoc, copy.taxInvoiceDoc, copy.taxInvoiceReceiptDoc, copy.workOrderDoc, dealerTypeLoaded, isExemptDealer]);
  const defaultLineItems = useMemo(
    () => [buildLineItem(0, copy.defaultLineDescription, 'ILS')],
    [copy.defaultLineDescription]
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
  const [clientUid, setClientUid] = useState('');
  const [documentType, setDocumentType] = useState('receipt');
  const [documentDescription, setDocumentDescription] = useState('');
  const [vatRate, setVatRate] = useState(18);
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [roundTotalEnabled, setRoundTotalEnabled] = useState(true);
  const [lineItems, setLineItems] = useState(defaultLineItems);
  const [payments, setPayments] = useState(defaultPayments);
  const [expandedLineItemId, setExpandedLineItemId] = useState(defaultLineItems[0]?.id || null);
  const [expandedPaymentId, setExpandedPaymentId] = useState(defaultPayments[0]?.id || null);
  const [openBankOptionsFor, setOpenBankOptionsFor] = useState(null);
  const [openBranchOptionsFor, setOpenBranchOptionsFor] = useState(null);
  const [bankBranchesById, setBankBranchesById] = useState({});
  const restoredDraftForUserRef = useRef('');
  const promptedCounterTypesRef = useRef({});
  const appliedClientPrefillRef = useRef('');
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [businessVerificationInfo, setBusinessVerificationInfo] = useState(null);
  const [invoiceBuilderAccess, setInvoiceBuilderAccess] = useState('checking');
  const { showDueDate, showPaymentDetails, showPaymentType } = useMemo(
    () => documentTypeConfig(documentType),
    [documentType]
  );
  const isReceipt = documentType === 'receipt';
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

        setBusinessVerificationInfo(verificationInfo);
        setVerificationStatus(verificationInfo ? (verificationStatus || 'pending') : 'not_submitted');
        setVerificationChecked(true);
      } catch (error) {
        if (!cancelled) {
          setBusinessVerificationInfo(null);
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
    if (!user?.uid || !isWorker || !canUseInvoiceBuilder) {
      setInvoiceBuilderAccess('checking');
      return undefined;
    }

    const deviceId = getInvoiceBuilderDeviceId();
    let active = true;
    let unsubscribe = () => {};
    let heartbeatId = null;

    async function claimAccess() {
      try {
        const result = await claimInvoiceBuilderLock(user.uid, deviceId);
        if (!active) {
          if (result.allowed) {
            releaseInvoiceBuilderLock(user.uid, deviceId).catch(() => {});
          }
          return;
        }

        setInvoiceBuilderAccess(result.allowed ? 'allowed' : 'blocked');
        if (!result.allowed) return;

        unsubscribe = subscribeToInvoiceBuilderLock(user.uid, (lock) => {
          if (!active) return;
          const isOwnedByThisDevice = lock?.deviceId === deviceId && Number(lock?.expiresAtMs || 0) > Date.now();
          if (!isOwnedByThisDevice) setInvoiceBuilderAccess('blocked');
        });

        heartbeatId = window.setInterval(async () => {
          try {
            const renewal = await renewInvoiceBuilderLock(user.uid, deviceId);
            if (active && !renewal.allowed) setInvoiceBuilderAccess('blocked');
          } catch (error) {
            // Keep the current page available during a temporary network interruption.
          }
        }, 20 * 1000);
      } catch (error) {
        if (active) setInvoiceBuilderAccess('blocked');
      }
    }

    claimAccess();

    return () => {
      active = false;
      unsubscribe();
      if (heartbeatId) window.clearInterval(heartbeatId);
      releaseInvoiceBuilderLock(user.uid, deviceId).catch(() => {});
    };
  }, [canUseInvoiceBuilder, isWorker, user?.uid]);

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
      setClientId(normalizeNineDigitInput(parsed.clientId || ''));
      setClientEmail(parsed.clientEmail || '');
      setClientPhone(parsed.clientPhone || '');
      setClientCity(parsed.clientCity || '');
      setClientUid(parsed.clientUid || '');
      setDocumentType(normalizeDocumentType(parsed.documentType));
      setDocumentDescription(parsed.documentDescription || '');
      setNotes(parsed.notes || parsed.paymentTerms || '');
      setDiscountType(parsed.discountType === 'fixed' ? 'fixed' : 'percent');
      setDiscountAmount(Number(parsed.discountInputAmount ?? parsed.discountAmount) || 0);
      setRoundTotalEnabled(parsed.roundTotalEnabled !== false);
      const nextLineItems = Array.isArray(parsed.lineItems) && parsed.lineItems.length > 0
        ? parsed.lineItems.map((item, index) => normalizeLineItem(item, index))
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
      setClientUid(rawClientUid);
      setClientId(normalizeNineDigitInput(clientBusinessId || ''));
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
    let cancelled = false;

    async function loadBankBranches() {
      try {
        const response = await fetch('/snifim_he.xml');
        if (!response.ok) throw new Error('Bank branches could not be loaded.');

        const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
        const nextBranchesById = Array.from(xml.querySelectorAll('branch')).reduce((branchesById, branch) => {
          const bankId = String(branch.querySelector('id')?.textContent || '').trim();
          const branchName = String(branch.querySelector('branch_name')?.textContent || '').trim();
          const branchCode = String(branch.querySelector('branch_code')?.textContent || '').trim();
          if (!bankId || !branchName || !branchCode) return branchesById;

          const option = `${branchName} - ${branchCode}`;
          if (!branchesById[bankId]) branchesById[bankId] = [];
          if (!branchesById[bankId].includes(option)) branchesById[bankId].push(option);
          return branchesById;
        }, {});

        if (!cancelled) setBankBranchesById(nextBranchesById);
      } catch (error) {
        if (!cancelled) setBankBranchesById({});
      }
    }

    loadBankBranches();

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

  const lineAmounts = useMemo(
    () => lineItems.map((item) => calculateLineAmounts(item, vatRate)),
    [lineItems, vatRate]
  );
  const subtotalBeforeDiscount = useMemo(
    () => lineAmounts.reduce((sum, item) => sum + item.subtotal, 0),
    [lineAmounts]
  );
  const vatAmountBeforeDiscount = useMemo(
    () => lineAmounts.reduce((sum, item) => sum + item.vatAmount, 0),
    [lineAmounts]
  );
  const invoiceDiscountAmount = useMemo(
    () => calculateInvoiceDiscount(subtotalBeforeDiscount, discountType, discountAmount),
    [discountAmount, discountType, subtotalBeforeDiscount]
  );
  const discountRatio = subtotalBeforeDiscount > 0 ? invoiceDiscountAmount / subtotalBeforeDiscount : 0;
  const subtotal = Math.max(subtotalBeforeDiscount - invoiceDiscountAmount, 0);
  const vatAmount = Math.max(vatAmountBeforeDiscount * (1 - discountRatio), 0);
  const calculatedTotal = useMemo(
    () => subtotal + vatAmount,
    [subtotal, vatAmount]
  );
  const paidTotal = useMemo(
    () => payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [payments]
  );
  const roundedTotal = useMemo(() => Math.round(calculatedTotal), [calculatedTotal]);
  const displayTotal = isReceipt ? paidTotal : (roundTotalEnabled ? roundedTotal : calculatedTotal);
  const roundingAdjustment = isReceipt ? 0 : displayTotal - calculatedTotal;
  const amountDue = Math.max(displayTotal - paidTotal, 0);
  const clientCompletion = [clientName, clientId, clientEmail, clientPhone, clientCity].filter(Boolean).length;

  if (loading || (user && isWorker && (!verificationChecked || (canUseInvoiceBuilder && invoiceBuilderAccess === 'checking')))) {
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

  if (invoiceBuilderAccess !== 'allowed') {
    return (
      <main className="relative overflow-hidden px-4 py-6 md:py-8">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="relative mx-auto max-w-3xl">
          <Panel className="shadow-soft text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/65">{copy.shortTitle}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl">{copy.deviceInUseTitle}</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">{copy.deviceInUseBody}</p>
          </Panel>
        </div>
      </main>
    );
  }

  function updateLineItem(id, field, value) {
    setLineItems((current) => current.map((item) => (
      item.id === id
        ? { ...item, [field]: field === 'description' || field === 'sku' || field === 'currency' || field === 'vatMode' ? value : Number(value) }
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
    const nextItem = buildLineItem(lineItems.length, '', 'ILS');
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

  function buildInvoicePayload() {
    return {
      invoiceNumber,
      issueDate,
      dueDate,
      clientName,
      clientUid,
      clientId,
      clientEmail,
      clientPhone,
      clientCity,
      documentType,
      documentDescription,
      vatRate: Number(vatRate) || 0,
      notes,
      discountType: isReceipt ? 'percent' : discountType,
      discountAmount: isReceipt ? 0 : invoiceDiscountAmount,
      discountInputAmount: isReceipt ? 0 : Number(discountAmount) || 0,
      subtotal: isReceipt ? paidTotal : subtotal,
      subtotalBeforeDiscount: isReceipt ? paidTotal : subtotalBeforeDiscount,
      vatAmount: isReceipt ? 0 : vatAmount,
      vatAmountBeforeDiscount: isReceipt ? 0 : vatAmountBeforeDiscount,
      total: displayTotal,
      calculatedTotal: isReceipt ? paidTotal : calculatedTotal,
      roundingAdjustment,
      roundTotalEnabled: isReceipt ? false : roundTotalEnabled,
      paidTotal,
      amountDue,
      locale,
      createdBy: {
        id: businessVerificationInfo?.businessId || profile?.businessId || user?.uid || '',
        name: businessVerificationInfo?.businessName || profile?.name || 'Hiro Pro',
        dealerType: businessVerificationInfo?.dealerType || profile?.dealerType || '',
        address: businessVerificationInfo?.address || profile?.town || profile?.city || '',
        phone: profile?.phone || '',
        email: profile?.email || user?.email || '',
        city: profile?.town || profile?.city || '',
      },
      lineItems: isReceipt ? [] : lineItems.map((item, index) => ({
        ...item,
        vatMode: item.vatMode || 'before_vat',
        lineSubtotal: lineAmounts[index]?.subtotal || 0,
        lineVatAmount: lineAmounts[index]?.vatAmount || 0,
        lineTotal: lineAmounts[index]?.total || 0,
      })),
      payments,
    };
  }

  function validateInvoiceBeforePreview() {
    if (!clientName.trim()) {
      toast.error(copy.clientNameRequired);
      return false;
    }

    if (!isValidClientTaxId(clientId)) {
      toast.error(copy.clientIdInvalid);
      return false;
    }

    const invalidLineIndex = isReceipt ? -1 : lineItems.findIndex((item) => {
      const description = String(item?.description || '').trim();
      const quantity = Number(item?.quantity);
      const unitPrice = Number(item?.unitPrice);

      return !description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0;
    });

    if (invalidLineIndex !== -1) {
      setExpandedLineItemId(lineItems[invalidLineIndex]?.id || null);
      toast.error(copy.serviceLineRequired);
      return false;
    }

    if (showPaymentDetails) {
      const invalidPaymentIndex = payments.findIndex((payment) => {
        const amount = Number(payment?.amount);
        return !Number.isFinite(amount) || amount <= 0;
      });

      if (invalidPaymentIndex !== -1) {
        setExpandedPaymentId(payments[invalidPaymentIndex]?.id || null);
        toast.error(copy.paymentAmountRequired);
        return false;
      }

      const roundedTotal = Math.round(displayTotal * 100);
      const roundedPaidTotal = Math.round(paidTotal * 100);
      if (!isReceipt && roundedTotal !== roundedPaidTotal) {
        toast.error(copy.paymentTotalMustMatch);
        return false;
      }
    }

    return true;
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
    if (!validateInvoiceBeforePreview()) {
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
                  <label className={floatingFieldClass(clientName, 'floating-field--icon')}>
                    <div className="relative">
                      <span className="floating-field__label">{requiredPlaceholder(copy.clientName)}</span>
                      <FiUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input
                        value={clientName}
                        onChange={(event) => setClientName(event.target.value)}
                        placeholder=" "
                        aria-label={copy.clientName}
                        className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                      />
                    </div>
                  </label>
                  <label className={floatingFieldClass(clientId, 'floating-field--icon')}>
                    <div className="relative">
                      <span className="floating-field__label">{copy.clientId}</span>
                      <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input
                        value={clientId}
                        onChange={(event) => setClientId(normalizeNineDigitInput(event.target.value))}
                        placeholder=" "
                        aria-label={copy.clientId}
                        inputMode="numeric"
                        pattern="0|[0-9]{9}"
                        maxLength={9}
                        className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                      />
                    </div>
                  </label>
                  <label className={floatingFieldClass(clientEmail)}>
                    <span className="floating-field__label">{copy.clientEmail}</span>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(event) => setClientEmail(event.target.value)}
                      placeholder=" "
                      aria-label={copy.clientEmail}
                      className="input-field"
                    />
                  </label>
                  <label className={floatingFieldClass(clientPhone)}>
                    <span className="floating-field__label">{copy.clientPhone}</span>
                    <input
                      value={clientPhone}
                      onChange={(event) => setClientPhone(event.target.value)}
                      placeholder=" "
                      aria-label={copy.clientPhone}
                      className="input-field"
                    />
                  </label>
                  <label className={floatingFieldClass(clientCity, 'md:col-span-2')}>
                    <span className="floating-field__label">{copy.city}</span>
                    <input
                      value={clientCity}
                      onChange={(event) => setClientCity(event.target.value)}
                      placeholder=" "
                      aria-label={copy.city}
                      className="input-field"
                    />
                  </label>
                </div>
              </Panel>

              <Panel>
                <SectionTitle eyebrow={copy.invoiceProfile} title={copy.invoiceDetails} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={floatingFieldClass(issueDate, 'floating-field--icon')}>
                    <div className="relative">
                      <span className="floating-field__label">{copy.issueDate}</span>
                      <FiCalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(event) => setIssueDate(event.target.value)}
                        aria-label={copy.issueDate}
                        className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                      />
                    </div>
                  </label>
                  {showDueDate ? (
                    <label className={floatingFieldClass(dueDate, 'floating-field--icon')}>
                      <div className="relative">
                        <span className="floating-field__label">{copy.dueDate}</span>
                        <FiCalendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                          aria-label={copy.dueDate}
                          className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                        />
                      </div>
                    </label>
                  ) : null}
                  <label className={floatingFieldClass(documentType)}>
                    <div className="relative">
                      <span className="floating-field__label">{copy.documentType}</span>
                      <select
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value)}
                        disabled={!dealerTypeLoaded}
                        aria-label={copy.documentType}
                        className="input-field appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-60 rtl:pr-4 rtl:pl-10"
                      >
                        {documentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:right-auto rtl:left-3" />
                    </div>
                    {!dealerTypeLoaded ? (
                      <p className="mt-2 text-xs font-medium text-gray-500">Checking your business tax status...</p>
                    ) : null}
                    {dealerTypeLoaded && isExemptDealer ? (
                      <p className="mt-2 text-xs font-medium text-amber-700">Exempt businesses cannot use tax invoice document types.</p>
                    ) : null}
                  </label>
                  <label className={floatingFieldClass(documentDescription, 'floating-field--textarea md:col-span-2')}>
                    <span className="floating-field__label">{copy.documentDescription}</span>
                    <textarea
                      rows={3}
                      value={documentDescription}
                      onChange={(event) => setDocumentDescription(event.target.value)}
                      placeholder=" "
                      aria-label={copy.documentDescription}
                      className="input-field resize-none"
                    />
                  </label>
                </div>
              </Panel>

              {!isReceipt ? (
              <Panel>
                <SectionTitle eyebrow={copy.serviceLines} title={copy.serviceLines} />
                <div className="space-y-4">
                  {lineItems.map((item, index) => {
                    const lineAmount = lineAmounts[index] || calculateLineAmounts(item, vatRate);
                    const lineTotal = lineAmount.total;
                    const isExpanded = expandedLineItemId === item.id;
                    return (
                      <div key={item.id} className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 p-4 shadow-sm transition-colors hover:border-emerald-200 sm:p-5">
                        <div
                          className="mb-4 flex cursor-pointer flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between"
                          onClick={() => setExpandedLineItemId(isExpanded ? null : item.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setExpandedLineItemId(isExpanded ? null : item.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
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
                            <FiChevronDown className={clsx('h-5 w-5 self-center text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                          </div>
                        </div>

                        {isExpanded ? (
                        <div onClick={(event) => event.stopPropagation()}>
                        <div className="grid gap-4 md:grid-cols-[minmax(150px,0.45fr)_minmax(260px,1fr)]">
                          <label className={floatingFieldClass(item.sku)}>
                            <span className="floating-field__label">{copy.sku}</span>
                            <input
                              value={item.sku}
                              onChange={(event) => updateLineItem(item.id, 'sku', event.target.value)}
                              placeholder=" "
                              aria-label={copy.sku}
                              className="input-field"
                            />
                          </label>
                          <label className={floatingFieldClass(item.description, 'floating-field--icon')}>
                            <div className="relative">
                              <span className="floating-field__label">{requiredPlaceholder(copy.description)}</span>
                              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 rtl:left-auto rtl:right-4" />
                              <input
                                value={item.description}
                                onChange={(event) => updateLineItem(item.id, 'description', event.target.value)}
                                placeholder=" "
                                aria-label={copy.description}
                                className="input-field pl-12 rtl:pl-4 rtl:pr-12"
                              />
                            </div>
                          </label>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-[minmax(86px,0.45fr)_minmax(130px,0.7fr)_minmax(130px,0.7fr)_minmax(78px,0.42fr)_auto]">
                          <label className={floatingFieldClass(item.quantity)}>
                            <span className="floating-field__label">{requiredPlaceholder(copy.quantity)}</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity}
                              onChange={(event) => updateLineItem(item.id, 'quantity', event.target.value)}
                              placeholder=" "
                              aria-label={copy.quantity}
                              className="input-field"
                            />
                          </label>
                          <label className={floatingFieldClass(item.unitPrice)}>
                            <span className="floating-field__label">{requiredPlaceholder(copy.unitPrice)}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(event) => updateLineItem(item.id, 'unitPrice', event.target.value)}
                              placeholder=" "
                              aria-label={copy.unitPrice}
                              className="input-field"
                            />
                          </label>
                          <label className={floatingFieldClass(item.vatMode)}>
                            <div className="relative">
                              <span className="floating-field__label">{copy.vatMode}</span>
                              <select
                                value={item.vatMode || 'before_vat'}
                                onChange={(event) => updateLineItem(item.id, 'vatMode', event.target.value)}
                                aria-label={copy.vatMode}
                                className="input-field min-w-0 appearance-none px-3 pr-9 text-sm"
                              >
                                {vatModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:right-auto rtl:left-3" />
                            </div>
                          </label>
                          <label className={floatingFieldClass(item.currency)}>
                            <div className="relative">
                              <span className="floating-field__label">{copy.currency}</span>
                              <select
                                value={item.currency}
                                onChange={(event) => updateLineItem(item.id, 'currency', event.target.value)}
                                aria-label={copy.currency}
                                className="input-field min-w-0 appearance-none px-3 pr-9 text-sm"
                              >
                                {currencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:right-auto rtl:left-3" />
                            </div>
                          </label>
                          <div className="col-span-2 flex items-end md:col-span-1">
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
                        </div>
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
              ) : null}

              {showPaymentDetails ? (
              <Panel className={openBankOptionsFor || openBranchOptionsFor ? 'relative z-30' : 'relative z-0'}>
                <SectionTitle eyebrow={copy.paymentDetails} title={copy.paymentDetails} subtitle={copy.paymentDetailsSubtitle} />
                <div className="space-y-4">
                  {payments.map((payment, index) => {
                    const showBankFields = showPaymentType && payment.type === copy.bankTransfer;
                    const showCardFields = showPaymentType && payment.type === copy.card;
                    const isExpanded = expandedPaymentId === payment.id;
                    const filteredBankOptions = bankOptions.filter((option) => (
                      option.toLocaleLowerCase().includes(String(payment.bankName || '').toLocaleLowerCase())
                    ));
                    const selectedBankCode = getBankCode(payment.bankName);
                    const branchOptions = bankBranchesById[selectedBankCode] || [];
                    const filteredBranchOptions = branchOptions.filter((option) => (
                      option.toLocaleLowerCase().includes(String(payment.branch || '').toLocaleLowerCase())
                    ));
                    return (
                      <div key={payment.id} className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-primary/5 p-4 shadow-sm transition-colors hover:border-primary/20 sm:p-5">
                        <div
                          className="mb-4 flex cursor-pointer flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between"
                          onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setExpandedPaymentId(isExpanded ? null : payment.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                        >
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
                            <FiChevronDown className={clsx('h-5 w-5 self-center text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removePaymentRow(payment.id);
                              }}
                              disabled={payments.length === 1}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-4 w-4" />
                              {copy.remove}
                            </button>
                          </div>
                        </div>
 
                        {isExpanded ? (
                        <div onClick={(event) => event.stopPropagation()}>
                        <div className="grid w-fit max-w-full gap-4 sm:grid-cols-[180px_150px] xl:grid-cols-[180px_150px_140px_560px]">
                          {showPaymentType ? (
                            <label className={floatingFieldClass(payment.type)}>
                              <div className="relative">
                                <span className="floating-field__label">{copy.paymentType}</span>
                                <select
                                  value={payment.type}
                                  onChange={(event) => updatePayment(payment.id, 'type', event.target.value)}
                                  aria-label={copy.paymentType}
                                  className="input-field appearance-none pr-10 rtl:pr-4 rtl:pl-10"
                                >
                                  {paymentTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:right-auto rtl:left-3" />
                              </div>
                            </label>
                          ) : null}
                          <label className={floatingFieldClass(payment.date)}>
                            <span className="floating-field__label">{copy.paymentDate}</span>
                            <input
                              type="date"
                              value={payment.date}
                              onChange={(event) => updatePayment(payment.id, 'date', event.target.value)}
                              aria-label={copy.paymentDate}
                              className="input-field"
                            />
                          </label>
                          <label className={floatingFieldClass(payment.amount)}>
                            <span className="floating-field__label">{requiredPlaceholder(copy.paymentAmount)}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={payment.amount}
                              onChange={(event) => updatePayment(payment.id, 'amount', event.target.value)}
                              placeholder=" "
                              aria-label={copy.paymentAmount}
                              className="input-field"
                            />
                          </label>
                          <label className={floatingFieldClass(payment.details, 'sm:col-span-2 xl:col-span-1')}>
                            <span className="floating-field__label">{copy.extraDetails}</span>
                            <input
                              value={payment.details || ''}
                              onChange={(event) => updatePayment(payment.id, 'details', event.target.value)}
                              placeholder=" "
                              aria-label={copy.extraDetails}
                              className="input-field"
                            />
                          </label>
                        </div>

                        {showBankFields ? (
                          <div className="mt-4 rounded-[24px] border border-slate-100 bg-white/80 p-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <label className={floatingFieldClass(payment.bankName, 'lg:col-span-3 xl:col-span-1')}>
                                <div className="relative">
                                  <span className="floating-field__label">{copy.bankName}</span>
                                  <input
                                    value={payment.bankName}
                                    onChange={(event) => {
                                      updatePayment(payment.id, 'bankName', event.target.value);
                                      updatePayment(payment.id, 'branch', '');
                                      setOpenBankOptionsFor(payment.id);
                                    }}
                                    onFocus={() => setOpenBankOptionsFor(payment.id)}
                                    onBlur={() => {
                                      if (!bankOptions.includes(payment.bankName)) {
                                        updatePayment(payment.id, 'bankName', '');
                                        updatePayment(payment.id, 'branch', '');
                                      }
                                      setOpenBankOptionsFor(null);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Escape') setOpenBankOptionsFor(null);
                                    }}
                                    placeholder=" "
                                    aria-label={copy.bankName}
                                    role="combobox"
                                    aria-autocomplete="list"
                                    aria-controls={`bank-options-${payment.id}`}
                                    aria-expanded={openBankOptionsFor === payment.id}
                                    className="input-field"
                                  />
                                  {openBankOptionsFor === payment.id ? (
                                    <div id={`bank-options-${payment.id}`} className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg" role="listbox" aria-label={copy.bankName}>
                                      {filteredBankOptions.length > 0 ? filteredBankOptions.map((option) => (
                                        <button
                                          key={option}
                                          type="button"
                                          role="option"
                                          aria-selected={payment.bankName === option}
                                          onMouseDown={(event) => event.preventDefault()}
                                          onClick={() => {
                                            updatePayment(payment.id, 'bankName', option);
                                            updatePayment(payment.id, 'branch', '');
                                            setOpenBankOptionsFor(null);
                                          }}
                                          className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-sky-50 focus:bg-sky-50 focus:outline-none rtl:text-right"
                                        >
                                          {option}
                                        </button>
                                      )) : (
                                        <p className="px-4 py-3 text-sm text-slate-500">{copy.noResults || 'No matching banks'}</p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </label>
                              <label className={floatingFieldClass(payment.branch)}>
                                <div className="relative">
                                  <span className="floating-field__label">{copy.branch}</span>
                                  <input
                                    value={payment.branch}
                                    onChange={(event) => {
                                      updatePayment(payment.id, 'branch', event.target.value);
                                      setOpenBranchOptionsFor(payment.id);
                                    }}
                                    onFocus={() => setOpenBranchOptionsFor(payment.id)}
                                    onBlur={() => {
                                      if (!branchOptions.includes(payment.branch)) {
                                        updatePayment(payment.id, 'branch', '');
                                      }
                                      setOpenBranchOptionsFor(null);
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Escape') setOpenBranchOptionsFor(null);
                                    }}
                                    placeholder=" "
                                    aria-label={copy.branch}
                                    role="combobox"
                                    aria-autocomplete="list"
                                    aria-controls={`branch-options-${payment.id}`}
                                    aria-expanded={openBranchOptionsFor === payment.id}
                                    disabled={!selectedBankCode}
                                    className="input-field disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  {openBranchOptionsFor === payment.id && selectedBankCode ? (
                                    <div id={`branch-options-${payment.id}`} className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg" role="listbox" aria-label={copy.branch}>
                                      {filteredBranchOptions.length > 0 ? filteredBranchOptions.map((option) => (
                                        <button
                                          key={option}
                                          type="button"
                                          role="option"
                                          aria-selected={payment.branch === option}
                                          onMouseDown={(event) => event.preventDefault()}
                                          onClick={() => {
                                            updatePayment(payment.id, 'branch', option);
                                            setOpenBranchOptionsFor(null);
                                          }}
                                          className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-sky-50 focus:bg-sky-50 focus:outline-none rtl:text-right"
                                        >
                                          {option}
                                        </button>
                                      )) : (
                                        <p className="px-4 py-3 text-sm text-slate-500">{copy.noResults || 'No matching branches'}</p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </label>
                              <label className={floatingFieldClass(payment.accountNumber)}>
                                <span className="floating-field__label">{copy.accountNumber}</span>
                                <input
                                  value={payment.accountNumber}
                                  onChange={(event) => updatePayment(payment.id, 'accountNumber', event.target.value.replace(/\D/g, ''))}
                                  placeholder=" "
                                  aria-label={copy.accountNumber}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="input-field"
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}
                        {showCardFields ? (
                          <div className="mt-4 rounded-[24px] border border-slate-100 bg-white/80 p-4">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_170px_150px]">
                              <label className={floatingFieldClass(payment.cardName)}>
                                <span className="floating-field__label">{copy.cardName}</span>
                                <input
                                  value={payment.cardName}
                                  onChange={(event) => updatePayment(payment.id, 'cardName', event.target.value)}
                                  placeholder=" "
                                  aria-label={copy.cardName}
                                  className="input-field"
                                />
                              </label>
                              <label className={floatingFieldClass(payment.cardNumber)}>
                                <span className="floating-field__label">{copy.cardNumber}</span>
                                <input
                                  value={payment.cardNumber}
                                  onChange={(event) => updatePayment(payment.id, 'cardNumber', event.target.value.replace(/\D/g, ''))}
                                  placeholder=" "
                                  aria-label={copy.cardNumber}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className="input-field"
                                />
                              </label>
                              <label className={floatingFieldClass(payment.cardExpiration)}>
                                <span className="floating-field__label">{copy.cardExpiration}</span>
                                <input
                                  type="text"
                                  value={payment.cardExpiration}
                                  onChange={(event) => {
                                    let digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                                    if (digits.length === 1 && Number(digits) >= 2) {
                                      digits = `0${digits}`;
                                    }
                                    if (digits.length >= 2 && (Number(digits.slice(0, 2)) < 1 || Number(digits.slice(0, 2)) > 12)) {
                                      digits = digits[0] === '1' && Number(digits[1]) >= 3
                                        ? `01${digits.slice(1)}`.slice(0, 4)
                                        : digits.slice(0, 1);
                                    }
                                    const value = digits.length >= 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                                    updatePayment(payment.id, 'cardExpiration', value);
                                  }}
                                  aria-label={copy.cardExpiration}
                                  inputMode="numeric"
                                  maxLength={5}
                                  className="input-field"
                                />
                              </label>
                              <label className={floatingFieldClass(payment.numberOfPayments)}>
                                <span className="floating-field__label">{copy.numberOfPayments}</span>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={payment.numberOfPayments ?? 1}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    updatePayment(payment.id, 'numberOfPayments', Number.isFinite(value) && value >= 1 ? value : 1);
                                  }}
                                  onBlur={(event) => {
                                    if (Number(event.target.value) < 1) updatePayment(payment.id, 'numberOfPayments', 1);
                                  }}
                                  aria-label={copy.numberOfPayments}
                                  className="input-field"
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}
                        </div>                           
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
                <SectionTitle title={copy.notes} />
                <label className={floatingFieldClass(notes, 'floating-field--textarea')}>
                  <span className="floating-field__label">{copy.notes}</span>
                  <textarea
                    rows={6}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder=" "
                    aria-label={copy.notes}
                    className="input-field resize-none"
                  />
                </label>
              </Panel>

              <Panel className="shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">{copy.summary}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <p className="text-lg font-bold text-gray-950">{formatCurrency(displayTotal, locale)}</p>
                        {!isReceipt && invoiceDiscountAmount > 0 ? (
                          <p className="mt-1 text-xs font-medium text-gray-400">
                            {copy.discountType}: -{formatCurrency(invoiceDiscountAmount, locale)}
                          </p>
                        ) : null}
                        {!isReceipt && roundTotalEnabled && Math.abs(roundingAdjustment) >= 0.01 ? (
                          <p className="mt-1 text-xs font-medium text-gray-400">
                            {copy.roundingAdjustment}: {formatCurrency(roundingAdjustment, locale)}
                          </p>
                        ) : null}
                      </div>
                      {!isReceipt ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRoundTotalEnabled((current) => !current)}
                          aria-pressed={roundTotalEnabled}
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                            roundTotalEnabled
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {roundTotalEnabled ? copy.roundTotalOn : copy.roundTotalOff}
                        </button>
                        <label className={floatingFieldClass(discountType, 'w-24')}>
                          <div className="relative">
                            <span className="floating-field__label">{copy.discountType}</span>
                            <select
                              value={discountType}
                              onChange={(event) => setDiscountType(event.target.value)}
                              aria-label={copy.discountType}
                              className="input-field min-w-0 appearance-none px-3 pr-9 text-sm"
                            >
                              {discountTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 rtl:right-auto rtl:left-3" />
                          </div>
                        </label>
                        <label className={floatingFieldClass(discountAmount, 'w-36')}>
                          <span className="floating-field__label">{copy.discountAmount}</span>
                          <input
                            type="number"
                            min="0"
                            max={discountType === 'percent' ? '100' : undefined}
                            step="0.01"
                            value={discountAmount}
                            onChange={(event) => setDiscountAmount(Number(event.target.value))}
                            placeholder=" "
                            aria-label={copy.discountAmount}
                            className="input-field"
                          />
                        </label>
                      </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
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
