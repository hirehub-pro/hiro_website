import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiDownload, FiEdit3, FiExternalLink, FiPrinter, FiSend, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { storage } from '../../../lib/firebase';
import { createDocumentSigningLink } from '../../../lib/documentSigning';
import { getAllocationNumberMinAmountBeforeVat, saveUserInvoice } from '../../../lib/firestore';
import { formatCurrency, getInvoicePreviewStorageKey } from '../../../lib/invoices';
import {
  createTaxAuthorityAuthorizationUrl,
  getTaxAuthorityConnectionStatus,
  requestTaxInvoiceAllocation,
} from '../../../lib/taxAuthority';

const INVOICE_PREVIEW_WIDTH = 794;
const INVOICE_PREVIEW_HEIGHT = 1123;
const INVOICE_PREVIEW_PAGE_GAP = 24;
const SINGLE_INVOICE_PAGE_ITEM_LIMIT = 11;
const FIRST_INVOICE_PAGE_ITEM_LIMIT = 14;
const CONTINUATION_INVOICE_PAGE_ITEM_LIMIT = 18;
const FINAL_INVOICE_PAGE_ITEM_LIMIT = 10;
const MIN_FINAL_INVOICE_PAGE_ITEMS = 1;

function DetailCard({ title, lines, tint = 'white', align = 'right' }) {
  const tone = tint === 'blue'
    ? 'bg-[#dcebfa]'
    : 'bg-[#f6f6f7]';

  return (
    <div className={`rounded-[11px] ${tone} p-[13px]`}>
      <p className={`text-[17px] leading-[20px] text-[#3f73ba] ${align === 'right' ? 'text-right' : 'text-left'}`}>{title}</p>
      <div className={`mt-2 space-y-0.5 text-[#2f3441] ${align === 'right' ? 'text-right' : 'text-left'}`}>
        {lines.map((line, index) => (
          line ? (
            <p key={`${title}_${index}`} className={index === 0 ? 'text-[20px] font-medium leading-[24px]' : 'text-[15px] leading-[18px]'}>
              {line}
            </p>
          ) : null
        ))}
      </div>
    </div>
  );
}

function detailLine(label, value) {
  const normalizedValue = String(value || '').trim();
  return normalizedValue ? `${label}: ${normalizedValue}` : '';
}

function businessRegistrationLabel(dealerType) {
  switch (String(dealerType || '').trim().toLowerCase()) {
    case 'exempt':
      return 'עוסק פטור';
    case 'company':
      return 'חברה בע״מ';
    case 'licensed':
    default:
      return 'עוסק מורשה';
  }
}

function getPdfFilePrefix(docType) {
  if (docType === 'quote') return 'quote';
  if (docType === 'work_order') return 'work_order';
  return 'invoice';
}

function normalizePreviewDocType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'tax_invoice') return 'invoice';
  if (raw === 'tax_invoice_receipt') return 'invoice_receipt';
  return raw || 'receipt';
}

function formatFooterGeneratedAt(value) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value).replace(',', '').replace(/\./g, '/');
}

function formatFooterDueDate(value) {
  const raw = String(value || '').trim();
  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return `${day}/${month}/${year}`;
  }
  return raw.replace(/-/g, '/');
}

function isBankTransferPayment(payment) {
  const method = String(payment?.type || '').trim().toLocaleLowerCase();
  return Boolean(payment?.bankName || payment?.branch || payment?.accountNumber)
    || method.includes('bank')
    || method.includes('העברה')
    || method.includes('تحويل');
}

function isCheckPayment(payment) {
  const method = String(payment?.type || '').trim().toLocaleLowerCase();
  return Boolean(payment?.checkNumber)
    || method.includes('check')
    || method.includes('צ׳ק')
    || method.includes('شيك');
}

function buildInvoiceItemPages(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (normalizedItems.length <= SINGLE_INVOICE_PAGE_ITEM_LIMIT) {
    return [{ items: normalizedItems, startIndex: 0 }];
  }

  const firstPageItemCount = Math.min(
    FIRST_INVOICE_PAGE_ITEM_LIMIT,
    Math.max(1, normalizedItems.length - MIN_FINAL_INVOICE_PAGE_ITEMS)
  );
  const pages = [{
    items: normalizedItems.slice(0, firstPageItemCount),
    startIndex: 0,
  }];
  let nextIndex = firstPageItemCount;

  while (normalizedItems.length - nextIndex > FINAL_INVOICE_PAGE_ITEM_LIMIT + 2) {
    const remainingItems = normalizedItems.length - nextIndex;
    const pageSize = Math.min(
      CONTINUATION_INVOICE_PAGE_ITEM_LIMIT,
      remainingItems - FINAL_INVOICE_PAGE_ITEM_LIMIT
    );

    pages.push({
      items: normalizedItems.slice(nextIndex, nextIndex + pageSize),
      startIndex: nextIndex,
    });
    nextIndex += pageSize;
  }

  pages.push({
    items: normalizedItems.slice(nextIndex),
    startIndex: nextIndex,
  });

  return pages;
}

