import Head from 'next/head';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiArrowRight, HiChatAlt2, HiMail, HiShieldCheck, HiSparkles } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const supportEmail = 'support@hiro-services.com';
const whatsappHref = 'https://wa.me/972542978614';

export default function ContactPage() {
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.contact;
  const supportChatHref = user ? '/messages?support=admin' : '/auth/signin?next=%2Fmessages%3Fsupport%3Dadmin';
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: '',
    message: '',
  });

  const contactCards = useMemo(
    () => [
      {
        title: copy.cardEmailTitle,
        body: copy.cardEmailBody,
        href: `mailto:${supportEmail}`,
        label: supportEmail,
        icon: HiMail,
      },
      {
        title: copy.cardMessagesTitle,
        body: copy.cardMessagesBody,
        href: supportChatHref,
        label: t.messages.title,
        icon: HiChatAlt2,
      },
      {
        title: copy.cardWhatsAppTitle,
        body: copy.cardWhatsAppBody,
        href: whatsappHref,
        label: '054-297-8614',
        icon: FaWhatsapp,
      },
      {
        title: copy.cardCommunityTitle,
        body: copy.cardCommunityBody,
        href: '/community',
        label: t.nav.blog,
        icon: HiSparkles,
      },
    ],
    [copy, supportChatHref, t.messages.title, t.nav.blog]
  );

  function onChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function onSubmit(event) {
    event.preventDefault();

    if (!form.name || !form.email || !form.topic || !form.message) {
      toast.error(copy.missingFields);
      return;
    }

    const subject = `${copy.mailSubjectPrefix}: ${form.topic}`;
    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      '',
      form.message,
    ].join('\n');

    const href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    toast.success(copy.mailSuccess);
  }

  return (
    <>
      <Head>
        <title>{`${copy.title} | Hiro`}</title>
      </Head>

      <div className="relative overflow-hidden px-4 pb-16 pt-4 md:pb-20">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="absolute left-0 top-12 h-56 w-56 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl animate-float-slow" />

        <div className="relative mx-auto max-w-7xl space-y-8">
          <section className="overflow-hidden rounded-[36px] bg-hero-gradient px-6 py-8 text-white shadow-hero sm:px-8 sm:py-10 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/90">
                  <HiShieldCheck className="h-4 w-4" />
                  {copy.badge}
                </div>
                <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                  {copy.title}
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                  {copy.description}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a href={`mailto:${supportEmail}`} className="btn-primary inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-white">
                    <HiMail className="h-4.5 w-4.5" />
                    {copy.primaryCta}
                  </a>
                  <Link href="/search" className="btn-ghost inline-flex items-center justify-center border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                    {copy.secondaryCta}
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {contactCards.map(({ title, body, href, label, icon: Icon }) => {
                  const isInternal = href.startsWith('/');
                  const cardClassName = 'glass-blue rounded-[28px] p-5 text-white/95 transition-transform duration-200 hover:-translate-y-1';

                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
                          <Icon className="h-5 w-5" />
                        </div>
                        <HiArrowRight className={clsx('h-5 w-5 text-white/70', dir === 'rtl' && 'rotate-180')} />
                      </div>
                      <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
                      <p className="mt-2 text-sm leading-6 text-white/75">{body}</p>
                      <p className="mt-4 text-sm font-semibold text-white">{label}</p>
                    </>
                  );

                  return isInternal ? (
                    <Link key={title} href={href} className={cardClassName}>
                      {content}
                    </Link>
                  ) : (
                    <a
                      key={title}
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noreferrer' : undefined}
                      className={cardClassName}
                    >
                      {content}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="glass rounded-[32px] p-6 shadow-soft sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/65">{copy.formTitle}</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-gray-950">
                {copy.formIntro}
              </h2>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.name}</span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      className="input-field"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.email}</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      className="input-field"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.topic}</span>
                  <input
                    type="text"
                    name="topic"
                    value={form.topic}
                    onChange={onChange}
                    className="input-field"
                    placeholder={copy.topicPlaceholder}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">{copy.message}</span>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={onChange}
                    rows={7}
                    className="input-field resize-none"
                    placeholder={copy.messagePlaceholder}
                  />
                </label>

                <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2">
                  <HiMail className="h-4.5 w-4.5" />
                  {copy.submit}
                </button>
              </form>
            </div>

            <aside className="grid gap-4">
              <div className="rounded-[32px] bg-white p-6 shadow-card sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/65">{copy.responseTitle}</p>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-gray-950">
                  {copy.responseBody}
                </h2>
                <div className="mt-6 space-y-4">
                  {[copy.responseFast, copy.responseAccount, copy.responseSafety].map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className={clsx('mt-1 h-2.5 w-2.5 rounded-full', index === 0 ? 'dot-active' : 'bg-primary/35')} />
                      <p className="text-sm leading-6 text-gray-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] bg-slate-950 p-6 text-white shadow-card sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-200/75">{copy.directEmail}</p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="mt-3 inline-block font-display text-3xl font-extrabold tracking-tight text-white transition-opacity hover:opacity-85"
                >
                  {supportEmail}
                </a>
                <p className="mt-3 max-w-md text-sm leading-7 text-white/70">
                  {copy.cardEmailBody}
                </p>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </>
  );
}
