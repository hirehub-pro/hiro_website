import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiKey, FiMail, FiSend } from 'react-icons/fi';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

function getResetErrorMessage(error, fallback) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Your account does not have a valid email address.';
    case 'auth/user-not-found':
      return 'We could not find an account for this email address.';
    case 'auth/too-many-requests':
      return 'Too many requests. Please wait a little before trying again.';
    case 'auth/operation-not-allowed':
      return 'Password reset is not enabled. Please contact support.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The current password is incorrect.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before changing your password.';
    default:
      return error?.message || fallback;
  }
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.settings;
  const passwordCopy = copy.accountSettings?.passwordFlow || {};
  const isRtl = dir === 'rtl';
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const email = useMemo(
    () => String(user?.email || auth.currentUser?.email || profile?.email || '').trim(),
    [profile?.email, user?.email]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings/account/password')}`);
    }
  }, [loading, router, user]);

  if (loading) {
    return <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!user) return null;

  async function handleSendResetEmail() {
    if (!email) {
      toast.error(passwordCopy.noEmail || 'Your account does not have an email address.');
      return;
    }

    if (!currentPassword) {
      toast.error(passwordCopy.currentPasswordRequired || 'Enter your current password.');
      return;
    }

    try {
      setBusy(true);
      const activeUser = auth.currentUser || user;
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(activeUser, credential);
      await sendPasswordResetEmail(auth, email, {
        url: 'https://hiro-services.com/auth/action',
        handleCodeInApp: true,
      });
      setSent(true);
      toast.success(passwordCopy.sent || 'Password reset email sent.');
    } catch (error) {
      toast.error(getResetErrorMessage(error, passwordCopy.error || 'Could not send the password reset email.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head><title>{`${passwordCopy.title || 'Change Password'} | Hiro`}</title></Head>
      <main className="min-h-screen bg-[#f3f2f8] px-4 pb-24 pt-5 sm:px-6 md:px-8" dir={dir}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{passwordCopy.title || 'Change Password'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{passwordCopy.subtitle || 'We will email you a secure link to set a new password.'}</p>
            </div>
            <button type="button" onClick={() => router.push('/settings/account')} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-soft transition-transform hover:-translate-y-0.5" aria-label={copy.back}>
              {isRtl ? <FiChevronRight className="h-7 w-7" /> : <FiChevronLeft className="h-7 w-7" />}
            </button>
          </div>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
            <div className="rounded-[30px] border border-white bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary"><FiKey className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-gray-950">{passwordCopy.cardTitle || 'Reset your password'}</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">{passwordCopy.cardSubtitle || 'We will send the reset link to the email connected to your account.'}</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{email || passwordCopy.noEmail || 'No email address available'}</div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{passwordCopy.currentPasswordLabel || 'Current password'}</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={busy || sent}
                  className="input-field disabled:text-slate-400"
                />
              </label>
              <button type="button" onClick={handleSendResetEmail} disabled={busy || sent || !email} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                {sent ? <FiCheckCircle className="h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                {sent ? (passwordCopy.sent || 'Password reset email sent') : (passwordCopy.send || 'Send password reset email')}
              </button>
            </div>
            <aside className="rounded-[30px] border border-white bg-white p-5 shadow-card sm:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary"><FiMail className="h-5 w-5" /></div>
              <h2 className="mt-4 text-xl font-extrabold tracking-tight text-gray-950">{sent ? (passwordCopy.checkInboxTitle || 'Check your inbox') : (passwordCopy.safeTitle || 'A secure reset link')}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">{sent ? (passwordCopy.checkInboxSubtitle || 'Open the email from Hiro and follow the link to choose your new password.') : (passwordCopy.safeSubtitle || 'For your security, the password can only be changed through the link sent to your email.')}</p>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
