import Head from 'next/head';
import { useEffect } from 'react';
import { AuthProvider }     from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import Layout from '../components/layout/Layout';
import SiteFooter from '../components/layout/SiteFooter';
import { Toaster } from 'react-hot-toast';
import { startForegroundPushNotifications } from '../lib/notifications';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  // Allow pages to opt out of the shared Layout (e.g. auth pages)
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>);

  useEffect(() => {
    let unsubscribe = null;

    startForegroundPushNotifications()
      .then((nextUnsubscribe) => {
        unsubscribe = nextUnsubscribe;
      })
      .catch(() => {});

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

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
        <SiteFooter />
      </AuthProvider>
    </LanguageProvider>
  );
}
