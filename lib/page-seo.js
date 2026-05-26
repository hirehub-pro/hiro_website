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

  return normalized.slice(0, maxItems).join(', ');
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
    title: 'חיפוש בעלי מקצוע מומלצים | Hiro',
    description: 'חפשו בעלי מקצוע מומלצים לפי תחום, השוו פרופילים, דירוגים וביקורות, ומצאו בקלות אנשי מקצוע אמינים באזור שלכם עם Hiro.',
  };
}

export function getCategoryPageSeo(categorySlug) {
  const categorySeo = getProfessionSeoData(categorySlug, 'he');
  const titleBase = cleanText(categorySeo?.title || 'בעלי מקצוע');
  const descriptionBase = cleanText(categorySeo?.description || categorySeo?.intro);

  return {
    title: `${titleBase} | Hiro`,
    description: descriptionBase || 'מצאו בעלי מקצוע מומלצים, השוו דירוגים, ביקורות וניסיון, ובחרו איש מקצוע מתאים דרך Hiro.',
    keywords: Array.isArray(categorySeo?.keywords) ? categorySeo.keywords.join(', ') : '',
  };
}

export function getProfilePageSeo(profile, { schedule = false } = {}) {
  const name = cleanText(profile?.name || 'בעל מקצוע');
  const professions = listToSentence(profile?.professions, 3);
  const city = buildLocationLabel(profile);
  const rating = formatRating(profile?.avgRating);
  const reviews = Number(profile?.reviewCount || 0);
  const description = truncateText(profile?.description || '');

  const titleParts = [name];
  if (professions) titleParts.push(professions);
  if (city) titleParts.push(city);

  const title = schedule
    ? `לוח הזמנים של ${name} | Hiro`
    : `${titleParts.join(' | ')} | Hiro`;

  const summaryParts = [];
  if (professions) summaryParts.push(`${name} מציע שירותי ${professions}`);
  if (city) summaryParts.push(`באזור ${city}`);
  if (rating) summaryParts.push(`עם דירוג ${rating}`);
  if (reviews > 0) summaryParts.push(`ו-${reviews} ביקורות`);

  const baseDescription = schedule
    ? `צפו בלוח הזמנים של ${name}${city ? ` באזור ${city}` : ''}, בדקו זמינות ופנו ישירות דרך Hiro.`
    : `${summaryParts.join(' ')}.`;

  return {
    title,
    description: truncateText(description || baseDescription || `צפו בפרופיל של ${name} ב-Hiro, קראו ביקורות, בדקו שירותים וזמינות ופנו ישירות.`),
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
    title: 'קהילת Hiro | טיפים, בקשות והמלצות לבעלי מקצוע',
    description: 'גלו טיפים, שאלות, בקשות והמלצות מהקהילה של Hiro, וקבלו מידע שימושי לפני שבוחרים בעל מקצוע לשירות הבא שלכם.',
  };
}

export function getCommunityPostSeo(post) {
  const title = cleanText(post?.title || 'פוסט בקהילה');
  const categoryLabel = getCommunityCategoryLabel(post?.category);
  const profession = cleanText(post?.professionLabel || post?.profession || '');
  const location = cleanText(post?.location || '');
  const content = truncateText(post?.content || post?.text || '', 150);

  const titleWithBrand = `${title} | קהילת Hiro`;
  const parts = [`${categoryLabel} בקהילת Hiro`];
  if (profession) parts.push(`בנושא ${profession}`);
  if (location) parts.push(`באזור ${location}`);

  return {
    title: titleWithBrand,
    description: content || truncateText(`${parts.join(' ')}. קראו את הפוסט, התגובות והמידע המלא באתר Hiro.`),
  };
}

export function getProjectPageSeo(project, profileName = '') {
  const name = cleanText(profileName || 'בעל מקצוע');
  const projectTitle = cleanText(project?.title || project?.description || 'פרויקט');
  const description = truncateText(project?.description || '');

  return {
    title: `${projectTitle} | עבודות של ${name} | Hiro`,
    description: description || `צפו בפרויקט של ${name} ב-Hiro, התרשמו מתמונות, פרטי העבודה והתגובות של לקוחות.`,
  };
}
