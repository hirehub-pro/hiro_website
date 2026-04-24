import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiBriefcase, HiOfficeBuilding, HiSparkles, HiDeviceMobile, HiKey, HiChevronDown, HiChevronUp, HiCheck, HiX, HiCreditCard } from 'react-icons/hi';
import clsx from 'clsx';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/firebase';

SignUpPage.getLayout = (page) => page;

export default function SignUpPage() {
  const {
    checkPhoneAvailability,
    sendPhoneVerification,
    confirmPhoneVerification,
    resetPhoneVerification,
    completePhoneSignUp,
  } = useAuth();
  const { t, dir, locale } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState('customer');
  const [agreePolicy, setAgreePolicy] = useState(false);

  const [professions, setProfessions] = useState([]);
  const [workRadius, setWorkRadius] = useState('15');
  const [optionalPhone, setOptionalPhone] = useState('');
  const [description, setDescription] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentToPhone, setSentToPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [professionOptions, setProfessionOptions] = useState([]);
  const [professionsLoading, setProfessionsLoading] = useState(true);
  const [professionMenuOpen, setProfessionMenuOpen] = useState(false);
  const [professionSearch, setProfessionSearch] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [agreeSubscription, setAgreeSubscription] = useState(false);
  const professionMenuRef = useRef(null);

  const roleCards = [
    { key: 'customer', label: t.auth.customer, subLabel: 'Find and hire local experts', icon: HiOutlineUser },
    { key: 'worker', label: t.auth.worker, subLabel: 'Offer your services as a pro', icon: HiBriefcase },
  ];

  useEffect(() => {
    resetPhoneVerification();
    return () => resetPhoneVerification();
  }, [resetPhoneVerification]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfessions() {
      setProfessionsLoading(true);
      try {
        const professionsSnap = await getDoc(doc(db, 'metadata', 'professions'));

        if (!isMounted) return;

        const items = (professionsSnap.data()?.items || [])
          .map((item, index) => {
            const label = item[locale] || item.en || item.he || item.ar || item.logo || `Profession ${index + 1}`;
            const value = item.en || item.logo || label;

            return {
              id: String(item.id ?? index),
              label,
              value,
              bookingMode: item.bookingMode || '',
              color: item.color || '#1976D2',
              logo: item.logo || '',
            };
          })
          .sort((a, b) => Number(a.id) - Number(b.id));

        setProfessionOptions(items);
      } catch (error) {
        if (isMounted) {
          toast.error('Failed to load professions');
          setProfessionOptions([]);
        }
      } finally {
        if (isMounted) {
          setProfessionsLoading(false);
        }
      }
    }

    loadProfessions();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (professionMenuRef.current && !professionMenuRef.current.contains(event.target)) {
        setProfessionMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const professionLabelMap = useMemo(() => (
    professionOptions.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {})
  ), [professionOptions]);

  const filteredProfessionOptions = useMemo(() => {
    const searchValue = professionSearch.trim().toLowerCase();
    if (!searchValue) return professionOptions;

    return professionOptions.filter((item) => (
      item.label.toLowerCase().includes(searchValue) || item.value.toLowerCase().includes(searchValue)
    ));
  }, [professionOptions, professionSearch]);

  function toggleProfession(item) {
    setProfessions((current) => (
      current.includes(item) ? current.filter((p) => p !== item) : [...current, item]
    ));
  }

  function handleDetailsContinue(e) {
    e.preventDefault();

    if (!name.trim()) return toast.error('Please enter your full name');
    if (!city.trim()) return toast.error('Please enter your city');
    if (!agreePolicy) return toast.error('You must agree to Terms and Privacy Policy');

    setStep(role === 'worker' ? 'professional' : 'verify');
  }

  function handleProfessionalContinue(e) {
    e.preventDefault();

    if (professions.length === 0) {
      return toast.error('Please choose at least one profession');
    }

    setStep('verify');
  }

  async function handleSendCode(e) {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number.');
      return;
    }

    setLoading(true);
    try {
      const isAvailable = await checkPhoneAvailability(phoneNumber);
      if (!isAvailable) {
        toast.error('This phone number is already registered');
        return;
      }

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

  async function handleVerifyAndCreate(e) {
    e.preventDefault();

    if (verificationCode.length < 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await confirmPhoneVerification(verificationCode);

      if (role === 'worker') {
        toast.success('Phone verified. Complete your subscription to activate Pro account.');
        setStep('payment');
        return;
      }

      await completePhoneSignUp({
        name,
        email,
        role,
        city,
        phoneNumber,
        professions,
        workRadius,
        optionalPhone,
        description,
      });

      toast.success('Account created!');
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

  async function handleCompleteSubscription(e) {
    e.preventDefault();

    if (!cardHolder.trim()) return toast.error('Please enter card holder name');
    if (cardNumber.replace(/\D/g, '').length < 12) return toast.error('Please enter a valid card number');
    if (!cardExpiry.trim()) return toast.error('Please enter card expiry');
    if (cardCvv.replace(/\D/g, '').length < 3) return toast.error('Please enter a valid CVV');
    if (!agreeSubscription) return toast.error('Please accept the subscription charge');

    setLoading(true);
    try {
      await completePhoneSignUp({
        name,
        email,
        role,
        city,
        phoneNumber,
        professions,
        workRadius,
        optionalPhone,
        description,
        subscription: {
          isSubscribed: true,
          status: 'active',
          plan: 'pro-monthly-100-ils',
          amount: 100,
          currency: 'ILS',
        },
      });

      toast.success('Subscription activated. Welcome to Hiro Pro!');
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stepFlow = role === 'worker'
    ? ['details', 'professional', 'verify', 'payment']
    : ['details', 'verify'];
  const currentStepIndex = Math.max(stepFlow.indexOf(step), 0);

  return (
    <>
      <Head><title>Hiro – Sign Up</title></Head>

      <div className="min-h-screen overflow-hidden bg-slate-50" dir={dir}>
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute -right-16 top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl animate-float-slow" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-4 py-10 lg:grid lg:grid-cols-[1fr_1fr] lg:items-center lg:px-6">
          <section className="animate-slide-right text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary shadow-sm">
              <HiSparkles className="h-4 w-4" />
              Join Hiro
            </div>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-gray-950 sm:text-5xl">
              {t.auth.signUp}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-gray-500">
              Enter your basic details, choose your account type, and verify your phone number.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="glass rounded-[28px] p-4 shadow-soft">
                <HiOfficeBuilding className="h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-bold text-gray-900">Professional profile</p>
                <p className="mt-1 text-xs text-gray-500">Show skills, service radius, and profile details.</p>
              </div>
              <div className="glass rounded-[28px] p-4 shadow-soft">
                <HiOutlineUser className="h-8 w-8 text-primary" />
                <p className="mt-3 text-sm font-bold text-gray-900">Customer account</p>
                <p className="mt-1 text-xs text-gray-500">Find trusted professionals and contact them quickly.</p>
              </div>
            </div>
          </section>

          <div className="glass relative mx-auto w-full max-w-md overflow-hidden rounded-[36px] border border-white/70 p-6 shadow-hero animate-scale-in sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/70 to-primary-50/80" />

            <div className="relative mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-hero-gradient shadow-glow">
                <span className="text-2xl font-extrabold text-white">H</span>
              </div>
              <h2 className="font-display text-3xl font-extrabold text-gray-950">{t.auth.signUp}</h2>
              <p className="mt-2 text-sm text-gray-500">Follow the steps to create your account.</p>
            </div>

            <div className="relative mb-5 flex items-center gap-2">
              {stepFlow.map((item, index) => (
                <div
                  key={item}
                  className={clsx('h-1.5 flex-1 rounded-full transition-colors', index <= currentStepIndex ? 'bg-primary' : 'bg-gray-100')}
                />
              ))}
            </div>

            {step === 'details' && (
              <form onSubmit={handleDetailsContinue} className="relative space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.auth.fullName}</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.auth.email} (optional)</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.auth.city}</label>
                  <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="input-field" />
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">{t.auth.iAmA}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {roleCards.map((roleCard) => {
                      const isActive = role === roleCard.key;
                      const Icon = roleCard.icon;
                      return (
                        <button
                          key={roleCard.key}
                          type="button"
                          onClick={() => setRole(roleCard.key)}
                          className={clsx(
                            'rounded-2xl border-2 px-3 py-3 text-left transition-all duration-200',
                            isActive ? 'border-primary bg-primary-50 shadow-sm' : 'border-gray-100 bg-white/80 hover:border-gray-200'
                          )}
                        >
                          <Icon className={clsx('mb-2 h-5 w-5', isActive ? 'text-primary' : 'text-gray-400')} />
                          <p className={clsx('text-sm font-bold', isActive ? 'text-primary' : 'text-gray-700')}>{roleCard.label}</p>
                          <p className="mt-1 text-[11px] text-gray-400">{roleCard.subLabel}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={agreePolicy}
                    onChange={(e) => setAgreePolicy(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>
                    I agree to the <a href="https://hire-hub-fe6c4.web.app/terms-of-service" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Terms of Service</a> and <a href="https://hire-hub-fe6c4.web.app/privacy-policy" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Privacy Policy</a>
                  </span>
                </label>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? t.common.loading : t.common.next}
                </button>
              </form>
            )}

            {step === 'professional' && (
              <form onSubmit={handleProfessionalContinue} className="relative space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t.auth.professions}</label>
                  {professionsLoading ? (
                    <p className="text-sm text-gray-500">Loading professions...</p>
                  ) : professionOptions.length === 0 ? (
                    <p className="text-sm text-red-500">No professions found.</p>
                  ) : (
                    <div ref={professionMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setProfessionMenuOpen((prev) => !prev)}
                        className="input-field flex w-full items-center justify-between text-left"
                      >
                        <span className="truncate text-sm font-semibold text-gray-700">
                          {professions.length > 0 ? `${professions.length} profession(s) selected` : 'Choose profession(s)'}
                        </span>
                        {professionMenuOpen ? (
                          <HiChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <HiChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {professionMenuOpen && (
                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                          <div className="border-b border-gray-100 p-3">
                            <input
                              type="text"
                              value={professionSearch}
                              onChange={(e) => setProfessionSearch(e.target.value)}
                              placeholder="Search profession"
                              className="input-field"
                            />
                          </div>

                          <div className="max-h-56 overflow-y-auto p-2">
                            {filteredProfessionOptions.length === 0 ? (
                              <p className="px-2 py-3 text-sm text-gray-500">No results</p>
                            ) : (
                              filteredProfessionOptions.map((item) => {
                                const active = professions.includes(item.value);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => toggleProfession(item.value)}
                                    className={clsx(
                                      'mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                                      active ? 'bg-primary-50 text-primary' : 'hover:bg-gray-50 text-gray-700'
                                    )}
                                  >
                                    <span className="font-medium">{item.label}</span>
                                    {active ? <HiCheck className="h-4 w-4" /> : null}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {professions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {professions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleProfession(item)}
                              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary"
                            >
                              <span>{professionLabelMap[item] || item}</span>
                              <HiX className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Work radius (km)</label>
                  <input type="number" min={0} value={workRadius} onChange={(e) => setWorkRadius(e.target.value)} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Optional phone number</label>
                  <input type="tel" value={optionalPhone} onChange={(e) => setOptionalPhone(e.target.value)} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="input-field resize-none" />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? t.common.loading : t.common.next}
                </button>

                <button type="button" onClick={() => setStep('details')} className="btn-ghost w-full">
                  {t.common.back}
                </button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={verificationSent ? handleVerifyAndCreate : handleSendCode} className="relative space-y-4">
                {!verificationSent ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t.auth.phoneNumber}</label>
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
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? t.common.loading : t.auth.sendOtp}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-[24px] border border-primary-100 bg-primary-50 px-4 py-4 text-sm text-primary-dark shadow-sm">
                      <p className="font-semibold">{t.auth.codeSent}</p>
                      <p className="mt-1 break-all">{sentToPhone}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t.auth.verificationCode}</label>
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

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? t.common.loading : t.auth.signUp}
                    </button>

                    <button type="button" onClick={handleChangePhone} className="btn-ghost w-full">
                      {t.auth.changePhone}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep(role === 'worker' ? 'professional' : 'details');
                    handleChangePhone();
                  }}
                  className="btn-ghost w-full"
                >
                  {t.common.back}
                </button>

                <div id="recaptcha-container" className="min-h-0" />
              </form>
            )}

            {step === 'payment' && role === 'worker' && (
              <form onSubmit={handleCompleteSubscription} className="relative space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <HiCreditCard className="h-5 w-5" />
                    Pro Subscription Required
                  </div>
                  <p className="mt-1 text-sm">To activate your Pro profile, pay a subscription of <span className="font-bold">₪100</span>.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Card holder name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Card number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, '').slice(0, 19))}
                    placeholder="4242 4242 4242 4242"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))}
                      placeholder="08/28"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="input-field"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={agreeSubscription}
                    onChange={(e) => setAgreeSubscription(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>I approve the ₪100 subscription charge to activate my Pro account.</span>
                </label>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? t.common.loading : 'Pay ₪100 and Activate Pro'}
                </button>

                <button type="button" onClick={() => setStep('professional')} className="btn-ghost w-full">
                  {t.common.back}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 lg:text-left">
            {t.auth.alreadyHaveAccount}{' '}
            <Link href="/auth/signin" className="font-bold text-primary underline-offset-4 hover:underline">
              {t.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
