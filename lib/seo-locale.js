export const SEO_LOCALES = ['he', 'en', 'ar'];
export const SEO_DEFAULT_LOCALE = 'he';
export const SITE_URL = 'https://hiro-services.com';

export function normalizeSeoLocale(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return SEO_LOCALES.includes(normalizedValue) ? normalizedValue : SEO_DEFAULT_LOCALE;
}

export function localizePath(path, locale = SEO_DEFAULT_LOCALE) {
  const normalizedLocale = normalizeSeoLocale(locale);
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;

  if (normalizedLocale === SEO_DEFAULT_LOCALE) {
    return normalizedPath;
  }

  return `/${normalizedLocale}${normalizedPath}`;
}

export function absoluteUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function buildAlternateLanguageUrls(path) {
  return SEO_LOCALES.map((locale) => ({
    locale,
    href: absoluteUrl(localizePath(path, locale)),
  }));
}

export function replacePathLocale(asPath, locale = SEO_DEFAULT_LOCALE) {
  const normalizedLocale = normalizeSeoLocale(locale);
  const rawPath = String(asPath || '/').trim() || '/';
  const [pathnameWithLocale, hashFragment = ''] = rawPath.split('#');
  const [pathname = '/', searchQuery = ''] = pathnameWithLocale.split('?');
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
  const localizedPathname = localizePath(pathnameWithoutLocale, normalizedLocale);
  const querySuffix = searchQuery ? `?${searchQuery}` : '';
  const hashSuffix = hashFragment ? `#${hashFragment}` : '';
  return `${localizedPathname}${querySuffix}${hashSuffix}`;
}
