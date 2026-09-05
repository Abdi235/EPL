import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedLetters from '../AnimatedLetters';
import { displayMatchScore } from '../../utils/matchDatasets';
import {
  selectCurrentMatchweekHighlights,
  buildHighlightsSearchUrl,
} from '../../utils/currentMatchweekHighlights';
import { resolveYoutubeHighlightMedia } from '../../utils/youtubeHighlightUrl';
import { FUBO_SPORTS_YOUTUBE_CHANNEL_URL } from '../../config/fuboYoutube';
import { useEplMatchdayData } from '../../hooks/useEplMatchdayData';
import { getEplTeamLogoUrl } from '../../utils/eplTeamLogos';
import './index.scss';
import epLogo from '../../assets/images/EPLOGO.png';

function formatFixtureDate(ymd) {
  const parts = String(ymd).trim().split('-');
  if (parts.length !== 3) return ymd;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return ymd;
  try {
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return ymd;
  }
}

const Home = () => {
  const [letterClass, setLetterClass] = useState('text-animate');
  const { matches: allMatches, liveLeague, loading, error, lastUpdated, refresh, isRefreshing } =
    useEplMatchdayData();
  const [highlightMediaByKey, setHighlightMediaByKey] = useState({});
  const nameArray = 'PremierZone'.split('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setLetterClass('text-animate-hover');
    }, 3000);
    return () => clearTimeout(timerId);
  }, []);

  const highlights = useMemo(() => {
    if (loading || error || !allMatches.length) {
      return { season: null, weekRangeLabel: '', matches: [] };
    }
    return selectCurrentMatchweekHighlights(allMatches, { maxItems: 6 });
  }, [allMatches, loading, error]);

  const { season, weekRangeLabel, matches } = highlights;

  const leagueRows = useMemo(() => {
    if (!liveLeague?.table?.length) return [];
    return [...liveLeague.table].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [liveLeague]);

  const seasonBadge = liveLeague?.seasonLabel || season || '2026/2027';

  useEffect(() => {
    if (!matches.length) {
      setHighlightMediaByKey({});
      return;
    }
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        matches.map(async (m) => {
          const key = `${m.date}-${m.homeTeam}-${m.awayTeam}`;
          try {
            const media = await resolveYoutubeHighlightMedia(m);
            return [key, media];
          } catch {
            return [
              key,
              {
                videoId: null,
                openUrl: buildHighlightsSearchUrl(m.homeTeam, m.awayTeam, m.date),
              },
            ];
          }
        })
      );
      if (!cancelled) {
        setHighlightMediaByKey(Object.fromEntries(pairs));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matches]);

  return (
    <div className="home-page">
      <div className="overlay" aria-hidden="true" />

      <section className="hero-stage" aria-label="PremierZone introduction">
        <div className="hero-stage__glow" aria-hidden="true" />
        <div className="hero-stage__content">
          <p className="hero-stage__season">{seasonBadge} season</p>
          <div className="hero-stage__brand">
            <img src={epLogo} alt="" className="hero-stage__logo" />
            <h1 className="hero-stage__title">
              <AnimatedLetters letterClass={letterClass} strArray={nameArray} idx={12} />
            </h1>
          </div>
          <p className="hero-stage__tagline">
            Standings, results, and club insight for the Premier League — clear, fast, matchday-ready.
          </p>
          <div className="hero-stage__cta">
            <Link to="/standings" className="flat-button">
              View table
            </Link>
            <Link to="/results" className="secondary-button">
              Latest results
            </Link>
          </div>
        </div>
      </section>

      <div className="container home-highlights-wrap">
        {leagueRows.length > 0 && (
          <section className="home-table" aria-labelledby="home-table-heading">
            <div className="home-table__top">
              <div>
                <p className="eyebrow">League table</p>
                <h2 id="home-table-heading" className="home-table__title">
                  {liveLeague.seasonLabel} standings
                </h2>
                <p className="home-table__updated">
                  Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
                  <button
                    type="button"
                    className="home-table__refresh"
                    onClick={refresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                </p>
              </div>
              <Link to="/standings" className="home-highlights__all">
                Full table
              </Link>
            </div>
            <div className="home-table__scroll">
              <table className="home-table__grid">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Club</th>
                    <th>P</th>
                    <th>GD</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueRows.map((row) => (
                    <tr key={row.team?.id ?? row.team?.name}>
                      <td>{row.position}</td>
                      <td>
                        <span className="home-table__club">
                          {getEplTeamLogoUrl(row.team?.name) && (
                            <img
                              src={getEplTeamLogoUrl(row.team.name)}
                              alt=""
                              className="home-table__crest"
                              loading="lazy"
                            />
                          )}
                          <span>{row.team?.name}</span>
                        </span>
                      </td>
                      <td>{row.playedGames}</td>
                      <td>{row.goalDifference}</td>
                      <td className="home-table__pts">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="home-highlights" aria-labelledby="home-highlights-heading">
          <div className="home-highlights__top">
            <div>
              <p className="eyebrow">Matchweek</p>
              <h2 id="home-highlights-heading" className="home-highlights__title">
                Current gameweek results & highlights
              </h2>
              {season && weekRangeLabel && (
                <p className="home-highlights__sub">
                  {season}
                  {weekRangeLabel ? ` · ${weekRangeLabel}` : ''}
                </p>
              )}
              <p className="home-highlights__credit">
                Match clips from{' '}
                <a
                  href={FUBO_SPORTS_YOUTUBE_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Fubo Sports
                </a>{' '}
                on YouTube.
              </p>
            </div>
            <Link to="/results" className="home-highlights__all">
              Full results
            </Link>
          </div>

          {loading && (
            <p className="home-highlights__status">Loading this week&apos;s matches…</p>
          )}
          {error && (
            <p className="home-highlights__status">
              Could not load match data. Start the backend on port 9090 with FOOTBALL_API_KEY set, then{' '}
              <button type="button" className="home-highlights__retry" onClick={refresh}>
                retry
              </button>
              .
            </p>
          )}
          {!loading && !error && matches.length === 0 && (
            <p className="home-highlights__status">No completed fixtures in range yet.</p>
          )}

          {matches.length > 0 && (
            <ul className="home-highlights__grid">
              {matches.map((match) => {
                const homeLogo = getEplTeamLogoUrl(match.homeTeam);
                const awayLogo = getEplTeamLogoUrl(match.awayTeam);
                const hlKey = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
                const media = highlightMediaByKey[hlKey];
                const openUrl =
                  media?.openUrl ??
                  buildHighlightsSearchUrl(match.homeTeam, match.awayTeam, match.date);
                const videoId = media?.videoId ?? null;
                const iframeTitle = `${match.homeTeam} vs ${match.awayTeam} highlights`;
                return (
                  <li key={`${match.date}-${match.homeTeam}-${match.awayTeam}`}>
                    <div className="home-highlight-card">
                      <div className="home-highlight-card__teams">
                        <div className="home-highlight-card__side">
                          {homeLogo ? (
                            <img src={homeLogo} alt="" className="home-highlight-card__crest" />
                          ) : (
                            <span className="home-highlight-card__crest-fallback" aria-hidden />
                          )}
                          <span className="home-highlight-card__name">{match.homeTeam}</span>
                        </div>
                        <div className="home-highlight-card__score" aria-label="Score">
                          <span>{displayMatchScore(match, 'home')}</span>
                          <span className="home-highlight-card__dash">–</span>
                          <span>{displayMatchScore(match, 'away')}</span>
                        </div>
                        <div className="home-highlight-card__side home-highlight-card__side--away">
                          <span className="home-highlight-card__name">{match.awayTeam}</span>
                          {awayLogo ? (
                            <img src={awayLogo} alt="" className="home-highlight-card__crest" />
                          ) : (
                            <span className="home-highlight-card__crest-fallback" aria-hidden />
                          )}
                        </div>
                      </div>
                      <p className="home-highlight-card__date">{formatFixtureDate(match.date)}</p>
                      {videoId ? (
                        <div className="home-highlight-card__embed">
                          <iframe
                            title={iframeTitle}
                            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        </div>
                      ) : (
                        <div className="home-highlight-card__embed-fallback">
                          <p className="home-highlight-card__fallback-text">
                            Video embed loads when the API finds a Fubo Sports upload for this fixture.
                          </p>
                          <a
                            className="home-highlight-card__link home-highlight-card__link--secondary"
                            href={openUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Search on Fubo Sports
                          </a>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
