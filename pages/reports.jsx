import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiCopy,
  FiEdit3,
  FiFileText,
  FiFilm,
  FiGrid,
  FiImage,
  FiMessageCircle,
  FiPaperclip,
  FiSend,
} from 'react-icons/fi';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function getReportTime(report) {
  return report?.timestamp?.toMillis?.() || report?.timestamp?.seconds * 1000 || 0;
}

function getAttachmentKind(file) {
  if (file.type?.startsWith('image/')) return 'image';
  if (file.type?.startsWith('video/')) return 'video';
  return '';
}

const reportSubjects = [
  'General',
  'Bug Report',
  'Payment Issue',
  'Login Problem',
  'Feature Request',
  'Account Support',
  'Performance Issue',
  'Content Problem',
];

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, dir, locale } = useLanguage();
  const copy = t.reportsPage;
  const isRtl = dir === 'rtl';
  const [activeFilter, setActiveFilter] = useState('all');
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reportDraft, setReportDraft] = useState({
    subject: 'General',
    reason: '',
    details: '',
    files: [],
  });
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/reports')}`);
    }
  }, [loading, router, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      if (!user?.uid) return;

      setLoadingReports(true);
      setLoadError('');

      try {
        const reportsQuery = query(collection(db, 'reports'), where('reporterId', '==', user.uid));
        const reportsSnap = await getDocs(reportsQuery);
        const nextReports = reportsSnap.docs
          .map((reportDoc) => ({ id: reportDoc.id, ...reportDoc.data() }))
          .sort((a, b) => getReportTime(b) - getReportTime(a));

        if (!cancelled) setReports(nextReports);
      } catch (error) {
        console.error('Failed to load reports:', error);
        if (!cancelled) setLoadError(copy.loadError);
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [copy.loadError, user?.uid]);

  const filteredReports = useMemo(() => {
    if (activeFilter === 'open') return reports.filter((report) => ['open', 'in_progress'].includes(report.status));
    if (activeFilter === 'resolved') return reports.filter((report) => report.status === 'resolved');
    return reports;
  }, [activeFilter, reports]);

  const filters = [
    { key: 'all', label: copy.all, icon: FiGrid },
    { key: 'open', label: copy.open, icon: FiMessageCircle },
    { key: 'resolved', label: copy.resolved, icon: FiCheckCircle },
  ];

  function formatReportDate(report) {
    const time = getReportTime(report);
    if (!time) return copy.noDate;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(time));
  }

  function getStatusLabel(status) {
    if (status === 'resolved') return copy.resolved;
    if (status === 'in_progress') return copy.inProgress;
    if (status === 'rejected') return copy.rejected;
    return copy.open;
  }

  async function handleCopyReportId(reportId) {
    try {
      await navigator.clipboard?.writeText(reportId);
      toast.success(copy.copySuccess);
    } catch {
      toast.error(copy.copyError);
    }
  }

  function handleFilesChange(event, expectedKind) {
    const selectedFiles = Array.from(event.target.files || [])
      .filter((file) => getAttachmentKind(file) === expectedKind);

    setReportDraft((current) => ({
      ...current,
      files: [...current.files, ...selectedFiles].slice(0, 5),
    }));

    event.target.value = '';
  }

  function resetReportForm() {
    setReportDraft({
      subject: 'General',
      reason: '',
      details: '',
      files: [],
    });
    setSubjectMenuOpen(false);
  }

  async function handleCreateReport(event) {
    event.preventDefault();

    if (!user?.uid || submitting) return;
    if (!reportDraft.reason.trim() || !reportDraft.details.trim()) {
      toast.error(copy.requiredError);
      return;
    }

    setSubmitting(true);

    try {
      const createdAt = Date.now();
      const attachments = await Promise.all(reportDraft.files.map(async (file, index) => {
        const type = getAttachmentKind(file);
        const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
        const path = [
          'report_attachments',
          user.uid,
          `${createdAt}_${index}_${type}${extension ? `.${extension}` : ''}`,
        ].join('/');
        const uploaded = await uploadBytes(storageRef(storage, path), file, {
          contentType: file.type || undefined,
        });

        return {
          type,
          url: await getDownloadURL(uploaded.ref),
          fileName: file.name || `${type}-${createdAt}`,
        };
      }));

      const reportPayload = {
        reporterId: user.uid,
        reportedId: 'app',
        reportType: 'user_report',
        source: 'reports_page',
        subject: reportDraft.subject,
        reason: reportDraft.reason.trim(),
        details: reportDraft.details.trim(),
        attachments,
        status: 'open',
        timestamp: serverTimestamp(),
      };
      const reportRef = await addDoc(collection(db, 'reports'), reportPayload);

      setReports((current) => [{
        id: reportRef.id,
        ...reportPayload,
        timestamp: { seconds: Math.floor(createdAt / 1000) },
      }, ...current]);
      resetReportForm();
      setFormOpen(false);
      toast.success(copy.createSuccess);
    } catch (error) {
      console.error('Failed to create report:', error);
      toast.error(copy.createError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>{`${copy.title} | Hiro`}</title>
      </Head>

      <main dir={dir} className="min-h-screen bg-[#f3f6fb] px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
          <header className="mb-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push('/settings'))}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-900 transition-colors hover:bg-white"
              aria-label={copy.back}
            >
              {isRtl ? <FiChevronRight className="h-8 w-8" /> : <FiChevronLeft className="h-8 w-8" />}
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {copy.title}
            </h1>
          </header>

          <section className="rounded-[28px] bg-gradient-to-r from-[#1f86de] to-[#3c46b4] p-6 text-white shadow-soft sm:rounded-[34px] sm:p-8">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white sm:h-20 sm:w-20">
                <FiClipboard className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">{copy.heroTitle}</h2>
                <p className="mt-2 text-base font-semibold text-white/90 sm:text-xl">{copy.heroSubtitle}</p>
              </div>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const active = activeFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={clsx(
                    'flex min-w-[7.25rem] items-center justify-center gap-3 rounded-xl border px-5 py-3 text-base font-extrabold shadow-sm transition-colors sm:min-w-[8.5rem] sm:text-lg',
                    active
                      ? 'border-primary-100 bg-primary-100 text-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-primary hover:text-primary'
                  )}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  {filter.label}
                </button>
              );
            })}
          </div>

          <section className="flex flex-1 flex-col">
            {loadingReports ? (
              <div className="flex flex-1 items-center justify-center py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : loadError ? (
              <div className="flex flex-1 items-center justify-center py-24 text-center">
                <p className="rounded-3xl bg-white px-6 py-5 text-base font-bold text-red-500 shadow-card">
                  {loadError}
                </p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200/70 text-slate-500">
                  <FiAlertTriangle className="h-14 w-14" />
                </div>
                <p className="mt-7 max-w-lg text-xl font-extrabold text-slate-950 sm:text-2xl">
                  {activeFilter === 'all' ? copy.emptyAll : copy.emptyFiltered}
                </p>
              </div>
            ) : (
              <div className="mt-8 flex flex-col gap-5">
                {filteredReports.map((report) => (
                  <article key={report.id} className="rounded-[28px] border border-[#dbe5f0] bg-white p-6 shadow-card sm:p-7">
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex min-w-0 items-start gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-slate-50 text-slate-700">
                          <FiFileText className="h-8 w-8" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-2xl font-black text-slate-950">
                            {report.reason || report.subject || copy.untitled}
                          </h3>
                          <p className="mt-2 text-lg font-semibold text-slate-500">{formatReportDate(report)}</p>
                        </div>
                      </div>

                      <span className={clsx(
                        'shrink-0 rounded-full px-4 py-2 text-base font-extrabold',
                        report.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : report.status === 'rejected'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-orange-50 text-orange-600'
                      )}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-base font-extrabold text-slate-700">
                        <FiFileText className="h-5 w-5" />
                        {copy.reportType}
                      </span>
                      <span className="rounded-full bg-indigo-50 px-4 py-2 text-base font-extrabold text-indigo-700">
                        {copy.subjectLabels?.[report.subject] || report.subject || copy.untitled}
                      </span>
                    </div>

                    {report.details ? (
                      <p className="mt-6 whitespace-pre-wrap text-xl font-semibold leading-8 text-slate-700">{report.details}</p>
                    ) : null}

                    {Array.isArray(report.attachments) && report.attachments.length > 0 ? (
                      <div className="mt-6">
                        <div className="mb-4 flex items-center gap-3">
                          <FiPaperclip className="h-7 w-7 text-slate-500" />
                          <h4 className="text-2xl font-black text-slate-700">{copy.attachments}</h4>
                          <span className="text-lg font-bold text-slate-400">{report.attachments.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                        {report.attachments.map((attachment, index) => (
                          <Link
                            key={`${attachment.url || attachment.fileName}-${index}`}
                            href={attachment.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 transition-transform hover:-translate-y-0.5"
                            title={attachment.fileName || `${copy.attachment} ${index + 1}`}
                          >
                            {attachment.type === 'image' && attachment.url ? (
                              <span
                                className="block h-32 w-48 bg-cover bg-center sm:h-44 sm:w-72"
                                style={{ backgroundImage: `url(${attachment.url})` }}
                              />
                            ) : attachment.type === 'video' && attachment.url ? (
                              <video
                                className="h-32 w-48 object-cover sm:h-44 sm:w-72"
                                src={attachment.url}
                                muted
                                playsInline
                              />
                            ) : (
                              <span className="flex h-32 w-48 items-center justify-center px-4 text-center text-sm font-bold text-slate-500 sm:h-44 sm:w-72">
                                {attachment.fileName || `${copy.attachment} ${index + 1}`}
                              </span>
                            )}
                          </Link>
                        ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-6 border-t border-slate-200 pt-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="truncate text-base font-semibold text-slate-400">
                          {copy.reportId}: {report.id}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopyReportId(report.id)}
                          className="inline-flex items-center gap-3 self-start rounded-2xl px-3 py-2 text-lg font-extrabold text-primary transition-colors hover:bg-primary-50 sm:self-auto"
                        >
                          <FiCopy className="h-6 w-6" />
                          {copy.copyId}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="fixed bottom-6 end-4 z-20 flex items-center gap-3 rounded-3xl bg-[#d7e7ff] px-6 py-5 text-lg font-extrabold text-[#0f437d] shadow-xl transition-transform hover:-translate-y-0.5 sm:end-8 sm:px-8"
        >
          <FiEdit3 className="h-6 w-6" />
          {copy.newReport}
        </button>

        {formOpen ? (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 px-0 sm:items-center sm:px-4 sm:py-6">
            <form
              onSubmit={handleCreateReport}
              className="max-h-[96vh] w-full max-w-[44rem] overflow-y-auto rounded-t-[34px] bg-[#e9ebf2] p-6 shadow-2xl sm:max-h-[92vh] sm:rounded-[34px] sm:p-8"
            >
              <div className="mb-9 flex items-center gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#dff0ff] text-primary">
                  <FiClipboard className="h-9 w-9" />
                </div>
                <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{copy.createReport}</h2>
              </div>

              <p className="mb-5 text-xl font-semibold text-slate-900">{copy.formSubtitle}</p>

              <div className="grid gap-5">
                <div className="relative">
                  <span className="absolute -top-3 start-8 z-10 bg-[#e9ebf2] px-2 text-lg font-semibold text-slate-800">
                    {copy.subject}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubjectMenuOpen((open) => !open)}
                    className="flex h-20 w-full items-center justify-between rounded-[22px] border border-[#dce6f2] bg-[#f6fbff] px-6 text-left shadow-sm"
                  >
                    <span className="flex items-center gap-5">
                      <FiGrid className="h-8 w-8 text-slate-700" />
                      <span className="text-2xl font-extrabold text-slate-950">
                        {copy.subjectLabels?.[reportDraft.subject] || reportDraft.subject}
                      </span>
                    </span>
                    <FiChevronDown className={clsx('h-7 w-7 text-slate-600 transition-transform', subjectMenuOpen && 'rotate-180')} />
                  </button>

                  {subjectMenuOpen ? (
                    <div className="absolute inset-x-[-1.75rem] top-[5.2rem] z-30 overflow-hidden rounded-sm bg-white shadow-2xl ring-1 ring-black/5">
                      {reportSubjects.map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => {
                            setReportDraft((current) => ({ ...current, subject }));
                            setSubjectMenuOpen(false);
                          }}
                          className={clsx(
                            'block w-full px-7 py-4 text-start text-2xl font-extrabold text-slate-950 transition-colors hover:bg-slate-100',
                            reportDraft.subject === subject && 'bg-[#d9d9d9]'
                          )}
                        >
                          {copy.subjectLabels?.[subject] || subject}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <label className="grid gap-2">
                  <div className="flex h-20 items-center gap-6 rounded-[22px] border border-[#dce6f2] bg-[#f6fbff] px-6 shadow-sm">
                    <FiMessageCircle className="h-8 w-8 text-slate-700" />
                  <input
                    type="text"
                    value={reportDraft.reason}
                    onChange={(event) => setReportDraft((current) => ({ ...current, reason: event.target.value.slice(0, 80) }))}
                    placeholder={copy.reasonPlaceholder}
                      className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-600"
                    maxLength={80}
                  />
                  </div>
                  <span className="text-end text-xl font-semibold text-slate-700">{reportDraft.reason.length}/80</span>
                </label>

                <label className="grid gap-2">
                  <div className="flex min-h-56 items-start gap-6 rounded-[22px] border border-[#dce6f2] bg-[#f6fbff] px-6 py-7 shadow-sm">
                    <FiMessageCircle className="mt-1 h-8 w-8 text-slate-700" />
                  <textarea
                    value={reportDraft.details}
                    onChange={(event) => setReportDraft((current) => ({ ...current, details: event.target.value.slice(0, 600) }))}
                    placeholder={copy.detailsPlaceholder}
                      className="min-h-40 min-w-0 flex-1 resize-none bg-transparent text-2xl font-semibold leading-8 text-slate-900 outline-none placeholder:text-slate-600"
                    maxLength={600}
                  />
                  </div>
                  <span className="text-end text-xl font-semibold text-slate-700">{reportDraft.details.length}/600</span>
                </label>

                <section className="rounded-[22px] bg-[#f6fbff] p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <FiPaperclip className="h-8 w-8 text-[#5c6f8c]" />
                      <h3 className="text-2xl font-black text-slate-950">{copy.attachments}</h3>
                    </div>
                    <span className="rounded-full border border-[#dce6f2] bg-white px-5 py-2 text-xl font-black text-[#5c6f8c]">
                      {reportDraft.files.length}/5
                    </span>
                  </div>
                  <p className="mb-5 text-lg font-semibold text-[#5c6f8c]">{copy.attachmentsHint}</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={reportDraft.files.length >= 5}
                      className="flex items-center gap-3 rounded-2xl border border-[#d0dce9] bg-[#f8fbff] px-7 py-4 text-xl font-black text-slate-950 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiImage className="h-7 w-7" />
                      {copy.addImage}
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={reportDraft.files.length >= 5}
                      className="flex items-center gap-3 rounded-2xl border border-[#d0dce9] bg-[#f8fbff] px-7 py-4 text-xl font-black text-slate-950 transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiFilm className="h-7 w-7" />
                      {copy.addVideo}
                    </button>
                  </div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => handleFilesChange(event, 'image')}
                    className="sr-only"
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(event) => handleFilesChange(event, 'video')}
                    className="sr-only"
                  />
                </section>

                {reportDraft.files.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {reportDraft.files.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                        {file.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex items-center justify-end gap-5">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={submitting}
                  className="rounded-2xl px-5 py-4 text-xl font-extrabold text-primary transition-colors hover:bg-white/60 disabled:opacity-60"
                >
                  {copy.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-3 rounded-[28px] bg-primary px-8 py-5 text-xl font-extrabold text-white shadow-soft transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FiSend className="h-7 w-7" />
                  {submitting ? copy.submitting : copy.submit}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </>
  );
}
