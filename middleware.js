import { NextResponse } from 'next/server';

const CANONICAL_HOST = 'hiro-services.com';

export function middleware(request) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost || request.headers.get('host') || '').split(':')[0];

  if (host === `www.${CANONICAL_HOST}`) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    url.port = '';

    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}
