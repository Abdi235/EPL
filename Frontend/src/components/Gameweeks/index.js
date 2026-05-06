import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import { loadNormalizedMatches, isMatchCompleted, maxGameweekForSeason } from "../../utils/matchDatasets";
import {
  buildSnapshotBeforeGameweek,
  collectTeamsInSeason,
  formatRecord,
  getFormDotsBeforeGameweek,
} from "../../utils/gameweekUtils";
import { getEplTeamLogoUrl } from "../../utils/eplTeamLogos";
import "./index.scss";

const seasonSortDesc = (a, b) => String(b).localeCompare(String(a));

const GW_LOW = 1;

/** Show every gameweek in range (same idea as “All seasons” on Results). */
const ALL_GAMWEEKS_VALUE = "__all_gameweeks__";

function formKey(team, gw) {
  return `${team}::${gw}`;
}

function FormDots({ sequence }) {
  const label = sequence.map((x) => (x == null ? "—" : x)).join(" ");
  return (
    <span className="gw-form-dots" title={label} aria-label={`Last five: ${label}`}>
      {sequence.map((x, i) => (
        <span
          key={i}
          className={
            x === "W"
              ? "gw-form-dots__dot gw-form-dots__dot--w"
              : x === "L"
                ? "gw-form-dots__dot gw-form-dots__dot--l"
                : x === "D"
                  ? "gw-form-dots__dot gw-form-dots__dot--d"
                  : "gw-form-dots__dot gw-form-dots__dot--empty"
          }
        />
      ))}
    </span>
  );
}

function TeamFixtureMeta({ snapshotRow, formSeq }) {
  const pos = snapshotRow ? `#${snapshotRow.position}` : "—";
  return (
    <div className="gw-fix__meta">
      <span className="gw-fix__pos">{pos}</span>
      <span className="gw-fix__rec">{formatRecord(snapshotRow)}</span>
      <FormDots sequence={formSeq} />
    </div>
  );
}

