import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiBriefcase, FiChevronLeft, FiChevronRight, FiKey, FiMail, FiPhone, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.settings;
  const accountCopy = copy.accountSettings || {};
  const isRtl = dir === 'rtl';

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings/account')}`);
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

  const actionRows = [
    {
      key: 'phone',
      label: accountCopy.changePhone || 'Change phone number',
      subtitle: profile?.phone || copy.notProvided,
      icon: FiPhone,
      href: '/settings/account/phone',
    },
    {
      key: 'email',
      label: accountCopy.changeEmail || 'Change email',
      subtitle: user.email || profile?.email || copy.notProvided,
      icon: FiMail,
      href: '/settings/account/email',
    },
    {
      key: 'password',
      label: accountCopy.changePassword || 'Change password',
      subtitle: accountCopy.passwordSubtitle || 'Update your sign-in password.',
      icon: FiKey,
      href: '/settings/account/password',
    },
    {
      key: 'business',
      label: accountCopy.editBusinessInfo || 'Edit business info',
      subtitle: accountCopy.businessSubtitle || 'Update your verification and tax details.',
      icon: FiBriefcase,
      href: '/worker/verification?next=/settings/account',
    },
    {
      key: 'delete',
      label: accountCopy.deleteAccount || 'Delete account',
      subtitle: accountCopy.deleteSubtitle || 'Permanently remove your account.',
      icon: FiTrash2,
      href: '/settings/account/account_delete',
      danger: true,
    },
  ];

  function renderActionRow(item) {
    const Icon = item.icon;
    const ChevronIcon = isRtl ? FiChevronLeft : FiChevronRight;
    const content = (
      <>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.danger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`block text-base font-bold sm:text-lg ${item.danger ? 'text-red-700' : 'text-gray-900'}`}>{item.label}</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-gray-500">{item.subtitle}</span>
        </div>
      </>
    );
    const className = "flex w-full items-center justify-between gap-4 rounded-[28px] bg-white px-5 py-5 text-start shadow-card transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";

    if (item.href) {
      return (
        <Link key={item.key} href={item.href} className={className}>
          <div className="flex min-w-0 flex-1 items-center gap-4">{content}</div>
          <ChevronIcon className="h-6 w-6 shrink-0 text-gray-400" />
        </Link>
      );
    }

    return (
      <button
        key={item.key}
        type="button"
        onClick={item.onClick}
        className={className}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">{content}</div>
        <ChevronIcon className="h-6 w-6 shrink-0 text-gray-400" />
      </button>
    );
  }

  return (
    <>
      <Head>
        <title>{`${accountCopy.title || 'Account Settings'} | Hiro`}</title>
      </Head>

      <main className="min-h-screen bg-[#f3f2f8] px-4 pb-24 pt-5 sm:px-6 md:px-8" dir={dir}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{accountCopy.title || 'Account Settings'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{accountCopy.subtitle || 'Manage sign-in and business account details.'}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-800 shadow-soft transition-transform duration-200 hover:-translate-y-0.5"
              aria-label={copy.back}
            >
              {isRtl ? <FiChevronRight className="h-7 w-7" /> : <FiChevronLeft className="h-7 w-7" />}
            </button>
          </div>

          <section className="space-y-3.5">
            {actionRows.map(renderActionRow)}
          </section>
        </div>
      </main>
    </>
  );
}
