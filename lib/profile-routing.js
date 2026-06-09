export const PROFILE_UID_PREFIX_LENGTH = 6;

export function slugifyProfileName(value) {
  return String(value || '')
    .trim()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildProfileSlug(profile) {
  const uid = String(profile?.uid || '').trim();
  if (!uid) return '';

  const nameSlug = slugifyProfileName(profile?.name) || 'user';
  return `${nameSlug}--${encodeURIComponent(uid)}`;
}

export function buildProfilePath(profile) {
  const slug = buildProfileSlug(profile);
  return slug ? `/profile/${slug}` : '/profile';
}

export function getUidPrefixFromProfileSlug(value) {
  const slug = String(value || '').trim();
  const separatorIndex = slug.lastIndexOf('-');
  if (separatorIndex < 1) return '';

  const prefix = slug.slice(separatorIndex + 1);
  return prefix.length === PROFILE_UID_PREFIX_LENGTH ? prefix : '';
}

export function getUidFromProfileSlug(value) {
  const slug = String(value || '').trim();
  const separatorIndex = slug.lastIndexOf('--');
  if (separatorIndex < 1) return '';

  try {
    return decodeURIComponent(slug.slice(separatorIndex + 2)).trim();
  } catch {
    return '';
  }
}

export function buildCommunityPostSlug(post) {
  const postId = String(post?.id || '').trim();
  if (!postId) return '';

  const authorSlug = slugifyProfileName(post?.authorName) || 'user';
  return `${authorSlug}-post-${encodeURIComponent(postId)}`;
}

export function buildCommunityPostPath(post) {
  const slug = buildCommunityPostSlug(post);
  return slug ? `/community/${slug}` : '/community';
}

export function getPostIdFromCommunitySlug(value) {
  const slug = String(value || '').trim();
  const separatorIndex = slug.lastIndexOf('-post-');
  if (separatorIndex < 1) return '';

  try {
    return decodeURIComponent(slug.slice(separatorIndex + 6)).trim();
  } catch {
    return '';
  }
}
