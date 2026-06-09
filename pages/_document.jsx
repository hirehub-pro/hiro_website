import Document, { Html, Head, Main, NextScript } from 'next/document';
import { normalizeSeoLocale } from '../lib/seo-locale';

function MyDocument(props) {
  const locale = props.locale || 'he';
  const dir = props.dir || (locale === 'en' ? 'ltr' : 'rtl');

  return (
    <Html lang={locale} dir={dir}>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="description" content="Hiro – Find trusted professionals near you" />
        <meta name="application-name" content="Hiro" />
        <meta name="apple-mobile-web-app-title" content="Hiro" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon-96x96.png" sizes="96x96" type="image/png" />
        <link rel="shortcut icon" href="/favicon-96x96.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="preload"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
          media="print"
          onLoad="this.media='all'"
        />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

MyDocument.getInitialProps = async (ctx) => {
  const initialProps = await Document.getInitialProps(ctx);
  const locale = normalizeSeoLocale(ctx.query?.lang);
  const dir = locale === 'en' ? 'ltr' : 'rtl';

  return {
    ...initialProps,
    locale,
    dir,
  };
};

export default MyDocument;
