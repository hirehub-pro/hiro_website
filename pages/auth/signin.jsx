import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaApple, FaGooglePlay } from 'react-icons/fa';
import { HiDeviceMobile, HiKey, HiOutlineUser, HiShieldCheck, HiSparkles } from 'react-icons/hi';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// Auth pages use a custom minimal layout (no Header/BottomNav)
SignInPage.getLayout = (page) => page;

export default function SignInPage() {
  const {
    signInAsGuest,
    sendPhoneVerification,
    confirmPhoneVerification,
    resetPhoneVerification,
  } = useAuth();
  const { t, dir } = useLanguage();
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [sentToPhone, setSentToPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [forceMobileLayout, setForceMobileLayout] = useState(false);
  const appStoreUrl = '#';
  const googlePlayUrl = '#';

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

    setLoading(true);

    try {
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
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChangePhone() {
    resetPhoneVerification();
    setVerificationSent(false);
    setVerificationCode('');
    setSentToPhone('');
  }

  async function handleGuestSignIn() {
    setLoading(true);
    try {
      await signInAsGuest();
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

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
            'relative mx-auto flex min-h-screen flex-col justify-center gap-8 px-4 py-10',
            forceMobileLayout
              ? 'max-w-xl'
              : 'max-w-6xl xl:grid xl:grid-cols-[1.05fr_0.95fr] xl:items-center xl:px-6'
          )}
        >
          <div className={clsx('max-w-xl text-center animate-slide-right', !forceMobileLayout && 'xl:text-left')}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary shadow-sm">
              <HiSparkles className="h-4 w-4" />
              Professional access
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 sm:text-5xl">
              {t.auth.welcome}
            </h1>
            <p className="mt-4 text-base leading-8 text-gray-500">
              {t.auth.phoneSignInHelp}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="glass rounded-[28px] p-4 shadow-soft">
                <HiShieldCheck className="h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-bold text-gray-900">Secure sign-in</p>
                <p className="mt-1 text-xs text-gray-500">Phone verification built for trusted access.</p>
              </div>
              <div className="glass rounded-[28px] p-4 shadow-soft">
                <HiDeviceMobile className="h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-bold text-gray-900">Fast on mobile</p>
                <p className="mt-1 text-xs text-gray-500">Optimized for quick entry and clear actions.</p>
              </div>
              <div className="glass rounded-[28px] p-4 shadow-soft">
                <HiOutlineUser className="h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-bold text-gray-900">Guest option</p>
                <p className="mt-1 text-xs text-gray-500">Browse immediately without a full account.</p>
              </div>
            </div>
          </div>

          <div
            className={clsx(
              'glass relative mx-auto w-full overflow-hidden rounded-[36px] border border-white/70 p-6 shadow-hero animate-scale-in sm:p-8',
              forceMobileLayout ? 'max-w-xl' : 'max-w-md'
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-primary-50/80" />
            <div className="relative mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-hero-gradient shadow-glow">
                <span className="text-2xl font-extrabold text-white">H</span>
              </div>
              <h2 className="font-display text-3xl font-extrabold text-gray-950">{t.auth.signIn}</h2>
              <p className="mt-2 text-sm text-gray-500">Choose the fastest way to continue.</p>
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
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={t.auth.phonePlaceholder}
                      className="input-field pl-12"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
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
                      className="input-field pl-12 tracking-[0.35em]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? t.common.loading : t.auth.verifyCode}
                </button>

                <button
                  type="button"
                  onClick={handleChangePhone}
                  className="btn-ghost w-full"
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
              className="btn-ghost relative flex w-full items-center justify-center gap-3"
            >
              <HiOutlineUser className="w-5 h-5" />
              {t.auth.continueAsGuest}
            </button>
          </div>

          <p className={clsx('text-center text-sm text-gray-500', !forceMobileLayout && 'xl:text-left')}>
            {t.auth.noAccount}{' '}
            <Link href="/auth/signup" className="font-bold text-primary underline-offset-4 hover:underline">
              {t.auth.register}
            </Link>
          </p>

          <div className={clsx('mx-auto w-full rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-soft animate-fade-up', forceMobileLayout ? 'max-w-xl' : 'max-w-md xl:mx-0')}>
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
        </div>
      </div>
    </>
  );
}
