import { NextResponse } from 'next/server';

const MOBILE_SITE_URL = process.env.MOBILE_SITE_URL || 'https://hiro-service.web.app';
const DESKTOP_HOSTS = new Set(['hiro-services.com', 'www.hiro-services.com']);

function isMobileDevice(userAgent) {
  return /Android|iPhone|iPod|Opera Mini|IEMobile|Mobile/i.test(userAgent || '');
}

export function middleware(request) {
  const { nextUrl } = request;
  const userAgent = request.headers.get('user-agent') || '';
  const mobileUrl = new URL(MOBILE_SITE_URL);
  const currentHost = nextUrl.hostname.toLowerCase();

  // Only redirect from the public desktop domains.
  if (!DESKTOP_HOSTS.has(currentHost)) {
    return NextResponse.next();
  }

  // Avoid redirect loops if this app is also served on the mobile hostname.
  if (currentHost === mobileUrl.hostname.toLowerCase()) {
    return NextResponse.next();
  }

  if (isMobileDevice(userAgent)) {
    const redirectUrl = new URL(`${nextUrl.pathname}${nextUrl.search}`, MOBILE_SITE_URL);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
