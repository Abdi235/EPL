/** Fubo Sports — https://www.youtube.com/c/fubosports */
export const FUBO_SPORTS_YOUTUBE_CHANNEL_ID = "UCiPywDqO1dB34oxfEjjbQnw";

export const FUBO_SPORTS_YOUTUBE_CHANNEL_URL = `https://www.youtube.com/channel/${FUBO_SPORTS_YOUTUBE_CHANNEL_ID}`;

export function buildFuboChannelSearchUrl(searchQuery) {
  return `${FUBO_SPORTS_YOUTUBE_CHANNEL_URL}/search?query=${encodeURIComponent(searchQuery)}`;
}
