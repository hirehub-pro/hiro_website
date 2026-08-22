import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { FiAlertTriangle, FiChevronLeft, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import { auth, db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

function getAuthProviderIds(user) {
  return Array.isArray(user?.providerData)
    ? user.providerData.map((provider) => provider.providerId)
    : [];
}

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.settings;
  const accountCopy = copy.accountSettings || {};
  const isRtl = dir === 'rtl';
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const hasPasswordProvider = useMemo(
    () => getAuthProviderIds(user).includes('password'),
    [user]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings/account/account_delete')}`);
    }
  }, [loading, router, user]);

  if (loading) {
    return <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!user) return null;

  async function handleDeleteAccount() {
    if (!confirmed) return;

    try {
      setBusy(true);
      const activeUser = auth.currentUser || user;

      if (hasPasswordProvider && activeUser.email) {
        if (!currentPassword) {
          throw new Error(accountCopy.currentPasswordRequired || 'Current password is required.');
        }
        const credential = EmailAuthProvider.credential(activeUser.email, currentPassword);
        await reauthenticateWithCredential(activeUser, credential);
      }

      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(activeUser);
      toast.success(accountCopy.accountDeleted || 'Account deleted.');
      router.push('/');
    } catch (error) {
      toast.error(error?.message || accountCopy.deleteError || 'Could not delete account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`${accountCopy.deleteAccount || 'Delete account'} | Hiro`}</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className="min-h-screen bg-[#f3f2f8] px-4 pb-24 pt-5 sm:px-6 md:px-8" dir={dir}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{accountCopy.deleteAccount || 'Delete account'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{accountCopy.deleteSubtitle || 'Permanently remove your account.'}</p>
            </div>
            <button type="button" onClick={() => router.push('/settings/account')} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-soft transition-transform hover:-translate-y-0.5" aria-label={copy.back}>
              {isRtl ? <FiChevronRight className="h-7 w-7" /> : <FiChevronLeft className="h-7 w-7" />}
            </button>
          </div>

          <section className="rounded-[30px] border border-red-100 bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><FiAlertTriangle className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-gray-950">{accountCopy.deleteConfirm || 'Delete your account permanently? This cannot be undone.'}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">Your profile and access to your Hiro account will be removed.</p>
              </div>
            </div>

            {hasPasswordProvider && (
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{accountCopy.currentPasswordPrompt || 'Enter your current password.'}</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={busy}
                  className="input-field disabled:text-slate-400"
                />
              </label>
            )}

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-red-50 px-4 py-4 text-sm font-bold text-red-900">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} className="mt-0.5 h-5 w-5 accent-red-600" />
              <span>I understand that deleting my account is permanent and cannot be undone.</span>
            </label>

            <button type="button" onClick={handleDeleteAccount} disabled={busy || !confirmed || (hasPasswordProvider && !currentPassword)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
              <FiTrash2 className="h-5 w-5" />
              {busy ? 'Deleting account…' : (accountCopy.deleteAccount || 'Delete account')}
            </button>
          </section>
        </div>
      </main>
    </>
  );
}
