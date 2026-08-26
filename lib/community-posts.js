import { getBlogPostsPage } from './firestore';

export const COMMUNITY_POSTS_PAGE_SIZE = 12;

const COMMUNITY_POSTS_FRESH_MS = 30 * 1000;

let feedCache = {
  posts: [],
  cursor: null,
  hasMore: true,
  updatedAt: 0,
};
let refreshRequest = null;
let loadMoreRequest = null;

function getPublicSnapshot() {
  return {
    posts: feedCache.posts,
    hasMore: feedCache.hasMore,
    updatedAt: feedCache.updatedAt,
  };
}

function mergeUniquePosts(primaryPosts, secondaryPosts) {
  const seen = new Set();

  return [...primaryPosts, ...secondaryPosts].filter((post) => {
    if (!post?.id || seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

export function getCachedCommunityPosts() {
  return getPublicSnapshot();
}

export function setCachedCommunityPosts(posts) {
  feedCache = {
    ...feedCache,
    posts: Array.isArray(posts) ? posts : [],
  };
  return getPublicSnapshot();
}

export async function revalidateCommunityPosts({ force = false } = {}) {
  const cacheIsFresh = Date.now() - feedCache.updatedAt < COMMUNITY_POSTS_FRESH_MS;
  if (!force && feedCache.posts.length > 0 && cacheIsFresh) {
    return getPublicSnapshot();
  }

  if (refreshRequest) return refreshRequest;

  refreshRequest = getBlogPostsPage({ pageSize: COMMUNITY_POSTS_PAGE_SIZE })
    .then((page) => {
      const hasLoadedExtraPages = feedCache.posts.length > COMMUNITY_POSTS_PAGE_SIZE;

      feedCache = {
        posts: mergeUniquePosts(page.posts, hasLoadedExtraPages ? feedCache.posts : []),
        cursor: hasLoadedExtraPages ? feedCache.cursor : page.cursor,
        hasMore: hasLoadedExtraPages ? feedCache.hasMore : page.hasMore,
        updatedAt: Date.now(),
      };

      return getPublicSnapshot();
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

export async function loadMoreCommunityPosts() {
  if (!feedCache.hasMore || !feedCache.cursor) {
    return getPublicSnapshot();
  }

  if (loadMoreRequest) return loadMoreRequest;

  loadMoreRequest = getBlogPostsPage({
    cursor: feedCache.cursor,
    pageSize: COMMUNITY_POSTS_PAGE_SIZE,
  })
    .then((page) => {
      feedCache = {
        posts: mergeUniquePosts(feedCache.posts, page.posts),
        cursor: page.cursor || feedCache.cursor,
        hasMore: page.hasMore,
        updatedAt: feedCache.updatedAt,
      };

      return getPublicSnapshot();
    })
    .finally(() => {
      loadMoreRequest = null;
    });

  return loadMoreRequest;
}
