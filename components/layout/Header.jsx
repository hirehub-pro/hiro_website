import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { HiBell } from 'react-icons/hi';
import { FiUser, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Image from 'next/image';
import clsx from 'clsx';

const localeLabels = { en: 'EN', he: 'עב', ar: 'ع' };

export default function Header() {
  const { user, profile, logOut, isAdmin, isWorker } = useAuth();
  const { t, locale, changeLocale } = useLanguage();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/',          label: t.nav.home },
    { href: '/search',    label: t.nav.search },
    ...(isWorker ? [{ href: '/worker/dashboard', label: t.nav.dashboard }] : []),
    { href: '/community', label: t.nav.blog },
    { href: '/messages',  label: t.nav.messages },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <>
      <header className="hidden md:block sticky top-0 z-50 px-4 pt-4">
        <div className="glass max-w-7xl mx-auto h-18 rounded-[28px] border border-white/60 shadow-soft">
          <div className="h-full px-6 flex items-center justify-between gap-5">
            <Link href="/" className="flex items-center gap-3 shrink-0 animate-slide-right">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-hero-gradient shadow-glow-sm">
                <span className="absolute inset-0 bg-shine bg-[length:200%_100%] animate-shimmer opacity-40" />
                <span className="relative text-base font-extrabold text-white">H</span>
              </div>
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight text-gray-950">HireHub</p>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-primary/70">Trusted local pros</p>
              </div>
            </Link>

            <nav className="flex items-center gap-1 rounded-2xl bg-white/55 p-1">
              {navLinks.map((l, index) => {
                const active = router.pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={clsx(
                      'animate-fade-up rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200',
                      active
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-600 hover:bg-white/80 hover:text-gray-950'
                    )}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 animate-slide-left">
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
                {Object.keys(localeLabels).map((l) => (
                  <button
                    key={l}
                    onClick={() => changeLocale(l)}
                    className={clsx(
                      'rounded-xl px-2.5 py-1 text-xs font-bold transition-all duration-200',
                      locale === l ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    {localeLabels[l]}
                  </button>
                ))}
              </div>

              {user ? (
                <>
                  <Link
                    href="/messages"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-gray-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-primary hover:shadow-soft"
                  >
                    <HiBell className="h-5 w-5" />
                  </Link>

                  <Link href={`/profile/${user.uid}`} className="block rounded-full transition-transform duration-200 hover:scale-105">
                    {profile?.profileImageUrl ? (
                      <Image
                        src={profile.profileImageUrl}
                        alt={profile.name}
                        width={42}
                        height={42}
                        className="rounded-full object-cover ring-2 ring-primary/20"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 ring-2 ring-primary/20">
                        <FiUser className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </Link>

                  <button
                    onClick={logOut}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:text-red-500"
                    title="Sign out"
                  >
                    <FiLogOut className="h-4.5 w-4.5" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="rounded-2xl px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-primary"
                  >
                    {t.auth.signIn}
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="rounded-2xl bg-hero-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
                  >
                    {t.auth.signUp}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <header className="md:hidden sticky top-0 z-50 px-4 pt-3">
        <div className="glass rounded-[24px] border border-white/60 shadow-soft">
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero-gradient shadow-glow-sm">
                <span className="text-sm font-extrabold text-white">H</span>
              </div>
              <div>
                <p className="font-display text-lg font-extrabold text-gray-950">HireHub</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60">Local services</p>
              </div>
            </Link>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-gray-700"
              aria-label="Toggle menu"
            >
              {menuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-white/50 px-4 pb-4 pt-2 animate-fade-up">
              <nav className="space-y-2">
                {navLinks.map((l, index) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={clsx(
                      'block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                      router.pathname === l.href ? 'bg-primary-50 text-primary' : 'text-gray-700 hover:bg-white/70'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1 rounded-2xl bg-slate-100/80 p-1">
                  {Object.keys(localeLabels).map((l) => (
                    <button
                      key={l}
                      onClick={() => changeLocale(l)}
                      className={clsx(
                        'rounded-xl px-2.5 py-1 text-xs font-bold transition-all duration-200',
                        locale === l ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
                      )}
                    >
                      {localeLabels[l]}
                    </button>
                  ))}
                </div>
                {!user && (
                  <Link href="/auth/signup" className="rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-white">
                    {t.auth.signUp}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
