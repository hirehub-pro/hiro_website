import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaApple, FaGooglePlay } from 'react-icons/fa';
import { HiDesktopComputer, HiDeviceMobile, HiEye, HiEyeOff, HiKey, HiLockClosed, HiMail, HiOutlineUser, HiShieldCheck, HiSparkles } from 'react-icons/hi';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// Auth pages use a custom minimal layout (no Header/BottomNav)
SignInPage.getLayout = (page) => page;
SignInPage.showFooter = false;

export default function SignInPage() {
  const {
    verifyPhonePassword,
    getPasswordResetEmailHint,
    sendPasswordResetForPhone,
    sendPhoneVerification,
    confirmPhoneVerification,
    resetPhoneVerification,
  } = useAuth();
  const { t, dir } = useLanguage();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailHint, setResetEmailHint] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [sentToPhone, setSentToPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [forceMobileLayout, setForceMobileLayout] = useState(false);
  const [useWideDesktopLayout, setUseWideDesktopLayout] = useState(false);
  const appStoreUrl = 'https://apps.apple.com/us/app/hiro-%D7%94%D7%99%D7%A8%D7%95/id6763238120';
  const googlePlayUrl = 'https://play.google.com/store/apps/details?id=com.hirehub.app';
  const nextUrl = typeof router.query.next === 'string' ? router.query.next : '/';

  useEffect(() => {
    resetPhoneVerification();
    return () => {
      resetPhoneVerification();
    };
  }, [resetPhoneVerification]);

  useEffect(() => {
    function updateLayoutMode() {
      const isTouchDevice =
        typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

      // Mobile browsers in "Desktop site" mode often report ~980px width on touch devices.
      setForceMobileLayout(isTouchDevice && window.innerWidth >= 900);
      setUseWideDesktopLayout(window.innerWidth >= 1280 && !isTouchDevice);
    }

    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    return () => window.removeEventListener('resize', updateLayoutMode);
  }, []);

  async function handleSendCode(e) {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number.');
      return;
    }

    if (!password) {
      toast.error('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      await verifyPhonePassword(phoneNumber, password);
      const { formattedPhoneNumber } = await sendPhoneVerification(phoneNumber);
      setSentToPhone(formattedPhoneNumber);
      setVerificationSent(true);
      toast.success(t.auth.codeSent);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();

    if (verificationCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await confirmPhoneVerification(verificationCode);
      toast.success(t.auth.signIn);
      router.push(nextUrl);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number first.');
      return;
    }

    setLoading(true);

    try {
      const emailHint = await getPasswordResetEmailHint(phoneNumber);
      setResetEmailHint(emailHint);
      setShowPasswordReset(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number first.');
      return;
    }

    if (!resetEmail.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetForPhone(phoneNumber, resetEmail);
      toast.success('Password reset email sent.');
      setShowPasswordReset(false);
      setResetEmail('');
      setResetEmailHint('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChangePhone() {
    resetPhoneVerification();
    setVerificationSent(false);
    setPassword('');
    setResetEmail('');
    setResetEmailHint('');
    setShowPasswordReset(false);
    setVerificationCode('');
    setSentToPhone('');
  }

  async function handleGuestSignIn() {
    setLoading(true);

    try {
      toast.success(t.auth.continueAsGuest);
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const featureCards = (
    <div className={clsx(
      'mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4',
      forceMobileLayout ? 'grid-cols-1' : ''
    )}>
      <div className="glass rounded-[28px] p-4 shadow-soft">
        <HiShieldCheck className="h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-bold text-gray-900">Secure sign-in</p>
        <p className="mt-1 text-xs text-gray-500">Phone verification built for trusted access.</p>
      </div>
      <div className="glass rounded-[28px] p-4 shadow-soft">
        <HiDesktopComputer className="h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-bold text-gray-900">Fast everywhere</p>
        <p className="mt-1 text-xs text-gray-500">Optimized for quick entry and clear actions on any device.</p>
      </div>
      <div className="glass rounded-[28px] p-4 shadow-soft">
        <HiOutlineUser className="h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-bold text-gray-900">Guest option</p>
        <p className="mt-1 text-xs text-gray-500">Browse immediately without a full account.</p>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Hiro – Sign In</title></Head>

      <div
        className="min-h-screen overflow-hidden bg-slate-50"
        dir={dir}
      >
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute -left-12 top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl animate-float-slow" />

        <div
          className={clsx(
            'relative mx-auto flex min-h-screen flex-col justify-center gap-6 px-4 py-6 sm:gap-8 sm:py-10',
            forceMobileLayout
              ? 'max-w-xl'
              : 'max-w-6xl xl:grid xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:px-6'
          )}
        >
          <div className={clsx('max-w-xl text-center animate-slide-right', !forceMobileLayout && 'xl:text-left')}>
            <div className={clsx(
              'inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary shadow-sm',
              forceMobileLayout && 'mx-auto'
            )}>
              <HiSparkles className="h-4 w-4" />
              Professional access
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-gray-950 sm:text-5xl">
              {t.auth.welcome}
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base sm:leading-8">
              {t.auth.phoneSignInHelp}
            </p>
            {useWideDesktopLayout ? featureCards : null}
          </div>

          <div
            className={clsx(
              'glass relative mx-auto w-full overflow-hidden rounded-[30px] border border-white/70 p-5 shadow-hero animate-scale-in sm:rounded-[36px] sm:p-8',
              forceMobileLayout ? 'max-w-xl' : 'max-w-md'
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-primary-50/80" />
            <div className="relative mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-hero-gradient shadow-glow sm:h-16 sm:w-16 sm:rounded-[24px]">
                <span className="text-xl font-extrabold text-white sm:text-2xl">H</span>
              </div>
              <div className="mx-auto mb-4 flex max-w-[220px] items-center rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-500">
                <div className={clsx(
                  'flex-1 rounded-full px-3 py-2 transition-all',
                  !verificationSent && 'bg-white text-primary shadow-sm'
                )}>
                  1. Phone
                </div>
                <div className={clsx(
                  'flex-1 rounded-full px-3 py-2 transition-all',
                  verificationSent && 'bg-white text-primary shadow-sm'
                )}>
                  2. Code
                </div>
              </div>
              <h2 className="font-display text-2xl font-extrabold text-gray-950 sm:text-3xl">{t.auth.signIn}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {verificationSent ? 'Enter the code we sent to your phone.' : 'Use your phone number and password to continue.'}
              </p>
            </div>

            {!verificationSent ? (
              <form onSubmit={handleSendCode} className="relative space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    {t.auth.phoneNumber}
                  </label>
                  <div className="relative">
                    <HiDeviceMobile className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setShowPasswordReset(false);
                        setResetEmail('');
                        setResetEmailHint('');
                      }}
                      placeholder={t.auth.phonePlaceholder}
                      className="input-field min-h-[52px] pl-12 text-base"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t.auth.password}
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-sm font-semibold text-primary underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <HiLockClosed className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.auth.password}
                      className="input-field min-h-[52px] pl-12 pr-12 text-base"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary min-h-[52px] w-full text-base"
                >
                  {loading ? t.common.loading : t.auth.sendOtp}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="relative space-y-4">
                <div className="rounded-[24px] border border-primary-100 bg-primary-50 px-4 py-4 text-sm text-primary-dark shadow-sm">
                  <p className="font-semibold">{t.auth.codeSent}</p>
                  <p className="mt-1 break-all">{sentToPhone}</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">
                    {t.auth.verificationCode}
                  </label>
                  <div className="relative">
                    <HiKey className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t.auth.verificationPlaceholder}
                      className="input-field min-h-[52px] pl-12 text-base tracking-[0.3em] text-center sm:tracking-[0.35em]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary min-h-[52px] w-full text-base"
                >
                  {loading ? t.common.loading : t.auth.verifyCode}
                </button>

                <button
                  type="button"
                  onClick={handleChangePhone}
                  className="btn-ghost min-h-[50px] w-full"
                >
                  {t.auth.changePhone}
                </button>
              </form>
            )}

            <div id="recaptcha-container" className="relative min-h-0" />

            {/* Divider */}
            <div className="relative my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">{t.common.or}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              onClick={handleGuestSignIn}
              disabled={loading}
              className="btn-ghost relative flex min-h-[52px] w-full items-center justify-center gap-3 text-base"
            >
              <HiOutlineUser className="w-5 h-5" />
              {t.auth.continueAsGuest}
            </button>

            <p className="mt-4 text-center text-sm text-gray-500">
              {t.auth.noAccount}{' '}
              <Link href="/auth/signup" className="font-bold text-primary underline-offset-4 hover:underline">
                {t.auth.register}
              </Link>
            </p>
          </div>

          {!useWideDesktopLayout ? featureCards : null}

          <div className={clsx(
            'mx-auto w-full rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-soft animate-fade-up',
            forceMobileLayout ? 'max-w-xl' : 'max-w-md xl:mx-0'
          )}>
            <p className={clsx('mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-gray-500', !forceMobileLayout && 'xl:text-left')}>
              Get the app
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={googlePlayUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl bg-gray-950 px-4 py-3 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
              >
                <FaGooglePlay className="h-5 w-5 text-emerald-300" />
                <span className="leading-tight">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">Get it on</span>
                  <span className="block text-sm font-bold">Google Play</span>
                </span>
              </a>

              <a
                href={appStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl bg-gray-950 px-4 py-3 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-black"
              >
                <FaApple className="h-6 w-6" />
                <span className="leading-tight">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">Download on the</span>
                  <span className="block text-sm font-bold">App Store</span>
                </span>
              </a>
            </div>
          </div>

          {forceMobileLayout && (
            <div className="h-[calc(env(safe-area-inset-bottom)+0.5rem)]" />
          )}
        </div>
      </div>

      {showPasswordReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-reset-title"
            className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white p-5 shadow-hero sm:p-6"
          >
            <button
              type="button"
              onClick={() => {
                setShowPasswordReset(false);
                setResetEmail('');
                setResetEmailHint('');
              }}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              aria-label="Close password reset"
            >
              X
            </button>

            <div className="pr-10">
              <p id="password-reset-title" className="font-display text-2xl font-extrabold text-gray-950">
                Reset password
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Enter the email linked to this phone number before we send the reset link.
              </p>
            </div>

            {resetEmailHint && (
              <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-dark">
                Email on this account: <span className="font-bold">{resetEmailHint}</span>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                {t.auth.email}
              </label>
              <div className="relative">
                <HiMail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder={t.auth.email}
                  className="input-field min-h-[52px] pl-12 text-base"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(false);
                  setResetEmail('');
                  setResetEmailHint('');
                }}
                className="btn-ghost min-h-[48px]"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                disabled={loading}
                className="btn-primary min-h-[48px]"
              >
                {loading ? t.common.loading : 'Send reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
