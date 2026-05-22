import Link from 'next/link';
import { useRouter } from 'next/router';
import { HiHome, HiSearch, HiBookOpen, HiChat, HiUser } from 'react-icons/hi';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

export default function BottomNav() {
  const { t }     = useLanguage();
  const { user }  = useAuth();
  const router    = useRouter();
  const profileHref = user ? `/profile/${user.uid}` : '/auth/signin?next=%2Fmessages';

  const tabs = [
    { href: profileHref,  label: t.nav.profile, icon: HiUser, match: '/profile/' },
    { href: '/messages',  label: t.nav.messages, icon: HiChat },
    { href: '/community', label: t.nav.blog, icon: HiBookOpen },
    { href: '/search',    label: t.nav.search, icon: HiSearch },
    { href: '/',          label: t.nav.home, icon: HiHome, exact: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
      <div className="glass mx-auto flex h-16 max-w-md items-center justify-around rounded-[26px] border border-white/60 px-2 shadow-soft">
        {tabs.map((tab) => {
          const Icon    = tab.icon;
          const active  = tab.exact
            ? router.pathname === tab.href
            : tab.match
              ? router.asPath === tab.href || router.asPath.startsWith(tab.match)
              : router.pathname === tab.href;

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={clsx(
                'flex min-w-[56px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200',
                active ? 'bg-white/85 shadow-sm' : 'hover:bg-white/60'
              )}
            >
              <Icon
                className={clsx(
                  'h-5.5 w-5.5 transition-all duration-200',
                  active ? 'text-primary' : 'text-gray-400'
                )}
              />
              <span
                className={clsx(
                  'text-[10px] font-semibold transition-colors',
                  active ? 'text-primary' : 'text-gray-400'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
