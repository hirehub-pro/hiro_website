import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiMail, FiSend, FiShield } from 'react-icons/fi';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getFirebaseAuthMessage(error, fallback) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'This email is already used by another account.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before changing your email.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little before trying again.';
    case 'auth/operation-not-allowed':
      return 'Firebase could not send the email change verification. Check the Firebase email template and authorized domain settings.';
    case 'auth/user-token-expired':
      return 'Please sign in again before changing your email.';
    default:
      return error?.message || fallback;
  }
}

function StatusPill({ icon: Icon, label, active }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold transition-colors ${
      active ? 'bg-primary-50 text-primary' : 'bg-white text-slate-400'
    }`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
      }`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function InfoPanel({ icon: Icon, title, subtitle }) {
  return (
    <div className="rounded-[30px] border border-white bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-tight text-gray-950">{title}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function ChangeEmailPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.settings;
  const accountCopy = copy.accountSettings || {};
  const emailCopy = accountCopy.emailFlow || {};
  const isRtl = dir === 'rtl';
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const savedEmail = useMemo(
    () => normalizeEmail(user?.email || auth.currentUser?.email || profile?.email || ''),
    [profile?.email, user?.email]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings/account/email')}`);
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  async function handleSendEmailChange(event) {
    event.preventDefault();
    const normalizedCurrentEmail = normalizeEmail(currentEmail);
    const normalizedNewEmail = normalizeEmail(newEmail);

    if (!isValidEmail(normalizedCurrentEmail) || !isValidEmail(normalizedNewEmail)) {
      toast.error(accountCopy.invalidEmail || 'Enter a valid email address.');
      return;
    }

    if (!savedEmail || normalizedCurrentEmail !== savedEmail) {
      toast.error(emailCopy.currentEmailMismatch || 'This does not match your current email.');
      return;
    }

    if (normalizedNewEmail === savedEmail) {
      toast.error(emailCopy.sameEmail || 'Enter a different email address.');
      return;
    }

    try {
      setBusy(true);
      const activeUser = auth.currentUser || user;
      await verifyBeforeUpdateEmail(activeUser, normalizedNewEmail);
      setSent(true);
      toast.success(emailCopy.newVerificationSent || 'Verification email sent.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, emailCopy.emailError || 'Could not send verification email.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Head>
        <title>{`${emailCopy.title || 'Change Email'} | Hiro`}</title>
      </Head>

      <main className="min-h-screen bg-[#f3f2f8] px-4 pb-24 pt-5 sm:px-6 md:px-8" dir={dir}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{emailCopy.title || 'Change Email'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{emailCopy.subtitle || 'Send a Firebase verification link to your new email address.'}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/settings/account')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-soft transition-transform duration-200 hover:-translate-y-0.5"
              aria-label={copy.back}
            >
              {isRtl ? <FiChevronRight className="h-7 w-7" /> : <FiChevronLeft className="h-7 w-7" />}
            </button>
          </div>

          <div className="mb-5 grid gap-2 rounded-[28px] bg-white/70 p-2 shadow-sm backdrop-blur sm:grid-cols-3">
            <StatusPill icon={FiShield} label={emailCopy.currentTitle || 'Confirm current email'} active={!sent} />
            <StatusPill icon={FiMail} label={emailCopy.newTitle || 'New email'} active={!sent} />
            <StatusPill icon={FiCheckCircle} label={emailCopy.finishTitle || 'Open Firebase email'} active={sent} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
            <form onSubmit={handleSendEmailChange} className="rounded-[30px] border border-white bg-white p-5 shadow-card sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                  <FiMail className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-extrabold tracking-tight text-gray-950">{emailCopy.newTitle || 'Change email with Firebase'}</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">
                    {emailCopy.newSubtitle || 'Firebase will send a secure link to the new address. The email changes only after the link is opened.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{emailCopy.currentEmailLabel || 'Current email address'}</span>
                  <input
                    type="email"
                    value={currentEmail}
                    onChange={(event) => setCurrentEmail(event.target.value)}
                    placeholder="current@example.com"
                    autoComplete="off"
                    disabled={busy || sent}
                    className="input-field disabled:text-slate-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{emailCopy.newEmailLabel || 'New email address'}</span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="new@example.com"
                    autoComplete="off"
                    disabled={busy || sent}
                    className="input-field disabled:text-slate-400"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={busy || sent}
                className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sent ? <FiCheckCircle className="h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                {sent
                  ? (emailCopy.newVerificationSent || 'Verification email sent')
                  : (emailCopy.sendNewVerification || 'Send Firebase verification email')}
              </button>
            </form>

            <InfoPanel
              icon={sent ? FiCheckCircle : FiShield}
              title={sent ? (emailCopy.finishTitle || 'Check your inbox') : (emailCopy.currentTitle || 'Firebase protected')}
              subtitle={sent
                ? (emailCopy.afterSendHelp || 'Open the link from Firebase to complete the email change.')
                : (emailCopy.currentSubtitle || 'This uses the Firebase Authentication email address change template from your console.')}
            />
          </div>
        </div>
      </main>
    </>
  );
}
