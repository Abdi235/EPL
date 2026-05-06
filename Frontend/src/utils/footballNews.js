import API_BASE_URL from "../config/api";

const NEWS_PATH = "v1/news";

/**
 * URLs to try, in order.
 * 1) Same-origin /api/v1/news — local: CRA setupProxy → Spring Boot :9090;
 *    production (Vercel): serverless api/v1/news.js → Render Spring Boot.
 * 2) REACT_APP_API_BASE_URL if set (direct to Render or another host).
 * 3) Legacy /api/render-proxy for older deployments.
 */
function candidateUrls(refresh) {
  const qs = refresh ? "?refresh=true" : "";
  const pathWithQs = `${NEWS_PATH}${qs}`;
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
 * @returns {Promise<{ articles: Array<{title: string, link: string, summary: string, publishedAt: string, source: string}>, fetchedAt: string, attribution: string }>}
 */
export async function fetchFootballNews({ refresh = false } = {}) {
  let lastErr = null;
  for (const url of candidateUrls(refresh)) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        let detail = "";
        try {
          const body = await res.text();
          if (body && body.length < 400) detail = `: ${body}`;
        } catch {
          /* ignore */
        }
        lastErr = new Error(`HTTP ${res.status}${detail}`);
        continue;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("News request failed.");
}
