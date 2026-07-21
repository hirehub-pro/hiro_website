import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiLock, FiMail, FiSend, FiShield } from 'react-icons/fi';
import { auth, functions } from '../../../lib/firebase';
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
    case 'functions/invalid-argument':
      return error?.message || 'Check the email/code and try again.';
    case 'functions/already-exists':
      return 'This email is already used by another account.';
    case 'functions/failed-precondition':
      return error?.message || 'Please complete the previous verification step first.';
    case 'functions/resource-exhausted':
      return error?.message || 'Too many attempts. Please request a new code.';
    case 'functions/unauthenticated':
      return 'Please sign in before changing your email.';
    case 'functions/internal':
      return error?.message && error.message !== 'internal'
        ? error.message
        : fallback;
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'This email is already used by another account.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before changing your email.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little before trying again.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The current password is incorrect.';
    default:
      return error?.message || fallback;
  }
}

function StepPill({ number, label, active, complete }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold transition-colors ${
      complete
        ? 'bg-emerald-50 text-emerald-700'
        : active
          ? 'bg-primary-50 text-primary'
          : 'bg-white text-slate-400'
    }`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        complete
          ? 'bg-emerald-500 text-white'
          : active
            ? 'bg-primary text-white'
            : 'bg-slate-100 text-slate-400'
      }`}>
        {complete ? <FiCheckCircle className="h-4 w-4" /> : number}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, complete, locked }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
        complete
          ? 'bg-emerald-50 text-emerald-600'
          : locked
            ? 'bg-slate-100 text-slate-400'
            : 'bg-primary-50 text-primary'
      }`}>
        {complete ? <FiCheckCircle className="h-6 w-6" /> : locked ? <FiLock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className={`text-xl font-extrabold tracking-tight ${locked ? 'text-slate-400' : 'text-gray-950'}`}>{title}</h2>
        <p className="mt-1 text-sm font-semibold leading-5 text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function PanelShell({ children, locked = false }) {
  return (
    <div className={`rounded-[30px] border bg-white p-5 shadow-card transition-all sm:p-6 ${
      locked ? 'border-slate-100 opacity-65' : 'border-white'
    }`}>
      {children}
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
  const [currentCode, setCurrentCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [currentVerificationSent, setCurrentVerificationSent] = useState(false);
  const [currentVerified, setCurrentVerified] = useState(false);
  const [newVerificationSent, setNewVerificationSent] = useState(false);
  const [busy, setBusy] = useState('');

  const savedEmail = useMemo(
    () => normalizeEmail(auth.currentUser?.email || profile?.email || ''),
    [profile?.email]
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

  async function handleSendCurrentVerification(event) {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(currentEmail);

    if (!isValidEmail(normalizedEmail)) {
      toast.error(accountCopy.invalidEmail || 'Enter a valid email address.');
      return;
    }

    if (!savedEmail || normalizedEmail !== savedEmail) {
      toast.error(emailCopy.currentEmailMismatch || 'This does not match your current email.');
      return;
    }

    try {
      setBusy('current-send');
      const sendCode = httpsCallable(functions, 'sendAccountEmailCode');
      await sendCode({ purpose: 'current', email: normalizedEmail });
      setCurrentVerificationSent(true);
      toast.success(emailCopy.currentVerificationSent || 'Verification code sent to your current email.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, emailCopy.emailError || 'Could not send verification code.'));
    } finally {
      setBusy('');
    }
  }

  async function handleConfirmCurrentVerified(event) {
    event.preventDefault();

    if (currentCode.trim().length < 6) {
      toast.error(emailCopy.codeRequired || 'Enter the email verification code.');
      return;
    }

    try {
      setBusy('current-check');
      const verifyCode = httpsCallable(functions, 'verifyAccountEmailCode');
      await verifyCode({ purpose: 'current', email: savedEmail, code: currentCode.trim() });
      setCurrentVerified(true);
      toast.success(emailCopy.currentVerified || 'Current email verified.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, emailCopy.codeError || 'The verification code is incorrect.'));
    } finally {
      setBusy('');
    }
  }

  async function handleSendNewVerification(event) {
    event.preventDefault();
    const normalizedNewEmail = normalizeEmail(newEmail);

    if (!isValidEmail(normalizedNewEmail)) {
      toast.error(accountCopy.invalidEmail || 'Enter a valid email address.');
      return;
    }

    if (normalizedNewEmail === savedEmail) {
      toast.error(emailCopy.sameEmail || 'Enter a different email address.');
      return;
    }

    try {
      setBusy('new-send');
      const sendCode = httpsCallable(functions, 'sendAccountEmailCode');
      await sendCode({ purpose: 'new', email: normalizedNewEmail });
      setNewVerificationSent(true);
      toast.success(emailCopy.newVerificationSent || 'Verification code sent to your new email.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, emailCopy.emailError || 'Could not send verification code.'));
    } finally {
      setBusy('');
    }
  }

  async function handleConfirmNewAndSave(event) {
    event.preventDefault();
    const normalizedNewEmail = normalizeEmail(newEmail);

    if (newCode.trim().length < 6) {
      toast.error(emailCopy.codeRequired || 'Enter the email verification code.');
      return;
    }

    try {
      setBusy('save');
      const verifyCode = httpsCallable(functions, 'verifyAccountEmailCode');
      await verifyCode({ purpose: 'new', email: normalizedNewEmail, code: newCode.trim() });
      await auth.currentUser.reload();
      toast.success(accountCopy.emailUpdated || 'Email updated.');
      router.push('/settings/account');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, emailCopy.codeError || accountCopy.updateError || 'Could not update account.'));
    } finally {
      setBusy('');
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
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{emailCopy.subtitle || 'Verify your current email before adding a new one.'}</p>
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
            <StepPill number="1" label={emailCopy.currentTitle || 'Current email'} active={!currentVerified} complete={currentVerified} />
            <StepPill number="2" label={emailCopy.newTitle || 'New email'} active={currentVerified && !newVerificationSent} complete={false} />
            <StepPill number="3" label={emailCopy.finishTitle || 'Finish'} active={newVerificationSent} complete={false} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PanelShell>
              <form onSubmit={currentVerificationSent && !currentVerified ? handleConfirmCurrentVerified : handleSendCurrentVerification}>
                <PanelHeader
                  icon={FiShield}
                  title={emailCopy.currentTitle || 'Verify current email'}
                  subtitle={emailCopy.currentSubtitle || 'Enter the email already saved on your account.'}
                  complete={currentVerified}
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{emailCopy.currentEmailLabel || 'Current email address'}</span>
                  <input
                    type="email"
                    value={currentEmail}
                    onChange={(event) => setCurrentEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="off"
                    disabled={currentVerificationSent || currentVerified}
                    className="input-field disabled:text-slate-400"
                  />
                </label>

                {currentVerificationSent && !currentVerified ? (
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">{emailCopy.currentCodeLabel || 'Current email code'}</span>
                    <input
                      inputMode="numeric"
                      value={currentCode}
                      onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      className="input-field text-center text-2xl font-extrabold tracking-[0.3em]"
                    />
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={Boolean(busy) || currentVerified}
                  className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {currentVerificationSent && !currentVerified ? <FiCheckCircle className="h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                  {currentVerificationSent && !currentVerified
                    ? (emailCopy.confirmCurrentVerified || 'I verified current email')
                    : (emailCopy.sendCurrentVerification || 'Send verification email')}
                </button>
              </form>
            </PanelShell>

            <PanelShell locked={!currentVerified}>
              <form onSubmit={newVerificationSent ? handleConfirmNewAndSave : handleSendNewVerification}>
                <PanelHeader
                  icon={FiMail}
                  title={emailCopy.newTitle || 'Verify new email'}
                  subtitle={emailCopy.newSubtitle || 'Enter the new email and verify it from your inbox.'}
                  locked={!currentVerified}
                  complete={false}
                />

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">{emailCopy.newEmailLabel || 'New email address'}</span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="off"
                    disabled={!currentVerified || newVerificationSent}
                    className="input-field disabled:text-slate-400"
                  />
                </label>

                {newVerificationSent ? (
                  <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">{emailCopy.newCodeLabel || 'New email code'}</span>
                    <input
                      inputMode="numeric"
                      value={newCode}
                      onChange={(event) => setNewCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      className="input-field text-center text-2xl font-extrabold tracking-[0.3em]"
                    />
                  </label>
                ) : null}

                <button
                  type="submit"
                  disabled={Boolean(busy) || !currentVerified}
                  className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {newVerificationSent ? <FiCheckCircle className="h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                  {newVerificationSent
                    ? (emailCopy.confirmNewVerified || 'I verified new email')
                    : (emailCopy.sendNewVerification || 'Send verification to new email')}
                </button>
              </form>
            </PanelShell>
          </div>
        </div>
      </main>
    </>
  );
}