const Gameweeks = () => {
  const [letterClass] = useState("text-animate");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState(ALL_GAMWEEKS_VALUE);

  const load = useCallback(async () => {
    try {
      const data = await loadNormalizedMatches();
      setMatches(data);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seasons = useMemo(() => {
    const u = new Set(matches.map((m) => String(m.season || "").trim()).filter(Boolean));
    return [...u].sort(seasonSortDesc);
  }, [matches]);

  useEffect(() => {
    if (!selectedSeason && seasons[0]) setSelectedSeason(seasons[0]);
  }, [selectedSeason, seasons]);

  useEffect(() => {
    setSelectedGameweek(ALL_GAMWEEKS_VALUE);
  }, [selectedSeason]);

  const seasonMatches = useMemo(
    () => matches.filter((m) => m.season === selectedSeason),
    [matches, selectedSeason]
  );

  const seasonMaxGw = useMemo(() => maxGameweekForSeason(selectedSeason), [selectedSeason]);

  const gwKeys = useMemo(
    () => Array.from({ length: seasonMaxGw }, (_, i) => i + GW_LOW),
    [seasonMaxGw]
  );

  const gwOrderDesc = useMemo(() => [...gwKeys].reverse(), [gwKeys]);

  const allTeams = useMemo(() => collectTeamsInSeason(seasonMatches), [seasonMatches]);

  const snapshotByGw = useMemo(() => {
    const map = new Map();
    for (const g of gwKeys) {
      map.set(g, buildSnapshotBeforeGameweek(seasonMatches, g, allTeams));
    }
    return map;
  }, [seasonMatches, allTeams, gwKeys]);

  const formMap = useMemo(() => {
    const map = new Map();
    for (const g of gwKeys) {
      for (const t of allTeams) {
        map.set(formKey(t, g), getFormDotsBeforeGameweek(t, seasonMatches, g, 5));
      }
    }
    return map;
  }, [seasonMatches, allTeams, gwKeys]);

  const fixturesByGw = useMemo(() => {
    const map = new Map();
    for (const g of gwKeys) map.set(g, []);
    for (const m of seasonMatches) {
      const g = m.gameweek;
      if (g == null || !map.has(g)) continue;
      map.get(g).push(m);
    }
    for (const g of gwKeys) {
      map.get(g).sort(
        (a, b) =>
          String(a.date).localeCompare(String(b.date)) ||
          String(a.homeTeam).localeCompare(String(b.homeTeam))
      );
    }
    return map;
  }, [seasonMatches, gwKeys]);

  const rowByTeamSnapshot = (gw, team) => {
    const snap = snapshotByGw.get(gw) || [];
    return snap.find((r) => r.team === team) || null;
  };

  const visibleGameweeks = useMemo(() => {
    if (selectedGameweek === ALL_GAMWEEKS_VALUE) return gwOrderDesc;
    const n = parseInt(String(selectedGameweek), 10);
    if (!Number.isFinite(n) || n < GW_LOW || n > seasonMaxGw) return gwOrderDesc;
    return [n];
  }, [selectedGameweek, gwOrderDesc, seasonMaxGw]);

  if (loading) {
    return (
      <div className="container gameweeks-page browse-page">
        <p className="gw-status">Loading gameweeks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container gameweeks-page browse-page">
        <p className="gw-status">Could not load matches: {error.message}</p>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="container gameweeks-page browse-page">
        <div className="browse-page__glass">
          <p className="browse-page__eyebrow">Season view</p>
          <h1 className="page-title">Gameweeks</h1>
          <p className="browse-page__intro">No match data found. Add CSV files under public or connect the backend.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container gameweeks-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Season view</p>
        <h1 className="page-title">
          <AnimatedLetters letterClass={letterClass} strArray={"Gameweeks".split("")} idx={10} />
        </h1>
        <div className="gw-controls">
          <div className="gw-controls__field">
            <label className="gw-label" htmlFor="gw-season">
              Season
            </label>
            <select
              id="gw-season"
              className="gw-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="gw-controls__field">
            <label className="gw-label" htmlFor="gw-filter">
              Gameweek
            </label>
            <select
              id="gw-filter"
              className="gw-select"
              value={selectedGameweek}
              onChange={(e) => setSelectedGameweek(e.target.value)}
            >
              <option value={ALL_GAMWEEKS_VALUE}>All gameweeks</option>
              {gwOrderDesc.map((g) => (
                <option key={g} value={String(g)}>
                  Gameweek {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="gw-legend" role="note" aria-label="Form dots legend">
          <span className="gw-legend__label">Form dots</span>
          <ul className="gw-legend__list">
            <li>
              <span className="gw-form-dots" aria-hidden>
                <span className="gw-form-dots__dot gw-form-dots__dot--w" />
              </span>
              <span>Win</span>
            </li>
            <li>
              <span className="gw-form-dots" aria-hidden>
                <span className="gw-form-dots__dot gw-form-dots__dot--d" />
              </span>
              <span>Draw</span>
            </li>
            <li>
              <span className="gw-form-dots" aria-hidden>
                <span className="gw-form-dots__dot gw-form-dots__dot--l" />
              </span>
              <span>Loss</span>
            </li>
            <li>
              <span className="gw-form-dots" aria-hidden>
                <span className="gw-form-dots__dot gw-form-dots__dot--empty" />
              </span>
              <span>Fewer than five prior matches</span>
            </li>
          </ul>
          <p className="gw-legend__hint">Left to right: oldest to newest going into that gameweek.</p>
          <p className="gw-legend__season-note">
            1992–93 to 1994–95: 22 teams, 42 fixtures each. From 1995–96: 20 teams, 38 fixtures (four
            relegated and two promoted after 1994–95).
          </p>
        </div>

        <div className="gw-list">
          {visibleGameweeks.map((gw) => {
            const fixtures = fixturesByGw.get(gw) || [];
            const dates = fixtures.map((f) => f.date).filter(Boolean);
            const dateLabel =
              dates.length === 0
                ? "No dates in data"
                : dates.length === 1
                  ? dates[0]
                  : `${dates[0]} – ${dates[dates.length - 1]}`;

            return (
              <section key={gw} className="gw-block" aria-labelledby={`gw-heading-${gw}`}>
                <header className="gw-block__head">
                  <h2 id={`gw-heading-${gw}`} className="gw-block__title">
                    Gameweek {gw}
                  </h2>
                  <span className="gw-block__dates">{dateLabel}</span>
                </header>

                {fixtures.length === 0 ? (
                  <p className="gw-block__empty">
                    No fixtures in the dataset for this gameweek. Add scheduled rows (empty scores) or
                    update your league CSV to fill remaining weeks.
                  </p>
                ) : (
                  <ul className="gw-fix-list">
                    {fixtures.map((m) => {
                      const hk = `${m.date}-${m.homeTeam}-${m.awayTeam}`;
                      const homeSnap = rowByTeamSnapshot(gw, m.homeTeam);
                      const awaySnap = rowByTeamSnapshot(gw, m.awayTeam);
                      const homeForm = formMap.get(formKey(m.homeTeam, gw)) || [];
                      const awayForm = formMap.get(formKey(m.awayTeam, gw)) || [];
                      const homeLogo = getEplTeamLogoUrl(m.homeTeam);
                      const awayLogo = getEplTeamLogoUrl(m.awayTeam);
                      const done = isMatchCompleted(m);

                      return (
                        <li key={hk} className="gw-fix">
                          <div className="gw-fix__side gw-fix__side--home">
                            <div className="gw-fix__teamline">
                              {homeLogo ? (
                                <img src={homeLogo} alt="" className="gw-fix__logo" loading="lazy" />
                              ) : (
                                <span className="gw-fix__logo-fallback" aria-hidden />
                              )}
                              <span className="gw-fix__name">{m.homeTeam}</span>
                            </div>
                            <TeamFixtureMeta snapshotRow={homeSnap} formSeq={homeForm} />
                          </div>

                          <div className="gw-fix__center">
                            <span className="gw-fix__score">
                              {done ? (
                                <>
                                  <span>{m.homeScore}</span>
                                  <span className="gw-fix__dash">–</span>
                                  <span>{m.awayScore}</span>
                                </>
                              ) : (
                                <span className="gw-fix__vs">vs</span>
                              )}
                            </span>
                            {m.kickoff ? (
                              <span className="gw-fix__time">{m.kickoff}</span>
                            ) : null}
                            <span className="gw-fix__date">{m.date}</span>
                          </div>

                          <div className="gw-fix__side gw-fix__side--away">
                            <div className="gw-fix__teamline">
                              <span className="gw-fix__name">{m.awayTeam}</span>
                              {awayLogo ? (
                                <img src={awayLogo} alt="" className="gw-fix__logo" loading="lazy" />
                              ) : (
                                <span className="gw-fix__logo-fallback" aria-hidden />
                              )}
                            </div>
                            <TeamFixtureMeta snapshotRow={awaySnap} formSeq={awayForm} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Gameweeks;
