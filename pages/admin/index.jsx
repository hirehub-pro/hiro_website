import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { HiPlusCircle, HiTrash, HiCheckCircle } from 'react-icons/hi';
import {
  getReports,
  resolveReport,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '../../lib/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [tab, setTab]                   = useState('reports');
  const [reports, setReports]           = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loadingData, setLoadingData]   = useState(true);

  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody]   = useState('');
  const [posting, setPosting]   = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/');
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingData(true);
    Promise.all([getReports(false), getAnnouncements()])
      .then(([r, a]) => {
        setReports(r);
        setAnnouncements(a);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [isAdmin]);

  async function handleResolve(id) {
    try {
      await resolveReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success('Report resolved');
    } catch {
      toast.error(t.common.error);
    }
  }

  async function handlePostAnnouncement(e) {
    e.preventDefault();
    setPosting(true);
    try {
      await createAnnouncement({ title: annTitle, body: annBody });
      toast.success('Announcement published');
      setAnnTitle('');
      setAnnBody('');
      const updated = await getAnnouncements();
      setAnnouncements(updated);
    } catch {
      toast.error(t.common.error);
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteAnnouncement(id) {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error(t.common.error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs = [
    { key: 'reports',       label: t.admin.reports },
    { key: 'announcements', label: t.admin.announcements },
  ];

  return (
    <>
      <Head><title>Hiro Admin</title></Head>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-5">{t.admin.title}</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 mb-5">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={clsx(
                'flex-1 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === tb.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Reports */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {loadingData
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
                ))
              : reports.length === 0
              ? <p className="text-center text-gray-400 py-10">{t.admin.noReports}</p>
              : reports.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{r.reason}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Reported: <span className="text-gray-600 font-medium">{r.reportedUid}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleResolve(r.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl hover:bg-green-100 transition-colors shrink-0"
                      >
                        <HiCheckCircle className="w-4 h-4" />
                        {t.admin.resolve}
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        )}

        {/* Announcements */}
        {tab === 'announcements' && (
          <div className="space-y-5">
            {/* Create form */}
            <div className="bg-primary-50 rounded-2xl p-5 border border-primary-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <HiPlusCircle className="text-primary w-5 h-5" />
                {t.admin.newAnnouncement}
              </h3>
              <form onSubmit={handlePostAnnouncement} className="space-y-3">
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder={t.admin.announcementTitle}
                  className="w-full px-4 py-3 bg-white rounded-2xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <textarea
                  required
                  rows={3}
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder={t.admin.announcementBody}
                  className="w-full px-4 py-3 bg-white rounded-2xl border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                />
                <button
                  type="submit"
                  disabled={posting}
                  className="bg-primary text-white px-5 py-2.5 rounded-2xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
                >
                  {posting ? t.common.loading : t.admin.publish}
                </button>
              </form>
            </div>

            {/* Existing announcements */}
            <div className="space-y-3">
              {loadingData
                ? Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
                  ))
                : announcements.length === 0
                ? <p className="text-center text-gray-400 py-8">{t.admin.noAnnouncements}</p>
                : announcements.map((ann) => (
                    <div key={ann.id} className="bg-white rounded-2xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ann.body}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-1"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