async function buildInvoicePdfBlob(element) {
  await document.fonts?.ready;

  const captureElement = element.cloneNode(true);
  captureElement.style.position = 'fixed';
  captureElement.style.left = '-10000px';
  captureElement.style.top = '0';
  captureElement.style.width = `${INVOICE_PREVIEW_WIDTH}px`;
  captureElement.style.minHeight = `${INVOICE_PREVIEW_HEIGHT}px`;
  captureElement.style.height = 'auto';
  captureElement.style.maxWidth = 'none';
  captureElement.style.transform = 'none';
  captureElement.style.transformOrigin = 'top left';
  captureElement.style.gap = '0';
  captureElement.querySelectorAll('.invoice-preview-page').forEach((page) => {
    page.style.boxShadow = 'none';
  });
  document.body.appendChild(captureElement);

  let canvas;
  try {
    const captureHeight = Math.max(
      INVOICE_PREVIEW_HEIGHT,
      captureElement.scrollHeight,
      captureElement.getBoundingClientRect().height
    );

    canvas = await html2canvas(captureElement, {
      backgroundColor: '#ffffff',
      scale: Math.min(1.5, Math.max(1.15, window.devicePixelRatio || 1)),
      useCORS: true,
      logging: false,
      width: INVOICE_PREVIEW_WIDTH,
      height: captureHeight,
      windowWidth: INVOICE_PREVIEW_WIDTH,
      windowHeight: captureHeight,
    });
  } finally {
    captureElement.remove();
  }

  const pdfWidth = 595.28;
  const pdfHeight = 841.89;
  const pdf = new jsPDF({
    compress: true,
    format: 'a4',
    orientation: 'portrait',
    unit: 'pt',
  });

  const canvasPageHeight = Math.floor(canvas.width * (pdfHeight / pdfWidth));
  const pageCanvas = document.createElement('canvas');
  const pageContext = pageCanvas.getContext('2d');
  if (!pageContext) {
    throw new Error('Could not prepare invoice PDF pages');
  }
  pageCanvas.width = canvas.width;

  let renderedHeight = 0;
  let pageIndex = 0;

  while (renderedHeight < canvas.height) {
    const sliceHeight = Math.min(canvasPageHeight, canvas.height - renderedHeight);
    pageCanvas.height = sliceHeight;
    pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      renderedHeight,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    );

    if (pageIndex > 0) {
      pdf.addPage();
    }

    const pageImageData = pageCanvas.toDataURL('image/jpeg', 0.88);
    const renderedPdfHeight = (sliceHeight / canvasPageHeight) * pdfHeight;
    pdf.addImage(pageImageData, 'JPEG', 0, 0, pdfWidth, renderedPdfHeight, undefined, 'FAST');

    renderedHeight += sliceHeight;
    pageIndex += 1;
  }

  return pdf.output('blob');
}

