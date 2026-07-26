import Head from 'next/head';
import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle, FiMessageCircle, FiSearch, FiShield } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

export default function AboutPage() {
  const { t, dir } = useLanguage();
  const copy = t.aboutPage;
  const isRtl = dir === 'rtl';
  const highlights = [
    { icon: FiSearch, title: copy.discoverTitle, body: copy.discoverBody },
    { icon: FiShield, title: copy.trustedTitle, body: copy.trustedBody },
    { icon: FiMessageCircle, title: copy.connectedTitle, body: copy.connectedBody },
  ];

  return (
    <>
      <Head><title>{`${copy.title} | Hiro`}</title></Head>
      <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:py-10">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-card transition-colors hover:bg-slate-50">
            <FiArrowLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            {copy.backToSettings}
          </Link>
          <section className="mt-5 overflow-hidden rounded-[36px] bg-hero-gradient px-6 py-10 text-white shadow-hero sm:px-10 sm:py-14">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/90"><FiCheckCircle className="h-4 w-4" />{copy.badge}</div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">{copy.intro}</p>
            </div>
          </section>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {highlights.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-[30px] bg-white p-6 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary"><Icon className="h-6 w-6" /></div>
                <h2 className="mt-5 text-xl font-extrabold text-gray-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">{body}</p>
              </article>
            ))}
          </section>
          <section className="mt-6 rounded-[32px] bg-white p-6 text-center shadow-card sm:p-8">
            <h2 className="text-2xl font-extrabold text-gray-950">{copy.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">{copy.ctaBody}</p>
            <Link href="/search" className="btn-primary mt-6 inline-flex items-center gap-2"><FiSearch className="h-4 w-4" />{copy.cta}</Link>
          </section>
        </div>
      </main>
    </>
  );
}
