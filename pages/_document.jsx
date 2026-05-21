import { Html, Head, Main, NextScript } from 'next/document';

const mobileRedirectScript = `
  (function () {
    var desktopHosts = {
      'hiro-services.com': true,
      'www.hiro-services.com': true
    };
    var currentHost = window.location.hostname.toLowerCase();

    if (!desktopHosts[currentHost]) {
      return;
    }

    var userAgent = navigator.userAgent || '';
    var isMobile = /Android|iPhone|iPod|Opera Mini|IEMobile|Mobile/i.test(userAgent) || window.innerWidth <= 1024;

    if (!isMobile) {
      return;
    }

    var redirectUrl = new URL(window.location.pathname + window.location.search + window.location.hash, 'https://m.hiro-services.com');
    window.location.replace(redirectUrl.toString());
  })();
`;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="description" content="Hiro – Find trusted professionals near you" />
        <link rel="icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{ __html: mobileRedirectScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
