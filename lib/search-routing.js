export function slugifyProfession(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildLocalizedSearchPath({ categorySlug = '', locale = '' } = {}) {
  const safeCategorySlug = String(categorySlug || '').trim();
  const normalizedLocale = String(locale || '').trim().toLowerCase();
  const basePath = safeCategorySlug ? `/search/${safeCategorySlug}` : '/search';

  if (normalizedLocale && normalizedLocale !== 'he') {
    return `/${normalizedLocale}${basePath}`;
  }

  return basePath;
}

export function findProfessionBySlug(professions, slug) {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) return null;

  return professions.find((profession) => {
    const candidates = [
      profession.value,
      profession.en,
      profession.he,
      profession.ar,
      profession.logo,
    ];

    return candidates.some((candidate) => slugifyProfession(candidate) === normalizedSlug);
  }) || null;
}