export default function InvoicePreviewPage() {
  const router = useRouter();
  const { user, isWorker, loading } = useAuth();
  const { t, locale, dir } = useLanguage();
  const copy = t.invoices;
  const isRtl = dir === 'rtl';
  const openedFromSaved = router.query.source === 'saved';
  const [invoice, setInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [taxStatus, setTaxStatus] = useState(null);
  const [taxActionLoading, setTaxActionLoading] = useState(false);
  const [taxAllocation, setTaxAllocation] = useState(null);
  const [allocationConnectionPrompt, setAllocationConnectionPrompt] = useState(null);
  const [signingLinkLoading, setSigningLinkLoading] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const invoiceContentRef = useRef(null);
  const savedInvoiceUrl = invoice?.savedInvoiceUrl || '';
  const savedInvoiceFileName = invoice?.savedFileName || `${invoice?.invoiceNumber || 'invoice'}.pdf`;
  const shouldUseStoredPdf = openedFromSaved && Boolean(savedInvoiceUrl);
  const docType = normalizePreviewDocType(invoice?.documentType || invoice?.docType);
  const isReceipt = docType === 'receipt';
  const canRequestTaxAllocation = docType === 'invoice' || docType === 'invoice_receipt';
  const canRequestSignature = docType === 'quote' || docType === 'work_order';
  const allocationNumber = taxAllocation?.confirmationNumber || invoice?.allocationNumber || invoice?.taxAuthorityAllocationNumber || '';
  const docTypeLabel = (
    docType === 'invoice'
      ? copy.taxInvoiceDoc
      : docType === 'invoice_receipt'
        ? copy.taxInvoiceReceiptDoc
        : docType === 'credit_note'
          ? copy.creditNoteDoc
          : docType === 'quote'
            ? copy.quoteDoc
            : docType === 'work_order'
              ? copy.workOrderDoc
          : copy.receiptDoc
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin?next=%2Fworker%2Finvoices%2Fpreview');
      return;
    }

    if (!loading && user && !isWorker) {
      router.replace('/');
    }
  }, [isWorker, loading, router, user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const previewStorageKey = getInvoicePreviewStorageKey(user.uid);
    const storedPreview = window.localStorage.getItem(previewStorageKey);
    if (!storedPreview) return;

    try {
      setInvoice(JSON.parse(storedPreview));
    } catch (error) {
      setInvoice(null);
    }
  }, [user]);

  useEffect(() => {
    setIsSaved(openedFromSaved);
  }, [openedFromSaved]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    function updatePreviewScale() {
      const horizontalPadding = window.innerWidth < 640 ? 24 : 64;
      const availableWidth = Math.max(280, window.innerWidth - horizontalPadding);
      setPreviewScale(Math.min(1, availableWidth / INVOICE_PREVIEW_WIDTH));
    }

    updatePreviewScale();
    window.addEventListener('resize', updatePreviewScale);
    window.addEventListener('orientationchange', updatePreviewScale);

    return () => {
      window.removeEventListener('resize', updatePreviewScale);
      window.removeEventListener('orientationchange', updatePreviewScale);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || !canRequestTaxAllocation) return undefined;

    let active = true;

    async function loadTaxStatus() {
      try {
        const status = await getTaxAuthorityConnectionStatus();
        if (active) {
          setTaxStatus(status);
        }
      } catch (error) {
        if (active) {
          setTaxStatus({
            connected: false,
            error: error?.message || 'Tax Authority connection status could not be loaded.',
          });
        }
      }
    }

    loadTaxStatus();

    return () => {
      active = false;
    };
  }, [canRequestTaxAllocation, user?.uid]);

  const lineItems = invoice?.lineItems || [];
  const payments = useMemo(() => (
    Array.isArray(invoice?.payments) ? invoice.payments : []
  ), [invoice?.payments]);
  const receiptPaymentGroups = useMemo(() => {
    const groups = new Map();

    payments.forEach((payment, index) => {
      const method = String(payment?.type || '').trim() || copy.paymentType;
      const key = method.toLocaleLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { method, payments: [], hasBankTransfer: false, hasCheck: false });
      }
      const group = groups.get(key);
      group.payments.push({ ...payment, id: payment?.id || `${key}_${index}` });
      group.hasBankTransfer = group.hasBankTransfer || isBankTransferPayment(payment);
      group.hasCheck = group.hasCheck || isCheckPayment(payment);
    });

    return Array.from(groups.values());
  }, [copy.paymentType, payments]);
  const subtotal = useMemo(() => Number(invoice?.subtotal) || 0, [invoice?.subtotal]);
  const subtotalBeforeDiscount = useMemo(() => Number(invoice?.subtotalBeforeDiscount ?? invoice?.subtotal) || 0, [invoice?.subtotal, invoice?.subtotalBeforeDiscount]);
  const invoiceDiscountAmount = useMemo(() => Number(invoice?.discountAmount) || 0, [invoice?.discountAmount]);
  const vatAmount = useMemo(() => Number(invoice?.vatAmount) || 0, [invoice?.vatAmount]);
  const total = useMemo(() => Number(invoice?.total) || 0, [invoice?.total]);
  const roundingAdjustment = useMemo(() => Number(invoice?.roundingAdjustment) || 0, [invoice?.roundingAdjustment]);
  const paidTotal = useMemo(() => Number(invoice?.paidTotal) || 0, [invoice?.paidTotal]);
  const amountDue = useMemo(() => Number(invoice?.amountDue) || 0, [invoice?.amountDue]);
  const invoiceNotes = useMemo(() => String(invoice?.notes || '').trim(), [invoice?.notes]);
  const generatedAt = useMemo(() => new Date(), []);

  async function saveInvoiceRecord() {
    if (!user?.uid || !invoice || shouldUseStoredPdf) return null;

    if (invoice?.savedInvoiceUrl && invoice?.invoiceDocId) {
      return invoice;
    }

    if (!invoiceContentRef.current) {
      throw new Error('Missing invoice preview content');
    }

    const createdAtMs = Date.now();
    const fileName = `${getPdfFilePrefix(docType)}_${user.uid}_${createdAtMs}.pdf`;
    const storagePath = `invoices/${user.uid}/${fileName}`;
    const pdfBlob = await buildInvoicePdfBlob(invoiceContentRef.current);
    const uploadedSnapshot = await uploadBytes(
      storageRef(storage, storagePath),
      pdfBlob,
      { contentType: 'application/pdf' }
    );
    const url = await getDownloadURL(uploadedSnapshot.ref);

    const savedRecord = await saveUserInvoice(user.uid, {
      ...invoice,
      docType,
      savedFileName: fileName,
      savedInvoiceUrl: url,
      savedStoragePath: storagePath,
    });
    const nextInvoice = {
      ...invoice,
      invoiceDocId: savedRecord.invoiceDocId,
      savedFirestoreId: savedRecord.id,
      savedFileName: fileName,
      savedInvoiceUrl: url,
      savedStoragePath: storagePath,
    };
    setInvoice(nextInvoice);
    setIsSaved(true);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getInvoicePreviewStorageKey(user.uid), JSON.stringify(nextInvoice));
    }

    return nextInvoice;
  }

  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  async function refreshSavedInvoicePdf(nextInvoice) {
    if (!user?.uid || !nextInvoice || !invoiceContentRef.current) return nextInvoice;

    await waitForPaint();

    const createdAtMs = Date.now();
    const fileName = nextInvoice.savedFileName || `invoice_${user.uid}_${createdAtMs}.pdf`;
    const storagePath = nextInvoice.savedStoragePath || `invoices/${user.uid}/${fileName}`;
    const pdfBlob = await buildInvoicePdfBlob(invoiceContentRef.current);
    const uploadedSnapshot = await uploadBytes(
      storageRef(storage, storagePath),
      pdfBlob,
      { contentType: 'application/pdf' }
    );
    const url = await getDownloadURL(uploadedSnapshot.ref);
    const refreshedInvoice = {
      ...nextInvoice,
      savedFileName: fileName,
      savedInvoiceUrl: url,
      savedStoragePath: storagePath,
    };

    await saveUserInvoice(user.uid, {
      ...refreshedInvoice,
      docType,
      savedFileName: fileName,
      savedInvoiceUrl: url,
      savedStoragePath: storagePath,
    });

    setInvoice(refreshedInvoice);
    window.localStorage.setItem(getInvoicePreviewStorageKey(user.uid), JSON.stringify(refreshedInvoice));

    return refreshedInvoice;
  }

  async function handleConnectTaxAuthority() {
    if (taxActionLoading) return;

    setTaxActionLoading(true);
    try {
      const { authorizationUrl } = await createTaxAuthorityAuthorizationUrl();
      if (!authorizationUrl) {
        throw new Error('Tax Authority authorization URL was not returned.');
      }
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
      toast.success('Tax Authority authorization opened.');
    } catch (error) {
      toast.error(error?.message || t.common.error);
    } finally {
      setTaxActionLoading(false);
    }
  }

  function buildTaxAuthorityInvoicePayload(savedInvoice) {
    const businessId = String(taxStatus?.businessId || '').replace(/\D/g, '');
    const customerVatNumber = String(invoice?.clientId || '').replace(/\D/g, '');
    const invoiceDocId = savedInvoice?.invoiceDocId || savedInvoice?.savedFirestoreId || `${docType}_${invoice?.invoiceNumber || Date.now()}`;
    const paymentAmount = Number(invoice?.subtotal) || Math.max((Number(invoice?.total) || 0) - (Number(invoice?.vatAmount) || 0), 0);
    const amountBeforeDiscount = Number(invoice?.subtotalBeforeDiscount ?? invoice?.subtotal) || paymentAmount;
    const discountAmount = Number(invoice?.discountAmount) || 0;
    const invoiceVatAmount = Number(invoice?.vatAmount) || 0;
    const paymentAmountIncludingVat = Number(invoice?.total) || paymentAmount + invoiceVatAmount;

    return {
      invoiceDocId,
      invoice: {
        invoice_id: invoiceDocId,
        invoice_type: 305,
        vat_number: Number(businessId),
        user_name: invoice?.createdBy?.name || 'Hiro Pro',
        invoice_reference_number: String(invoice?.invoiceNumber || invoiceDocId),
        customer_vat_number: customerVatNumber ? Number(customerVatNumber) : 0,
        customer_name: invoice?.clientName || '',
        invoice_date: invoice?.issueDate || new Date().toISOString().slice(0, 10),
        invoice_issuance_date: invoice?.issueDate || new Date().toISOString().slice(0, 10),
        accounting_software_number: Number(process.env.NEXT_PUBLIC_TAX_ACCOUNTING_SOFTWARE_NUMBER || 987654321),
        amount_before_discount: amountBeforeDiscount,
        discount: discountAmount,
        payment_amount: paymentAmount,
        vat_amount: invoiceVatAmount,
        payment_amount_including_vat: paymentAmountIncludingVat,
        invoice_note: invoice?.notes || '',
        action: 0,
        items: lineItems.map((item, index) => {
          const quantity = Number(item?.quantity) || 0;
          const rawUnitPrice = Number(item?.unitPrice) || 0;
          const totalAmount = Number(item?.lineSubtotal ?? quantity * rawUnitPrice) || 0;
          const pricePerUnit = quantity > 0 ? totalAmount / quantity : Number(item?.unitPrice) || 0;
          return {
            index: index + 1,
            description: item?.description || 'Service',
            quantity,
            price_per_unit: pricePerUnit,
            discount: 0,
            total_amount: totalAmount,
            vat_rate: item?.vatMode === 'no_vat' ? 0 : Number(invoice?.vatRate) || 0,
            vat_amount: Number(item?.lineVatAmount ?? totalAmount * ((Number(invoice?.vatRate) || 0) / 100)) || 0,
          };
        }),
      },
    };
  }

  async function requestAllocationForInvoice(savedInvoice) {
    const allocation = await requestTaxInvoiceAllocation(buildTaxAuthorityInvoicePayload(savedInvoice));
    const nextInvoice = invoice ? {
      ...invoice,
      ...(savedInvoice || {}),
      taxAuthorityAllocation: allocation,
      allocationNumber: allocation.confirmationNumber || '',
      taxAuthorityAllocationNumber: allocation.confirmationNumber || '',
    } : null;

    setTaxAllocation(allocation);
    setInvoice((current) => (current ? {
      ...current,
      ...(savedInvoice || {}),
      taxAuthorityAllocation: allocation,
      allocationNumber: allocation.confirmationNumber || '',
      taxAuthorityAllocationNumber: allocation.confirmationNumber || '',
    } : current));

    if (nextInvoice && typeof window !== 'undefined') {
      window.localStorage.setItem(getInvoicePreviewStorageKey(user.uid), JSON.stringify(nextInvoice));
    }

    if (!shouldUseStoredPdf && nextInvoice) {
      await refreshSavedInvoicePdf(nextInvoice);
    }

    return nextInvoice;
  }

  async function shouldAttemptAllocation() {
    const customerVatNumber = String(invoice?.clientId || '').replace(/\D/g, '');
    const hasCustomerVatNumber = Boolean(customerVatNumber) && customerVatNumber !== '0';

    if (!canRequestTaxAllocation || allocationNumber || !hasCustomerVatNumber) {
      return { shouldAttempt: false, minAmountBeforeVat: 0, amountBeforeVat: Number(invoice?.subtotal) || 0 };
    }

    const minAmountBeforeVat = await getAllocationNumberMinAmountBeforeVat();
    const amountBeforeVat = Number(invoice?.subtotal) || 0;
    return {
      shouldAttempt: amountBeforeVat > minAmountBeforeVat,
      minAmountBeforeVat,
      amountBeforeVat,
    };
  }

  async function saveInvoiceWithAllocation({ continueWithoutAllocation = false } = {}) {
    if (!user?.uid || !invoice || shouldUseStoredPdf) return;

    const allocationCheck = await shouldAttemptAllocation();
    if (!allocationCheck.shouldAttempt || continueWithoutAllocation) {
      await saveInvoiceRecord();
      toast.success(copy.savedInvoiceStored);
      return;
    }

    let savedInvoice = null;

    try {
      const latestStatus = taxStatus?.connected ? taxStatus : await getTaxAuthorityConnectionStatus();
      setTaxStatus(latestStatus);
      if (!latestStatus?.connected) {
        setAllocationConnectionPrompt(allocationCheck);
        return;
      }

      savedInvoice = await saveInvoiceRecord();
      await requestAllocationForInvoice(savedInvoice);
      toast.success('Tax Authority allocation number received.');
    } catch (error) {
      toast.error(error?.message || t.common.error);
      if (savedInvoice) {
        toast.success(copy.savedInvoiceStored);
      }
    }
  }

  async function handleSaveInvoice() {
    if (!user?.uid || !invoice || saving || isSaved || shouldUseStoredPdf) return;

    setSaving(true);
    setTaxActionLoading(true);
    try {
      await saveInvoiceWithAllocation();
    } catch (error) {
      toast.error(error?.message || t.common.error);
    } finally {
      setSaving(false);
      setTaxActionLoading(false);
    }
  }

  async function handleConnectFromAllocationPrompt() {
    setAllocationConnectionPrompt(null);
    await handleConnectTaxAuthority();
  }

  async function handleContinueWithoutAllocation() {
    setAllocationConnectionPrompt(null);
    if (!isSaved) {
      setSaving(true);
      try {
        await saveInvoiceWithAllocation({ continueWithoutAllocation: true });
      } finally {
        setSaving(false);
      }
      return;
    }

    toast.success(copy.savedInvoiceStored);
  }

  function isLikelyMobileShareDevice() {
    if (typeof navigator === 'undefined') return false;

    const userAgent = navigator.userAgent || '';
    const hasTouch = typeof window !== 'undefined' && (
      navigator.maxTouchPoints > 1 || window.matchMedia?.('(pointer: coarse)').matches
    );

    return /Android|iPhone|iPad|iPod/i.test(userAgent) || hasTouch;
  }

  function buildSigningShareText(url) {
    return [
      `${docTypeLabel} ${invoice?.invoiceNumber || ''}`.trim(),
      url,
    ].filter(Boolean).join('\n');
  }

  async function copySigningUrl(url) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.success('Signing link copied.');
      return true;
    }

    return false;
  }

  function openSigningEmail(url) {
    const subject = `${docTypeLabel} ${invoice?.invoiceNumber || ''} - signature`.trim();
    const body = [
      'Please sign this document:',
      '',
      url,
    ].join('\n');

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function shareSigningUrl(url) {
    const shareText = buildSigningShareText(url);

    if (isLikelyMobileShareDevice() && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Document signing link',
          text: shareText,
          url,
        });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
      }
    }

    await copySigningUrl(url);
    openSigningEmail(url);
  }

  async function createOrReuseSigningUrl() {
    const savedInvoice = invoice;
    const invoiceDocId = savedInvoice?.invoiceDocId || savedInvoice?.savedFirestoreId || '';
    const readySigningUrl = savedInvoice?.signingUrl || '';

    if (readySigningUrl) {
      return readySigningUrl;
    }

    if (!invoiceDocId) {
      throw new Error('The saved document is missing an invoice id.');
    }

    const receiverId = String(savedInvoice?.clientUid || invoice?.clientUid || '').trim();
    const result = await createDocumentSigningLink(invoiceDocId, receiverId);
    const nextInvoice = {
      ...invoice,
      ...savedInvoice,
      signatureStatus: 'pending',
      signingUrl: result.url,
      signingExpiresAt: result.expiresAt,
    };
    setInvoice(nextInvoice);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getInvoicePreviewStorageKey(user.uid), JSON.stringify(nextInvoice));
    }

    return result.url;
  }

  async function handleCreateSigningLink() {
    if (signingLinkLoading) return;

    setSigningLinkLoading(true);
    try {
      const signingUrl = await createOrReuseSigningUrl();
      await shareSigningUrl(signingUrl);
    } catch (error) {
      toast.error(error?.message || t.common.error);
    } finally {
      setSigningLinkLoading(false);
    }
  }

  function handlePrintInvoice() {
    if (savedInvoiceUrl) {
      window.open(savedInvoiceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    toast.error('Save the invoice before printing.');
  }

  function handleSendInvoice() {
    if (shouldUseStoredPdf) {
      const subject = `${docTypeLabel} ${invoice?.invoiceNumber || ''}`.trim();
      const body = [
        `${copy.clientName}: ${invoice?.clientName || '-'}`,
        `${copy.documentNo}: ${invoice?.invoiceNumber || '-'}`,
        savedInvoiceUrl,
      ].join('\n');

      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    const subject = `${docTypeLabel} ${invoice?.invoiceNumber || ''}`.trim();
    const body = [
      `${copy.clientName}: ${invoice?.clientName || '-'}`,
      `${copy.documentNo}: ${invoice?.invoiceNumber || '-'}`,
      `${copy.total}: ${formatCurrency(total, locale)}`,
      `${copy.paymentAmount}: ${formatCurrency(paidTotal, locale)}`,
    ].join('\n');

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleShareInvoice() {
    if (shouldUseStoredPdf) {
      const shareText = [
        `${docTypeLabel} ${invoice?.invoiceNumber || ''}`.trim(),
        `${copy.clientName}: ${invoice?.clientName || '-'}`,
        savedInvoiceUrl,
      ].join('\n');

      if (navigator.share) {
        try {
          await navigator.share({
            title: copy.preview,
            text: shareText,
            url: savedInvoiceUrl,
          });
          return;
        } catch (error) {
          return;
        }
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(savedInvoiceUrl);
        toast.success(copy.shareSuccess);
      }
      return;
    }

    const shareText = [
      `${docTypeLabel} ${invoice?.invoiceNumber || ''}`.trim(),
      `${copy.clientName}: ${invoice?.clientName || '-'}`,
      `${copy.total}: ${formatCurrency(total, locale)}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: copy.preview,
          text: shareText,
        });
        return;
      } catch (error) {
        return;
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      toast.success(copy.shareSuccess);
    }
  }

  if (loading) {
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

  if (!invoice) {
    return (
      <>
        <Head>
          <title>{`Hiro | ${copy.previewPdfTitle}`}</title>
        </Head>
        <main className="min-h-screen bg-[#eef0f4] px-4 py-10">
          <div className="mx-auto max-w-2xl rounded-[28px] bg-white p-8 shadow-card">
            <p className="text-sm text-gray-600">{copy.noPreviewAvailable}</p>
            <Link href="/worker/invoices" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <FiArrowLeft className={`h-4.5 w-4.5 ${isRtl ? 'rotate-180' : ''}`} />
              {copy.backToEditor}
            </Link>
          </div>
        </main>
      </>
    );
  }

  const backHref = openedFromSaved ? '/worker/invoices/saved' : '/worker/invoices';
  const invoiceItemPages = shouldUseStoredPdf ? [] : buildInvoiceItemPages(lineItems);
  const invoicePreviewPageCount = shouldUseStoredPdf ? 1 : invoiceItemPages.length;
  const previewShellHeight = (
    (INVOICE_PREVIEW_HEIGHT * invoicePreviewPageCount)
    + (INVOICE_PREVIEW_PAGE_GAP * Math.max(invoicePreviewPageCount - 1, 0))
  ) * previewScale;

  return (
    <>
      <Head>
        <title>{`Hiro | ${copy.previewPdfTitle}`}</title>
      </Head>

      <main className="min-h-screen bg-[#d9dde3] print:bg-white" dir={dir}>
        <header className="bg-white px-5 py-7 shadow-[0_1px_0_rgba(15,23,42,0.06)] print:hidden sm:px-10 sm:py-10">
          <div className="mx-auto flex max-w-6xl items-center gap-5">
            <Link href={backHref} className="text-primary transition-opacity hover:opacity-80" aria-label={copy.backToEditor}>
              <FiArrowLeft className={`h-10 w-10 ${isRtl ? 'rotate-180' : ''}`} />
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{copy.preview}</h1>
          </div>
        </header>

        <div className="overflow-x-hidden px-3 py-6 print:px-0 print:py-0 sm:px-8 sm:py-16">
          <div
            className="invoice-preview-shell mx-auto print:h-auto print:w-auto"
            style={{
              width: `${INVOICE_PREVIEW_WIDTH * previewScale}px`,
              height: `${previewShellHeight}px`,
            }}
          >
            <section
              ref={invoiceContentRef}
              className="invoice-preview-frame flex w-[794px] max-w-none flex-col gap-6 print:w-[210mm] print:max-w-none print:gap-0"
              style={{
                '--invoice-preview-scale': previewScale,
              }}
            >
            {shouldUseStoredPdf ? (
              <div className="px-4 py-5 sm:px-14 sm:py-14">
                <div className="rounded-[22px] bg-[#dcebfa] px-5 py-5 sm:px-7 sm:py-6">
                  <h2 className="text-2xl font-light text-[#2e63b2] sm:text-4xl">{docTypeLabel}</h2>
                  <p className="mt-1 text-xl font-light text-[#485a71] sm:text-2xl">{copy.originalCopy}</p>
                  <div className="mt-4 text-sm leading-6 text-[#55677d] sm:text-[15px]">
                    <p>{`${copy.documentNo}: ${invoice.invoiceNumber || '-'}`}</p>
                    {allocationNumber ? <p>{`${copy.taxAuthorityAllocationNumber}: ${allocationNumber}`}</p> : null}
                    <p>{`${copy.issueDate}: ${invoice.issueDate || '-'}`}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[18px] border border-[#d7dee8] bg-[#f8fbff] p-3">
                  <iframe
                    src={savedInvoiceUrl}
                    title={savedInvoiceFileName}
                    className="h-[75vh] w-full rounded-[12px] border-0 bg-white"
                  />
                </div>
              </div>
            ) : (
            invoiceItemPages.map((page, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isFinalPage = pageIndex === invoiceItemPages.length - 1;

              return (
                <div
                  key={`invoice_page_${pageIndex}`}
                  className={`invoice-preview-page relative flex h-[1123px] flex-col rounded-[2px] bg-white px-[57px] py-[57px] shadow-[0_14px_40px_rgba(15,23,42,0.35)] print:h-[297mm] print:rounded-none print:shadow-none ${isFinalPage ? '' : 'print:break-after-page'}`}
                >
                  {isFirstPage ? (
                    <>
                      <div className="rounded-2xl bg-[#dcebfa] px-[21px] py-4 text-left">
                        <h2 className="text-[37px] font-light leading-[42px] text-[#1454b2]">{docTypeLabel}</h2>
                        <p className="mt-1 text-[21px] font-light leading-[25px] text-[#485a71]">{copy.originalCopy}</p>
                        <div className="mt-3 leading-[21px] text-[#3f4d5f]">
                          <p className="text-[19px]">{`${copy.documentNo}: ${invoice.invoiceNumber}`}</p>
                          {allocationNumber ? <p>{`${copy.taxAuthorityAllocationNumber}: ${allocationNumber}`}</p> : null}
                          <p className="text-base">{`${copy.issueDate}: ${invoice.issueDate}`}</p>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-8" dir="ltr">
                        <div dir="rtl">
                          <DetailCard
                            title={copy.clientDetails}
                            lines={[
                              detailLine('לכבוד', invoice.clientName || copy.emptyClient),
                              detailLine('מספר עוסק/ח.פ/ת.ז', invoice.clientId),
                              detailLine('דוא״ל', invoice.clientEmail),
                              detailLine('טלפון', invoice.clientPhone),
                              detailLine('כתובת', invoice.clientCity),
                            ]}
                            tint="white"
                          />
                        </div>
                        <div dir="rtl">
                          <DetailCard
                            title={copy.businessDetails}
                            lines={[
                              invoice.createdBy?.name || 'Hiro Pro',
                              detailLine(businessRegistrationLabel(invoice.createdBy?.dealerType), invoice.createdBy?.id),
                              detailLine('כתובת העסק', invoice.createdBy?.address || invoice.createdBy?.city),
                              detailLine('טלפון', invoice.createdBy?.phone),
                              detailLine('דוא״ל', invoice.createdBy?.email),
                            ]}
                            tint="blue"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-[#dcebfa] px-[21px] py-4 text-left">
                      <h2 className="text-[30px] font-light leading-[36px] text-[#1454b2]">{docTypeLabel}</h2>
                      <div className="mt-2 flex items-center justify-between gap-6 text-[16px] leading-5 text-[#3f4d5f]" dir="rtl">
                        <span>{`${copy.documentNo}: ${invoice.invoiceNumber || '-'}`}</span>
                        <span>{invoice.clientName || copy.emptyClient}</span>
                      </div>
                    </div>
                  )}

                  {!isReceipt ? (
                  <div className={`${isFirstPage ? 'mt-[37px]' : 'mt-8'} overflow-hidden rounded-[2px] border border-[#d7dee8]`} dir="ltr">
                    <div className="grid grid-cols-[1fr_80px_133px_133px] bg-[#2c92e5] text-center text-base leading-5 text-white">
                      <div className="border-white/20 px-2 py-2 sm:border-r sm:px-3" dir="rtl">{copy.description}</div>
                      <div className="border-white/20 px-2 py-2 sm:border-r sm:px-3" dir="rtl">{copy.quantity}</div>
                      <div className="border-white/20 px-2 py-2 sm:border-r sm:px-3" dir="rtl">{copy.unitPrice}</div>
                      <div className="px-3 py-2" dir="rtl">{copy.total}</div>
                    </div>

                    <div className="divide-y divide-[#e6edf7]">
                      {page.items.map((item, itemIndex) => {
                        const globalIndex = page.startIndex + itemIndex;
                        const lineTotal = Number(item.lineSubtotal ?? (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));

                        return (
                          <div key={item.id || `${item.description}_${globalIndex}`} className="grid grid-cols-[1fr_80px_133px_133px] items-center text-right text-[15px] leading-[18px] text-[#40434d]">
                            <div className="border-[#d7dee8] px-2 py-2 sm:border-r sm:px-3" dir="rtl">{item.description || `${copy.emptyDescription} ${globalIndex + 1}`}</div>
                            <div className="border-[#d7dee8] px-2 py-2 sm:border-r sm:px-3" dir="rtl">{item.quantity}</div>
                            <div className="border-[#d7dee8] px-2 py-2 sm:border-r sm:px-3" dir="rtl">{formatCurrency(item.unitPrice, locale)}</div>
                            <div className="px-2 py-2 sm:px-3" dir="rtl">{formatCurrency(lineTotal, locale)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  ) : null}

                  {isReceipt && isFinalPage && receiptPaymentGroups.length > 0 ? (
                    <div className="mt-6 space-y-4" dir="rtl">
                      {receiptPaymentGroups.map((group) => (
                        <section key={group.method} className="overflow-hidden rounded-[8px] border border-[#d7dee8]">
                          <div className="bg-[#eaf4ff] px-4 py-2 text-right text-sm font-bold text-[#1454b2]">
                            {`${copy.paymentType}: ${group.method}`}
                          </div>
                          <table className="w-full table-fixed border-collapse text-right text-[12px] leading-4 text-[#40434d]">
                            <thead className="bg-[#f7fbff] text-[11px] font-bold text-[#536170]">
                              <tr>
                                <th className="border-b border-[#d7dee8] px-3 py-2">{copy.paymentDate}</th>
                                <th className="border-b border-[#d7dee8] px-3 py-2">{copy.paymentAmount}</th>
                                {group.hasBankTransfer ? (
                                  <>
                                    <th className="border-b border-[#d7dee8] px-3 py-2">{copy.bankName}</th>
                                    <th className="border-b border-[#d7dee8] px-3 py-2">{copy.branch}</th>
                                    <th className="border-b border-[#d7dee8] px-3 py-2">{copy.accountNumber}</th>
                                  </>
                                ) : null}
                                {group.hasCheck ? <th className="border-b border-[#d7dee8] px-3 py-2">{copy.checkNumber}</th> : null}
                                <th className="border-b border-[#d7dee8] px-3 py-2">{copy.extraDetails}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.payments.map((payment) => (
                                <tr key={payment.id}>
                                  <td className="border-b border-[#e6edf7] px-3 py-2">{formatFooterDueDate(payment.date)}</td>
                                  <td className="border-b border-[#e6edf7] px-3 py-2 font-semibold">{formatCurrency(payment.amount, locale)}</td>
                                  {group.hasBankTransfer ? (
                                    <>
                                      <td className="border-b border-[#e6edf7] px-3 py-2">{payment.bankName || '-'}</td>
                                      <td className="border-b border-[#e6edf7] px-3 py-2">{payment.branch || '-'}</td>
                                      <td className="border-b border-[#e6edf7] px-3 py-2">{payment.accountNumber || '-'}</td>
                                    </>
                                  ) : null}
                                  {group.hasCheck ? <td className="border-b border-[#e6edf7] px-3 py-2">{payment.checkNumber || '-'}</td> : null}
                                  <td className="border-b border-[#e6edf7] px-3 py-2">{payment.details || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      ))}
                    </div>
                  ) : null}

                  {isFinalPage ? (
                    <div className="mt-6 flex justify-end" dir="ltr">
                      <div className="w-[347px]" dir="rtl">
                        <div className="rounded-[13px] border border-[#abd1f2] bg-[#dcebfa] p-[19px] text-[#0f172a]">
                          <div className="space-y-1 text-[15px] leading-[18px]">
                            {!isReceipt ? (
                            <>
                              <div className="flex items-center justify-between gap-4">
                                <span>{formatCurrency(subtotalBeforeDiscount, locale)}</span>
                                <span>{copy.subtotal}</span>
                              </div>
                              {invoiceDiscountAmount > 0 ? (
                              <div className="flex items-center justify-between gap-4">
                                <span>-{formatCurrency(invoiceDiscountAmount, locale)}</span>
                                <span>{copy.discountType}</span>
                              </div>
                              ) : null}
                              <div className="flex items-center justify-between gap-4">
                                <span>{formatCurrency(vatAmount, locale)}</span>
                                <span>{copy.vatAmount}</span>
                              </div>
                              {invoice?.roundTotalEnabled && Math.abs(roundingAdjustment) >= 0.01 ? (
                              <div className="flex items-center justify-between gap-4">
                                <span>{formatCurrency(roundingAdjustment, locale)}</span>
                                <span>{copy.roundingAdjustment}</span>
                              </div>
                              ) : null}
                            </>
                            ) : null}
                            <div className={isReceipt ? '' : 'border-t border-[#9eb7ce] pt-2'}>
                              <div className="flex items-center justify-between gap-4 text-xl font-bold leading-6 text-[#1454b2]">
                                <span>{formatCurrency(total, locale)}</span>
                                <span>{isReceipt ? copy.receiptPaidTotal : copy.total}</span>
                              </div>
                            </div>
                            {!isReceipt ? (
                              <div className="mt-2 flex items-center justify-between gap-4 text-[15px] leading-[18px] text-[#536170]">
                                <span>{copy.paymentDueDate || copy.dueDate || ''}</span>
                                <span>{formatFooterDueDate(invoice.dueDate || invoice.issueDate)}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {invoiceNotes ? (
                          <div className="mt-3 text-right text-[13px] leading-5 text-[#3f4d5f]">
                            <p className="font-semibold text-[#26313b]">{copy.notes}</p>
                            <p className="mt-1 whitespace-pre-line">{invoiceNotes}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <footer className="invoice-footer mt-auto shrink-0 px-[11px] pt-8 text-[#26313b]" dir="rtl">
                    {isFinalPage && canRequestSignature ? (
                      <div className="mb-6 flex items-center justify-center gap-4 text-[13px] leading-4">
                        <span>חתימה:</span>
                        <span className="block h-[1px] w-[307px] bg-[#26313b]" />
                      </div>
                    ) : null}

                    <div className="border-t border-[#26313b] pt-[13px]">
                      <div className="grid grid-cols-2 items-start gap-6">
                        <div className="text-right">
                          {isFinalPage ? (
                            <>
                              <p className="text-[21px] font-normal leading-6 text-black">חתימה דיגיטלית מאובטחת</p>
                              <div className="mt-[7px] flex w-full items-center justify-start gap-1.5 text-right text-[11px] leading-4">
                                <p>מסמך ממוחשב הופק על ידי הירו</p>
                                {/* The PDF canvas renderer needs the public asset URL directly. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src="/web-app-manifest-192x192.png"
                                  alt=""
                                  aria-hidden="true"
                                  className="h-5 w-5 shrink-0 rounded-[4px]"
                                />
                              </div>
                            </>
                          ) : null}
                        </div>
                        <div className="self-end text-left text-[11px] leading-4 text-[#26313b]">
                          <p>{`הופק ב ${formatFooterGeneratedAt(generatedAt)} | ${docTypeLabel} ${invoice.invoiceNumber || '-'}`}</p>
                          <p className="text-[13px] leading-5">{`${pageIndex + 1} / ${invoiceItemPages.length}`}</p>
                        </div>
                      </div>
                    </div>
                  </footer>
                </div>
              );
            })
            )}
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-[#d8dce3] bg-[#eef0f4]/95 px-4 py-3 backdrop-blur print:hidden sm:px-8">
          <div className="mx-auto max-w-[980px]">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#d8e6f7] bg-white/90 px-4 py-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {copy.preview}
                </p>
                <p className="truncate text-sm font-semibold text-slate-600 sm:text-base">
                  {invoice?.invoiceNumber || docTypeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={saving || isSaved || shouldUseStoredPdf}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors sm:px-5 ${
                  saving || isSaved || shouldUseStoredPdf
                    ? 'border-[#bfd7f5] bg-[#f4f9ff] text-slate-400'
                    : 'border-[#2a7bd4] bg-white text-[#2a7bd4] hover:bg-[#f5faff]'
                }`}
              >
                <FiDownload className="h-4.5 w-4.5" />
                {shouldUseStoredPdf
                  ? copy.previewSavedState
                  : saving
                    ? t.common.loading
                    : isSaved
                      ? copy.previewSavedState
                      : t.common.save}
              </button>
            </div>

            {(isSaved || shouldUseStoredPdf) ? (
              <div className={`grid grid-cols-1 gap-3 ${canRequestSignature ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
                {canRequestSignature ? (
                  <button
                    type="button"
                    onClick={handleCreateSigningLink}
                    disabled={signingLinkLoading}
                    className="flex items-center justify-center gap-2.5 rounded-[18px] bg-[#7c3aed] px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:bg-slate-300 sm:text-lg"
                  >
                    <FiEdit3 className="h-5 w-5" />
                    {signingLinkLoading ? t.common.loading : 'Send for signature'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSendInvoice}
                  className="flex items-center justify-center gap-2.5 rounded-[18px] bg-[#20a3dd] px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#178fc7] sm:text-lg"
                >
                  <FiSend className="h-5 w-5" />
                  {copy.sendAction}
                </button>
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="flex items-center justify-center gap-2.5 rounded-[18px] bg-[#2c78d0] px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#246bb9] sm:text-lg"
                >
                  <FiPrinter className="h-5 w-5" />
                  {copy.printAction}
                </button>
                <button
                  type="button"
                  onClick={handleShareInvoice}
                  className="flex items-center justify-center gap-2.5 rounded-[18px] bg-[#0f8074] px-4 py-3.5 text-base font-bold text-white transition-colors hover:bg-[#0d7066] sm:text-lg"
                >
                  <FiShare2 className="h-5 w-5" />
                  {copy.shareAction}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {allocationConnectionPrompt ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.35)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary/70">
                Israel Tax Authority
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                {copy.allocationConnectionPromptTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {copy.allocationConnectionPromptBody.replace(
                  '{amount}',
                  formatCurrency(allocationConnectionPrompt.minAmountBeforeVat, locale)
                )}
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={handleConnectFromAllocationPrompt}
                  disabled={taxActionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#2c78d0] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#246bb9] disabled:bg-slate-300"
                >
                  <FiExternalLink className="h-4.5 w-4.5" />
                  {copy.connectThenTryAgain}
                </button>
                <button
                  type="button"
                  onClick={handleContinueWithoutAllocation}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:text-slate-400"
                >
                  {copy.continueWithoutAllocation}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
