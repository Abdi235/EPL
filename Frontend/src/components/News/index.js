import { useCallback, useEffect, useState } from "react";
import { fetchFootballNews } from "../../utils/footballNews";
import "./index.scss";

function formatPublished(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const News = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const json = await fetchFootballNews({ refresh });
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load news.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return (
    <div className="container news-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Premier League</p>
        <h1 className="page-title">EPL headlines</h1>
        <p className="browse-page__intro">
          Stories pulled from Premier League–focused RSS feeds, filtered for the competition and top-flight
          clubs. Open any headline to read the full piece on the publisher&apos;s site.
        </p>
        {data?.attribution && <p className="news-attribution">{data.attribution}</p>}

        <div className="news-toolbar">
          <button
            type="button"
            className="news-refresh"
            onClick={() => load(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh headlines"}
          </button>
          {data?.fetchedAt && (
            <span className="news-fetched">Last fetched: {formatPublished(data.fetchedAt)}</span>
          )}
        </div>

        {loading && <p className="news-status">Loading headlines…</p>}
        {error && (
          <div className="news-error" role="alert">
            <p className="news-error__title">
              {/failed to fetch|networkerror|load failed/i.test(error)
                ? "Cannot reach the news API (browser connection failed)."
                : error}
            </p>
            {/failed to fetch|networkerror|load failed/i.test(error) ? (
              <div className="news-error__help">
                <p>
                  Stories are loaded through your <strong>Spring Boot</strong> backend at{" "}
                  <code>GET /api/v1/news</code> (RSS is read on the server, not in the browser).
                </p>
                <ul>
                  <li>
                    <strong>Local dev:</strong> In a separate terminal, from the <code>Backend</code> folder run{" "}
                    <code>mvn spring-boot:run</code> (dev profile uses port <strong>9090</strong>). Keep{" "}
                    <code>npm start</code> running for the React app, then use &quot;Refresh headlines&quot;.
                  </li>
                  <li>
                    <strong>Vercel / production:</strong> Set <code>RENDER_API_ORIGIN</code> (or{" "}
                    <code>API_BACKEND_ORIGIN</code>) to your Spring Boot URL so the{" "}
                    <code>/api/v1/news</code> serverless route can proxy to it. Redeploy after saving.
                    Alternatively set <code>REACT_APP_API_BASE_URL</code> at build time to call Render directly.
                  </li>
                </ul>
              </div>
            ) : (
              <p className="news-error__hint">
                Confirm the API returns JSON from <code>/api/v1/news</code>. Check the browser Network tab for
                details.
              </p>
            )}
          </div>
        )}

        {!loading && !error && data?.articles?.length === 0 && (
          <p className="news-status">No articles returned. Try refresh or check RSS configuration on the server.</p>
        )}

        {data?.articles?.length > 0 && (
          <ul className="news-list">
            {data.articles.map((article) => (
              <li key={article.link || article.title} className="news-card">
                <a
                  className="news-card__link"
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="news-card__title">{article.title}</span>
                  {article.summary ? (
                    <span className="news-card__summary">{article.summary}</span>
                  ) : null}
                  <span className="news-card__meta">
                    {article.source && <span className="news-card__source">{article.source}</span>}
                    {article.publishedAt && (
                      <time className="news-card__time" dateTime={article.publishedAt}>
                        {formatPublished(article.publishedAt)}
                      </time>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default News;
