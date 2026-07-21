import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FiBriefcase, FiChevronLeft, FiChevronRight, FiKey, FiMail, FiPhone, FiTrash2 } from 'react-icons/fi';
import { auth, db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

function getAuthProviderIds(user) {
  return Array.isArray(user?.providerData)
    ? user.providerData.map((provider) => provider.providerId)
    : [];
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { t, dir } = useLanguage();
  const copy = t.settings;
  const accountCopy = copy.accountSettings || {};
  const isRtl = dir === 'rtl';
  const [busyAction, setBusyAction] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent('/settings/account')}`);
    }
  }, [loading, router, user]);

  const hasPasswordProvider = useMemo(
    () => getAuthProviderIds(user).includes('password'),
    [user]
  );

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  async function reauthenticateWithPassword() {
    if (!hasPasswordProvider || !user.email) return;

    const currentPassword = window.prompt(accountCopy.currentPasswordPrompt || 'Enter your current password.');
    if (!currentPassword) {
      throw new Error(accountCopy.currentPasswordRequired || 'Current password is required.');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
  }

  async function handleChangeEmail() {
    const nextEmail = window.prompt(accountCopy.emailPrompt || 'Enter your new email address.', user.email || profile?.email || '');
    if (nextEmail === null) return;
    const normalizedEmail = nextEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error(accountCopy.invalidEmail || 'Enter a valid email address.');
      return;
    }

    try {
      setBusyAction('email');
      await reauthenticateWithPassword();
      await updateEmail(auth.currentUser, normalizedEmail);
      await setDoc(doc(db, 'users', user.uid), {
        email: normalizedEmail,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success(accountCopy.emailUpdated || 'Email updated.');
    } catch (error) {
      toast.error(error?.message || accountCopy.updateError || 'Could not update account.');
    } finally {
      setBusyAction('');
    }
  }

  async function handleChangePassword() {
    const nextPassword = window.prompt(accountCopy.passwordPrompt || 'Enter a new password.');
    if (nextPassword === null) return;
    if (nextPassword.length < 6) {
      toast.error(accountCopy.weakPassword || 'Password should be at least 6 characters.');
      return;
    }

    const confirmPassword = window.prompt(accountCopy.confirmPasswordPrompt || 'Confirm your new password.');
    if (confirmPassword !== nextPassword) {
      toast.error(accountCopy.passwordMismatch || 'Passwords do not match.');
      return;
    }

    try {
      setBusyAction('password');
      await reauthenticateWithPassword();
      await updatePassword(auth.currentUser, nextPassword);
      toast.success(accountCopy.passwordUpdated || 'Password updated.');
    } catch (error) {
      toast.error(error?.message || accountCopy.updateError || 'Could not update account.');
    } finally {
      setBusyAction('');
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(accountCopy.deleteConfirm || 'Delete your account permanently? This cannot be undone.');
    if (!confirmed) return;

    try {
      setBusyAction('delete');
      await reauthenticateWithPassword();
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(auth.currentUser);
      toast.success(accountCopy.accountDeleted || 'Account deleted.');
      router.push('/');
    } catch (error) {
      toast.error(error?.message || accountCopy.deleteError || 'Could not delete account.');
    } finally {
      setBusyAction('');
    }
  }

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
      onClick: handleChangeEmail,
    },
    {
      key: 'password',
      label: accountCopy.changePassword || 'Change password',
      subtitle: accountCopy.passwordSubtitle || 'Update your sign-in password.',
      icon: FiKey,
      onClick: handleChangePassword,
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
      onClick: handleDeleteAccount,
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
        disabled={Boolean(busyAction)}
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
