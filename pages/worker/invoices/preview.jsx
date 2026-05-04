import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiArrowLeft, FiDownload, FiPrinter, FiSend, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { saveUserInvoice } from '../../../lib/firestore';
import { formatCurrency, getInvoicePreviewStorageKey } from '../../../lib/invoices';

function DetailCard({ title, lines, tint = 'white', align = 'right' }) {
  const tone = tint === 'blue'
    ? 'bg-[#dcebfa]'
    : 'bg-[#f6f6f7]';

  return (
    <div className={`rounded-[18px] ${tone} px-5 py-4`}>
      <p className={`text-sm text-[#3f73ba] ${align === 'right' ? 'text-right' : 'text-left'}`}>{title}</p>
      <div className={`mt-2 space-y-1 text-[#2f3441] ${align === 'right' ? 'text-right' : 'text-left'}`}>
        {lines.map((line, index) => (
          line ? (
            <p key={`${title}_${index}`} className={index === 0 ? 'text-[18px] font-medium leading-6' : 'text-sm leading-5'}>
              {line}
            </p>
          ) : null
        ))}
      </div>
    </div>
  );
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

  const lineItems = invoice?.lineItems || [];
  const payments = invoice?.payments || [];
  const subtotal = useMemo(() => Number(invoice?.subtotal) || 0, [invoice?.subtotal]);
  const vatAmount = useMemo(() => Number(invoice?.vatAmount) || 0, [invoice?.vatAmount]);
  const total = useMemo(() => Number(invoice?.total) || 0, [invoice?.total]);
  const paidTotal = useMemo(() => Number(invoice?.paidTotal) || 0, [invoice?.paidTotal]);
  const amountDue = useMemo(() => Number(invoice?.amountDue) || 0, [invoice?.amountDue]);

  async function handleSaveInvoice() {
    if (!user?.uid || !invoice || saving || isSaved) return;

    setSaving(true);
    try {
      await saveUserInvoice(user.uid, {
        ...invoice,
        docType: 'receipt',
      });
      setIsSaved(true);
      toast.success(copy.savedInvoiceStored);
    } catch (error) {
      toast.error(t.common.error);
    } finally {
      setSaving(false);
    }
  }

  function handlePrintInvoice() {
    window.print();
  }

  function handleSendInvoice() {
    const subject = `${copy.receiptDoc} ${invoice?.invoiceNumber || ''}`.trim();
    const body = [
      `${copy.clientName}: ${invoice?.clientName || '-'}`,
      `${copy.documentNo}: ${invoice?.invoiceNumber || '-'}`,
      `${copy.total}: ${formatCurrency(total, locale)}`,
      `${copy.paymentAmount}: ${formatCurrency(paidTotal, locale)}`,
    ].join('\n');

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleShareInvoice() {
    const shareText = [
      `${copy.receiptDoc} ${invoice?.invoiceNumber || ''}`.trim(),
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

        <div className="px-4 py-10 print:px-0 print:py-0 sm:px-8 sm:py-16">
          <section className="mx-auto max-w-[980px] rounded-[2px] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.35)] print:max-w-none print:shadow-none">
            <div className="px-6 py-8 sm:px-14 sm:py-14">
              <div className="rounded-[22px] bg-[#dcebfa] px-6 py-5 sm:px-7 sm:py-6">
                <h2 className="text-4xl font-light text-[#2e63b2]">{copy.shortTitle}</h2>
                <p className="mt-1 text-2xl font-light text-[#485a71]">{copy.originalCopy}</p>
                <div className="mt-4 text-[15px] leading-6 text-[#55677d]">
                  <p>{`${copy.documentNo}: ${invoice.invoiceNumber}`}</p>
                  <p>{`${copy.issueDate}: ${invoice.issueDate}`}</p>
                </div>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <DetailCard
                  title={copy.clientDetails}
                  lines={[
                    invoice.clientName || copy.emptyClient,
                    invoice.clientPhone || '',
                    invoice.clientCity || '',
                  ]}
                  tint="white"
                />
                <DetailCard
                  title={copy.businessDetails}
                  lines={[
                    invoice.createdBy?.name || 'Hiro Pro',
                    invoice.createdBy?.phone || '',
                    invoice.createdBy?.city || '',
                  ]}
                  tint="blue"
                />
              </div>

              <div className="mt-8 overflow-hidden rounded-[2px] border border-[#d7dee8]">
                <div className="grid grid-cols-[1.65fr_0.42fr_0.65fr_0.72fr] bg-[#2c92e5] text-center text-xs text-white sm:text-[18px]">
                  <div className="border-white/20 px-3 py-3 sm:border-r">{copy.description}</div>
                  <div className="border-white/20 px-3 py-3 sm:border-r">{copy.quantity}</div>
                  <div className="border-white/20 px-3 py-3 sm:border-r">{copy.unitPrice}</div>
                  <div className="px-3 py-3">{copy.total}</div>
                </div>

                <div className="divide-y divide-[#e6edf7]">
                  {lineItems.map((item, index) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

                    return (
                      <div key={item.id || `${item.description}_${index}`} className="grid grid-cols-[1.65fr_0.42fr_0.65fr_0.72fr] items-center text-right text-[#40434d]">
                        <div className="border-[#d7dee8] px-3 py-3 text-sm sm:border-r sm:text-[18px]">{item.description || `${copy.emptyDescription} ${index + 1}`}</div>
                        <div className="border-[#d7dee8] px-3 py-3 text-sm sm:border-r sm:text-[18px]">{item.quantity}</div>
                        <div className="border-[#d7dee8] px-3 py-3 text-sm sm:border-r sm:text-[18px]">{formatCurrency(item.unitPrice, locale)}</div>
                        <div className="px-3 py-3 text-sm sm:text-[18px]">{formatCurrency(lineTotal, locale)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-7 flex justify-end">
                <div className="flex min-w-[240px] items-center justify-between gap-5 rounded-[18px] border border-[#abd1f2] bg-[#dcebfa] px-6 py-4 text-[#2e63b2] sm:min-w-[390px]">
                  <span className="text-2xl font-normal">{formatCurrency(total, locale)}</span>
                  <span className="text-2xl font-normal">{copy.total}</span>
                </div>
              </div>

              <div className="mt-9">
                <p className="text-right text-[15px] text-[#3f73ba]">{copy.paymentType}</p>
                <div className="mt-2 rounded-[10px] border border-[#d9dfe8] bg-white px-4 py-3 text-right text-[#40434d]">
                  {payments.length > 0
                    ? payments.map((payment, index) => `${payment.type} | ${copy.paymentAmount}: ${formatCurrency(payment.amount, locale)}`).join(' , ')
                    : copy.noPayments}
                </div>
              </div>

              <div className="mt-32 border-t border-[#8ea1b6] pt-6 text-center text-[#6d7d8f] sm:mt-72">
                <p className="text-sm">{invoice.footerNotes || copy.generatedViaHiro}</p>
                <p className="mt-4 text-[20px] font-light text-[#52b6ef]">{invoice.bottomNotes || copy.thankYouMessage}</p>
              </div>

              <div className="mt-8 text-[#6d7d8f]">
                <p className="text-[16px]">{copy.signature}: ________________________</p>
              </div>

              <div className="mt-10 grid gap-3 text-sm text-[#6d7d8f] sm:grid-cols-2">
                <div className="rounded-[14px] border border-[#e4e7ec] bg-[#fafbfc] px-4 py-3">
                  <p className="font-semibold text-[#3f73ba]">{copy.summary}</p>
                  <p className="mt-2">{`${copy.subtotal}: ${formatCurrency(subtotal, locale)}`}</p>
                  <p>{`${copy.vatAmount}: ${formatCurrency(vatAmount, locale)}`}</p>
                  <p>{`${copy.paymentAmount}: ${formatCurrency(paidTotal, locale)}`}</p>
                  <p className="font-semibold text-slate-900">{`${copy.amountDue}: ${formatCurrency(amountDue, locale)}`}</p>
                </div>
                <div className="rounded-[14px] border border-[#e4e7ec] bg-[#fafbfc] px-4 py-3">
                  <p className="font-semibold text-[#3f73ba]">{copy.notes}</p>
                  <p className="mt-2">{invoice.notes || copy.notesPlaceholder}</p>
                  <p className="mt-3 font-semibold text-[#3f73ba]">{copy.paymentTerms}</p>
                  <p className="mt-2">{invoice.paymentTerms || copy.paymentTermsPlaceholder}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-[#d8dce3] bg-[#eef0f4] px-4 py-5 print:hidden sm:px-10">
          <div className="mx-auto max-w-[980px]">
            <button
              type="button"
              onClick={handleSaveInvoice}
              disabled={saving || isSaved}
              className={`flex w-full items-center justify-center gap-4 rounded-[26px] border-[3px] px-6 py-5 text-2xl font-bold transition-colors ${
                saving || isSaved
                  ? 'border-[#2a7bd4] bg-white text-slate-400'
                  : 'border-[#2a7bd4] bg-white text-[#2a7bd4] hover:bg-[#f5faff]'
              }`}
            >
              <FiDownload className="h-8 w-8" />
              {saving ? t.common.loading : isSaved ? copy.previewSavedState : t.common.save}
            </button>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={handleSendInvoice}
                className="flex items-center justify-center gap-3 rounded-[24px] bg-[#20a3dd] px-5 py-5 text-2xl font-bold text-white transition-colors hover:bg-[#178fc7]"
              >
                <FiSend className="h-8 w-8" />
                {copy.sendAction}
              </button>
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="flex items-center justify-center gap-3 rounded-[24px] bg-[#2c78d0] px-5 py-5 text-2xl font-bold text-white transition-colors hover:bg-[#246bb9]"
              >
                <FiPrinter className="h-8 w-8" />
                {copy.printAction}
              </button>
              <button
                type="button"
                onClick={handleShareInvoice}
                className="flex items-center justify-center gap-3 rounded-[24px] bg-[#0f8074] px-5 py-5 text-2xl font-bold text-white transition-colors hover:bg-[#0d7066]"
              >
                <FiShare2 className="h-8 w-8" />
                {copy.shareAction}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
