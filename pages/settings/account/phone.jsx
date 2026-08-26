import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { PhoneAuthProvider, RecaptchaVerifier, updatePhoneNumber } from 'firebase/auth';
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { FiCheckCircle, FiChevronLeft, FiChevronRight, FiLock, FiPhone, FiSend, FiShield } from 'react-icons/fi';
import { auth, db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';

function normalizePhoneNumber(phoneNumber) {
  const rawValue = String(phoneNumber || '').trim();

  if (rawValue.startsWith('+')) {
    return `+${rawValue.slice(1).replace(/\D/g, '')}`;
  }

  const digits = rawValue.replace(/\D/g, '');

  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith('0')) {
    return `+972${digits.slice(1)}`;
  }

  return `+${digits}`;
}

function isValidPhoneNumber(phoneNumber) {
  return /^\+\d{8,15}$/.test(phoneNumber);
}

function getFirebaseAuthMessage(error, fallback) {
  switch (error?.code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid phone number.';
    case 'auth/invalid-verification-code':
      return 'The verification code is incorrect.';
    case 'auth/code-expired':
      return 'The verification code expired. Please request a new code.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again before changing your phone number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little before trying again.';
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

export default function ChangePhoneNumberPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.settings;
  const accountCopy = copy.accountSettings || {};
  const phoneCopy = accountCopy.phoneFlow || {};
  const isRtl = dir === 'rtl';
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCode, setNewCode] = useState('');
  const [currentVerificationId, setCurrentVerificationId] = useState('');
  const [newVerificationId, setNewVerificationId] = useState('');
  const [currentVerified, setCurrentVerified] = useState(false);
  const [busy, setBusy] = useState('');
  const verifierRef = useRef(null);

  const savedPhone = useMemo(
    () => normalizePhoneNumber(profile?.phone || auth.currentUser?.phoneNumber || ''),
    [profile?.phone]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings/account/phone')}`);
    }
  }, [loading, router, user]);

  useEffect(() => () => {
    if (verifierRef.current) {
      try {
        verifierRef.current.clear();
      } catch (error) {
        // Ignore stale verifier cleanup errors.
      }
      verifierRef.current = null;
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  function getVerifier() {
    if (typeof window === 'undefined') {
      throw new Error(phoneCopy.browserOnly || 'Phone verification is only available in the browser.');
    }

    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, 'phone-change-recaptcha', {
        size: 'invisible',
        callback: () => {},
      });
    }

    return verifierRef.current;
  }

  async function sendSms(phoneNumber) {
    const provider = new PhoneAuthProvider(auth);
    return provider.verifyPhoneNumber(phoneNumber, getVerifier());
  }

  async function isPhoneAvailable(phoneNumber) {
    const usersRef = collection(db, 'publicWorkerProfiles');
    const phoneQuery = query(
      usersRef,
      where('isSearchVisible', '==', true),
      where('phone', '==', phoneNumber),
      limit(1)
    );
    const snap = await getDocs(phoneQuery);
    return snap.empty || snap.docs[0].id === user.uid;
  }

  async function handleSendCurrentCode(event) {
    event.preventDefault();

    const normalizedPhone = normalizePhoneNumber(currentPhone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      toast.error(phoneCopy.invalidPhone || accountCopy.invalidPhone || 'Enter a valid phone number.');
      return;
    }

    if (!savedPhone || normalizedPhone !== savedPhone) {
      toast.error(phoneCopy.currentPhoneMismatch || 'This does not match your current phone number.');
      return;
    }

    try {
      setBusy('current-send');
      const verificationId = await sendSms(normalizedPhone);
      setCurrentVerificationId(verificationId);
      toast.success(phoneCopy.currentCodeSent || 'Verification code sent to your current phone.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, phoneCopy.smsError || 'Could not send SMS.'));
    } finally {
      setBusy('');
    }
  }

  async function handleVerifyCurrentCode(event) {
    event.preventDefault();

    if (!currentVerificationId || currentCode.trim().length < 6) {
      toast.error(phoneCopy.codeRequired || 'Enter the SMS verification code.');
      return;
    }

    try {
      setBusy('current-verify');
      const credential = PhoneAuthProvider.credential(currentVerificationId, currentCode.trim());
      await updatePhoneNumber(auth.currentUser, credential);
      await setDoc(doc(db, profile?.role === 'worker' ? 'publicWorkerProfiles' : 'users', user.uid), {
        phone: savedPhone,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setCurrentVerified(true);
      toast.success(phoneCopy.currentVerified || 'Current phone verified.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, phoneCopy.codeError || 'The verification code is incorrect.'));
    } finally {
      setBusy('');
    }
  }

  async function handleSendNewCode(event) {
    event.preventDefault();

    const normalizedPhone = normalizePhoneNumber(newPhone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      toast.error(phoneCopy.invalidPhone || accountCopy.invalidPhone || 'Enter a valid phone number.');
      return;
    }

    if (normalizedPhone === savedPhone) {
      toast.error(phoneCopy.samePhone || 'Enter a different phone number.');
      return;
    }

    try {
      setBusy('new-send');
      if (!(await isPhoneAvailable(normalizedPhone))) {
        toast.error(accountCopy.phoneInUse || 'This phone number is already registered.');
        return;
      }

      const verificationId = await sendSms(normalizedPhone);
      setNewVerificationId(verificationId);
      toast.success(phoneCopy.newCodeSent || 'Verification code sent to your new phone.');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, phoneCopy.smsError || 'Could not send SMS.'));
    } finally {
      setBusy('');
    }
  }

  async function handleVerifyNewAndSave(event) {
    event.preventDefault();

    const normalizedPhone = normalizePhoneNumber(newPhone);
    if (!newVerificationId || newCode.trim().length < 6) {
      toast.error(phoneCopy.codeRequired || 'Enter the SMS verification code.');
      return;
    }

    try {
      setBusy('save');
      const credential = PhoneAuthProvider.credential(newVerificationId, newCode.trim());
      await updatePhoneNumber(auth.currentUser, credential);
      await setDoc(doc(db, profile?.role === 'worker' ? 'publicWorkerProfiles' : 'users', user.uid), {
        phone: normalizedPhone,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success(accountCopy.phoneUpdated || 'Phone number updated.');
      router.push('/settings/account');
    } catch (error) {
      toast.error(getFirebaseAuthMessage(error, accountCopy.updateError || 'Could not update account.'));
    } finally {
      setBusy('');
    }
  }

  const currentSmsSent = Boolean(currentVerificationId);
  const newSmsSent = Boolean(newVerificationId);

  return (
    <>
      <Head>
        <title>{`${phoneCopy.title || 'Change Phone Number'} | Hiro`}</title>
      </Head>

      <main className="min-h-screen bg-[#f3f2f8] px-4 pb-24 pt-5 sm:px-6 md:px-8" dir={dir}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{phoneCopy.title || 'Change Phone Number'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{phoneCopy.subtitle || 'Verify your current phone before adding a new one.'}</p>
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
            <StepPill number="1" label={phoneCopy.currentTitle || 'Current phone'} active={!currentVerified} complete={currentVerified} />
            <StepPill number="2" label={phoneCopy.newTitle || 'New phone'} active={currentVerified && !newSmsSent} complete={false} />
            <StepPill number="3" label={phoneCopy.verifyNewCode || 'Finish'} active={newSmsSent} complete={false} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PanelShell>
              <form onSubmit={currentSmsSent && !currentVerified ? handleVerifyCurrentCode : handleSendCurrentCode}>
                <PanelHeader
                  icon={FiShield}
                  title={phoneCopy.currentTitle || 'Verify current phone'}
                  subtitle={phoneCopy.currentSubtitle || 'Enter the phone number already saved on your account.'}
                  complete={currentVerified}
                />

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">{phoneCopy.currentPhoneLabel || 'Current phone number'}</span>
                    <input
                      type="tel"
                      value={currentPhone}
                      onChange={(event) => setCurrentPhone(event.target.value)}
                      placeholder="+972..."
                      autoComplete="off"
                      disabled={currentSmsSent || currentVerified}
                      className="input-field disabled:text-slate-400"
                    />
                  </label>

                  {currentSmsSent && !currentVerified ? (
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">{phoneCopy.currentCodeLabel || 'Current phone SMS code'}</span>
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
                </div>

                <button
                  type="submit"
                  disabled={Boolean(busy) || currentVerified}
                  className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {currentSmsSent && !currentVerified ? <FiCheckCircle className="h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                  {currentSmsSent && !currentVerified
                    ? (phoneCopy.verifyCurrentCode || 'Verify current phone')
                    : (phoneCopy.sendCurrentCode || 'Send SMS code')}
                </button>
              </form>
            </PanelShell>

            <PanelShell locked={!currentVerified}>
              <form onSubmit={newSmsSent ? handleVerifyNewAndSave : handleSendNewCode}>
                <PanelHeader
                  icon={FiPhone}
                  title={phoneCopy.newTitle || 'Verify new phone'}
                  subtitle={phoneCopy.newSubtitle || 'Enter the new phone number and verify it by SMS.'}
                  locked={!currentVerified}
                  complete={false}
                />

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">{phoneCopy.newPhoneLabel || 'New phone number'}</span>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(event) => setNewPhone(event.target.value)}
                      placeholder="+972..."
                      disabled={!currentVerified || newSmsSent}
                      className="input-field disabled:text-slate-400"
                    />
                  </label>

                  {newSmsSent ? (
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">{phoneCopy.newCodeLabel || 'New phone SMS code'}</span>
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
                </div>

                <button
                  type="submit"
                  disabled={Boolean(busy) || !currentVerified}
                  className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {newSmsSent ? <FiCheckCircle className="h-5 w-5" /> : <FiSend className="h-5 w-5" />}
                  {newSmsSent
                    ? (phoneCopy.verifyNewCode || 'Verify and change phone number')
                    : (phoneCopy.sendNewCode || 'Send SMS to new phone')}
                </button>
              </form>
            </PanelShell>
          </div>

          <div id="phone-change-recaptcha" />
        </div>
      </main>
    </>
  );
}
