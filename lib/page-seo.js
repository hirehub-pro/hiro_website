import { getProfessionSeoData } from './profession-seo';

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[|<>]/g, ' ')
    .trim();
}

function truncateText(value, maxLength = 160) {
  const normalized = cleanText(value);
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function listToSentence(items, maxItems = 3) {
  const normalized = Array.isArray(items)
    ? items.map(cleanText).filter(Boolean)
    : [];

  const visibleItems = normalized.slice(0, maxItems);
  if (visibleItems.length <= 1) return visibleItems[0] || '';

  return `${visibleItems.slice(0, -1).join(', ')} ו${visibleItems.at(-1)}`;
}

function formatRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return numeric.toFixed(1);
}

function buildLocationLabel(profile) {
  return cleanText(profile?.town || profile?.city || '');
}

export function getSearchPageSeo() {
  return {
    title: 'חיפוש בעלי מקצוע מומלצים | הירו',
    description: 'חפשו בעלי מקצוע מומלצים לפי תחום, השוו פרופילים, דירוגים וביקורות, ומצאו בקלות אנשי מקצוע אמינים באזור שלכם עם הירו.',
  };
}

export function getCategoryPageSeo(categorySlug, professionLabel = '') {
  const categorySeo = getProfessionSeoData(categorySlug, 'he', professionLabel);
  const titleBase = cleanText(categorySeo?.title || 'בעלי מקצוע');
  const descriptionBase = cleanText(categorySeo?.description || categorySeo?.intro);

  return {
    title: titleBase,
    description: descriptionBase || 'מצאו בעלי מקצוע מומלצים באזור שלכם בהירו, השוו דירוגים, ביקורות וניסיון, ובחרו איש מקצוע מתאים בקלות.',
    keywords: Array.isArray(categorySeo?.keywords) ? categorySeo.keywords.join(', ') : '',
  };
}

export function getProfilePageSeo(profile, { schedule = false, professionLabels = null } = {}) {
  const name = cleanText(profile?.name || 'בעל מקצוע');
  const professions = listToSentence(professionLabels || profile?.professionLabelsHe || profile?.professions, 3);
  const city = buildLocationLabel(profile);
  const rating = formatRating(profile?.avgRating);
  const reviews = Number(profile?.reviewCount || 0);
  const projects = Number(profile?.projectCount || 0);

  const title = schedule
    ? `לוח הזמנים של ${name} | הירו`
    : professions
      ? `${name} – ${professions}${city ? ` ב${city} והסביבה` : ''} | הירו`
      : `${name}${city ? ` – בעל מקצוע ב${city} והסביבה` : ''} | הירו`;

  const baseDescription = schedule
    ? `צפו בלוח הזמנים של ${name}${city ? ` באזור ${city}` : ''}, בדקו זמינות ופנו ישירות דרך הירו.`
    : [
      `הכירו את ${name}${professions ? `, ${professions}` : ''}${city ? ` ב${city} והסביבה` : ''}.`,
      rating && reviews > 0
        ? `דירוג ${rating} על סמך ${reviews === 1 ? 'חוות דעת אחת' : `${reviews} חוות דעת`}.`
        : '',
      `צפו בשירותים${projects > 0 ? ' ובעבודות קודמות' : ''} וצרו קשר ישירות דרך הירו.`,
    ].filter(Boolean).join(' ');

  return {
    title,
    description: truncateText(baseDescription),
  };
}

function getCommunityCategoryLabel(category) {
  const normalized = cleanText(category).toLowerCase();
  if (normalized === 'tip' || normalized === 'טיפ') return 'טיפים';
  if (normalized === 'question' || normalized === 'שאלה') return 'שאלות';
  if (normalized === 'request' || normalized === 'בקשה') return 'בקשות';
  if (normalized === 'recommended' || normalized === 'recommendation' || normalized === 'מומלץ') return 'המלצות';
  return 'פוסטים';
}

export function getCommunityPageSeo() {
  return {
    title: 'קהילת הירו | שאלות, טיפים והמלצות לפני שבוחרים בעל מקצוע',
    description: 'הצטרפו לקהילת הירו כדי לשאול שאלות, לקבל טיפים, לפרסם בקשות עבודה ולגלות המלצות שיעזרו לכם לבחור בעל מקצוע אמין באזור שלכם.',
  };
}

export function getCommunityPostSeo(post) {
  const title = cleanText(post?.title || 'פוסט בקהילה');
  const categoryLabel = getCommunityCategoryLabel(post?.category);
  const profession = cleanText(post?.professionLabel || post?.profession || '');
  const location = cleanText(post?.location || '');
  const content = truncateText(post?.content || post?.text || '', 150);

  const titleWithBrand = `${title} | קהילת הירו`;
  const parts = [`${categoryLabel} בקהילת הירו`];
  if (profession) parts.push(`בנושא ${profession}`);
  if (location) parts.push(`באזור ${location}`);

  return {
    title: titleWithBrand,
    description: content || truncateText(`${parts.join(' ')}. קראו את הפוסט, התגובות והמידע המלא באתר הירו.`),
  };
}

export function getProjectPageSeo(project, profileName = '') {
  const name = cleanText(profileName || 'בעל מקצוע');
  const projectTitle = cleanText(project?.title || project?.description || 'פרויקט');
  const description = truncateText(project?.description || '');

  return {
    title: `${projectTitle} | עבודות של ${name} | הירו`,
    description: description || `צפו בפרויקט של ${name} בהירו, התרשמו מתמונות, פרטי העבודה והתגובות של לקוחות.`,
  };
}
