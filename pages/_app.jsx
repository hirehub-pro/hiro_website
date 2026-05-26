import Head from 'next/head';
import { useEffect, useState } from 'react';
import { AuthProvider }     from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import Layout from '../components/layout/Layout';
import SiteFooter from '../components/layout/SiteFooter';
import { Toaster } from 'react-hot-toast';
import { HiArrowSmRight, HiX } from 'react-icons/hi';
import { startForegroundPushNotifications } from '../lib/notifications';
import { initFirebaseAppCheck } from '../lib/firebase';
import 'leaflet/dist/leaflet.css';
import '../styles/globals.css';

const APP_PACKAGE_NAME = 'com.hirehub.app';
const APP_PROMPT_STORAGE_KEY = 'hiro-hide-open-app-prompt-until';

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent || '');
}

function isPerformanceAuditAgent() {
  if (typeof navigator === 'undefined') return false;
  return /(lighthouse|pagespeed|chrome-lighthouse)/i.test(navigator.userAgent || '');
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function buildAndroidIntentUrl() {
  if (typeof window === 'undefined') return '';

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const fallbackUrl = encodeURIComponent(`https://hiro-services.com${currentUrl}`);
  return `intent:${currentUrl}#Intent;scheme=https;package=${APP_PACKAGE_NAME};S.browser_fallback_url=${fallbackUrl};end`;
}

export default function App({ Component, pageProps }) {
  // Allow pages to opt out of the shared Layout (e.g. auth pages)
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>);
  const showFooter = Component.showFooter !== false;
  const [showOpenAppPrompt, setShowOpenAppPrompt] = useState(false);

  useEffect(() => {
    initFirebaseAppCheck().catch(() => {});
  }, []);

  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    function bootPushNotifications() {
      startForegroundPushNotifications()
        .then((nextUnsubscribe) => {
          if (!cancelled) {
            unsubscribe = nextUnsubscribe;
          }
        })
        .catch(() => {});
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => {
        bootPushNotifications();
      }, { timeout: 3000 });

      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }

    const timer = setTimeout(() => {
      bootPushNotifications();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isPerformanceAuditAgent()) return;
    if (!isMobileBrowser() || isStandaloneMode()) return;

    const hiddenUntil = Number(window.localStorage.getItem(APP_PROMPT_STORAGE_KEY) || 0);
    if (hiddenUntil > Date.now()) return;

    const timer = window.setTimeout(() => {
      setShowOpenAppPrompt(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  function dismissOpenAppPrompt(days = 7) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        APP_PROMPT_STORAGE_KEY,
        String(Date.now() + days * 24 * 60 * 60 * 1000)
      );
    }
    setShowOpenAppPrompt(false);
  }

  function handleOpenApp() {
    if (typeof window === 'undefined') return;

    if (/Android/i.test(window.navigator.userAgent || '')) {
      window.location.href = buildAndroidIntentUrl();
    }

    dismissOpenAppPrompt(30);
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        </Head>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '14px', fontFamily: 'Inter, sans-serif' },
          }}
        />
        {getLayout(<Component {...pageProps} />)}
        {showOpenAppPrompt && (
          <div className="fixed inset-x-4 bottom-[5.5rem] z-[80] md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <HiArrowSmRight className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-slate-900">Continue in the app?</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    If Hiro is installed on your phone, you can open this page in the app.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissOpenAppPrompt(7)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Dismiss"
                >
                  <HiX className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => dismissOpenAppPrompt(7)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handleOpenApp}
                  className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-glow"
                >
                  Open app
                </button>
              </div>
            </div>
          </div>
        )}
        {showFooter ? <SiteFooter /> : null}
      </AuthProvider>
    </LanguageProvider>
  );
}
