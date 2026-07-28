import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { FiAlertCircle, FiCheckCircle, FiLoader, FiMail } from 'react-icons/fi';
import { auth, db, functions as firebaseFunctions } from '../../lib/firebase';

const SUPPORTED_EMAIL_ACTIONS = new Set(['verifyEmail', 'verifyAndChangeEmail']);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getActionErrorMessage(error) {
  switch (error?.code) {
    case 'auth/expired-action-code':
      return 'This email link expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This email link is invalid or was already used.';
    case 'auth/user-disabled':
      return 'This account is disabled.';
    case 'functions/failed-precondition':
      return 'The email was verified, but the account sync is not ready yet.';
    default:
      return 'We could not verify this email link. Please try again.';
  }
}

async function syncCurrentSignedInEmail() {
  if (!auth.currentUser) {
    return false;
  }

  await auth.currentUser.reload();
  const email = normalizeEmail(auth.currentUser.email);
  if (!email) {
    return false;
  }

  await setDoc(doc(db, 'users', auth.currentUser.uid), {
    email,
    emailVerified: auth.currentUser.emailVerified === true,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  try {
    const syncCurrentUserEmail = httpsCallable(firebaseFunctions, 'syncCurrentUserEmail');
    await syncCurrentUserEmail();
  } catch (error) {
    // The direct Firestore write above is enough for the signed-in owner.
  }

  return true;
}

export default function AuthActionPage() {
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    async function handleActionCode() {
      const mode = String(router.query.mode || '');
      const oobCode = String(router.query.oobCode || '');

      if (!SUPPORTED_EMAIL_ACTIONS.has(mode) || !oobCode) {
        try {
          setStatus('loading');
          setMessage('Updating your account email...');
          const synced = await syncCurrentSignedInEmail();

          if (!cancelled) {
            if (synced) {
              setStatus('success');
              setMessage('Your account email was updated.');
            } else {
              setStatus('error');
              setMessage('Your email was changed. Please sign in again so we can update your account profile.');
            }
          }
        } catch (error) {
          if (!cancelled) {
            setStatus('error');
            setMessage('Your email was changed, but we could not update your account profile. Please sign in again.');
          }
        }
        return;
      }

      try {
        setStatus('loading');
        setMessage('Verifying your email...');

        const actionInfo = await checkActionCode(auth, oobCode);
        const actionEmail = normalizeEmail(actionInfo?.data?.newEmail || actionInfo?.data?.email);

        await applyActionCode(auth, oobCode);

        // The action code is authoritative here. Do not let a refresh of a stale
        // browser session prevent the server-side Firestore synchronization.
        const verifiedEmail = actionEmail || normalizeEmail(auth.currentUser?.email);
        if (!verifiedEmail) {
          throw new Error('The verified email address was not available.');
        }

        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
          } catch (error) {
            // The callable below reads the authoritative user from Firebase Auth.
          }
        }

        const currentUserEmail = normalizeEmail(auth.currentUser?.email);

        // Only write from the browser when its refreshed Auth user agrees with the
        // verified action code. The callable below syncs by the verified address,
        // so it also covers links opened in another browser or device.
        if (auth.currentUser && verifiedEmail && currentUserEmail === verifiedEmail) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            email: verifiedEmail,
            emailVerified: true,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        if (verifiedEmail) {
          const syncVerifiedEmailByAddress = httpsCallable(firebaseFunctions, 'syncVerifiedEmailByAddress');
          await syncVerifiedEmailByAddress({ email: verifiedEmail });
        }

        if (!cancelled) {
          setStatus('success');
          setMessage('Your email was verified and your account was updated.');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(getActionErrorMessage(error));
        }
      }
    }

    handleActionCode();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.mode, router.query.oobCode]);

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const Icon = isLoading ? FiLoader : isSuccess ? FiCheckCircle : FiAlertCircle;

  return (
    <>
      <Head>
        <title>Email Verification | Hiro</title>
      </Head>

      <main className="flex min-h-screen items-center justify-center bg-[#f3f2f8] px-4 py-12">
        <section className="w-full max-w-md rounded-[30px] border border-white bg-white p-7 text-center shadow-card sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary">
            <Icon className={`h-8 w-8 ${isLoading ? 'animate-spin' : ''}`} />
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-[0.22em] text-primary">
            <FiMail className="h-4 w-4" />
            Hiro Account
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-950">
            {isSuccess ? 'Email Updated' : isLoading ? 'Checking Link' : 'Link Problem'}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-gray-500">{message}</p>

          <Link
            href={isSuccess ? '/settings/account' : '/settings/account/email'}
            className="btn-primary mt-6 flex w-full items-center justify-center"
          >
            {isSuccess ? 'Back to account settings' : 'Try again'}
          </Link>
        </section>
      </main>
    </>
  );
}

AuthActionPage.getLayout = (page) => page;
AuthActionPage.showFooter = false;
