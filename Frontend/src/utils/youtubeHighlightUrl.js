import API_BASE_URL from "../config/api";
import { buildHighlightsSearchUrl } from "./currentMatchweekHighlights";

const PATH = "v1/youtube/highlight";

function candidateUrls(home, away, date, homeScore, awayScore) {
  const qs = new URLSearchParams({
    home,
    away,
    date,
  });
  if (homeScore != null && awayScore != null) {
    qs.set("homeScore", String(homeScore));
    qs.set("awayScore", String(awayScore));
  }
  const pathWithQs = `${PATH}?${qs}`;
  const urls = [];
  const seen = new Set();
  const add = (u) => {
    if (u && !seen.has(u)) {
      seen.add(u);
      urls.push(u);
    }
  };
  add(`/api/${pathWithQs}`);
  if (API_BASE_URL) {
    add(`${API_BASE_URL}/api/${pathWithQs}`);
  }
  if (process.env.NODE_ENV === "production") {
    add(`/api/render-proxy?__path=${encodeURIComponent(pathWithQs)}`);
  }
  return urls;
}

/**
 * Resolves a Fubo Sports YouTube video for the fixture (via backend + Data API). Returns `videoId` for inline embeds.
 *
 * @param {{ homeTeam: string, awayTeam: string, date: string, homeScore: number, awayScore: number }} match
 * @returns {Promise<{ videoId: string | null, openUrl: string }>}
 */
export async function resolveYoutubeHighlightMedia(match) {
  const fallbackOpen = buildHighlightsSearchUrl(match.homeTeam, match.awayTeam, match.date);
  const urls = candidateUrls(
    match.homeTeam,
    match.awayTeam,
    match.date,
    match.homeScore,
    match.awayScore
  );
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const vid = data?.videoId;
      if (vid && typeof vid === "string" && /^[a-zA-Z0-9_-]{6,}$/.test(vid)) {
        const openUrl =
          data?.url && typeof data.url === "string" && data.url.startsWith("http")
            ? data.url
            : `https://www.youtube.com/watch?v=${vid}`;
        return { videoId: vid, openUrl };
      }
    } catch {
      /* try next candidate */
    }
  }
  return { videoId: null, openUrl: fallbackOpen };
}
