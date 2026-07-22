import Link from 'next/link';
import Image from 'next/image';
import { FiFacebook, FiX } from 'react-icons/fi';
import { FaGooglePlay, FaApple } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SiteFooter() {
  const { t } = useLanguage();
  const legalLinks = [
    { href: '/contact', label: t.nav.contact },
    { href: '/terms-of-service', label: t.settings.termsOfService },
    { href: '/privacy-policy', label: t.settings.privacyPolicy },
  ];

  return (
    <footer className="relative mt-10 overflow-hidden bg-slate-900 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0e2236] via-[#10283f] to-[#175181]" />
      <div className="absolute -top-16 right-8 h-44 w-44 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-sky-300/15 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
        <div className="glass-dark rounded-[30px] border-white/15 bg-white/[0.06] p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-hero-gradient shadow-glow-sm">
                <Image
                  src="/web-app-manifest-192x192.png"
                  alt="Hiro"
                  fill
                  sizes="44px"
                  className="object-cover"
                />
                <span className="pointer-events-none absolute inset-0 bg-shine bg-[length:200%_100%] animate-shimmer opacity-35" />
              </div>
              <div>
                  <p className="font-display text-2xl font-extrabold tracking-tight text-white">Hiro</p>
              </div>
            </Link>

            <div className="flex items-center gap-2.5">
              {/* Facebook */}
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-blue-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15 hover:text-white"
              >
                <FiFacebook className="h-4.5 w-4.5" />
              </a>

              
            <div className="flex items-center gap-2.5">
              {/* X*/}
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-blue-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15 hover:text-white"
              >
                <FiX className="h-4.5 w-4.5" />
              </a>

              {/* Google Play */}
              <a
                href="https://play.google.com/store/apps/details?id=com.hirehub.app"
                target="_blank"
                rel="noreferrer"
                aria-label="Get it on Google Play"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-blue-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15 hover:text-white"
              >
                <FaGooglePlay className="h-4 w-4" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] font-medium">GET IT ON</span>
                  <span className="text-[12px] font-bold">Google Play</span>
                </div>
              </a>

              {/* App Store */}
              <a
                href="https://apps.apple.com/us/app/hiro-%D7%94%D7%99%D7%A8%D7%95/id6763238120"
                target="_blank"
                rel="noreferrer"
                aria-label="Download on the App Store"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-blue-50/90 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15 hover:text-white"
              >
                <FaApple className="h-4 w-4" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[9px] font-medium">DOWNLOAD ON THE</span>
                  <span className="text-[12px] font-bold">App Store</span>
                </div>
              </a>
            </div>
          </div>

          <div className="my-5 h-px w-full bg-white/20" />

          <div className="flex flex-col gap-4 text-sm text-blue-50/80 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">Hiro Ltd. Copyright 2012-2026</p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map(function (item) {
                const isInternal = item.href.startsWith('/');

                if (isInternal) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="text-sm font-semibold text-blue-50/80 transition hover:text-white"
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-blue-50/80 transition hover:text-white"
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>
    </footer>
  );
}
