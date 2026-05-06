import { useMemo, useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import "./index.scss";

const CUPS = [
  {
    key: "fa-cup",
    title: "FA Cup (The Emirates FA Cup)",
    subtitle: "Knockout tournament open across the English pyramid (Levels 1-9).",
    rows: [
      { season: "2023/24", winner: "Manchester Utd", runnerUp: "Manchester City", score: "2-1" },
      { season: "2022/23", winner: "Manchester City", runnerUp: "Manchester Utd", score: "2-1" },
      { season: "2021/22", winner: "Liverpool", runnerUp: "Chelsea", score: "0-0 (6-5 pens)" },
      { season: "2020/21", winner: "Leicester City", runnerUp: "Chelsea", score: "1-0" },
      { season: "2019/20", winner: "Arsenal", runnerUp: "Chelsea", score: "2-1" },
      { season: "2018/19", winner: "Manchester City", runnerUp: "Watford", score: "6-0" },
    ],
  },
  {
    key: "efl-cup",
    title: "EFL Cup (Carabao Cup)",
    subtitle: "Open to clubs from Premier League, Championship, League One, and League Two.",
    rows: [
      { season: "2023/24", winner: "Liverpool", runnerUp: "Chelsea", score: "1-0 (AET)" },
      { season: "2022/23", winner: "Manchester Utd", runnerUp: "Newcastle Utd", score: "2-0" },
      { season: "2021/22", winner: "Liverpool", runnerUp: "Chelsea", score: "0-0 (11-10 pens)" },
      { season: "2020/21", winner: "Manchester City", runnerUp: "Tottenham", score: "1-0" },
      { season: "2019/20", winner: "Manchester City", runnerUp: "Aston Villa", score: "2-1" },
      { season: "2018/19", winner: "Manchester City", runnerUp: "Chelsea", score: "0-0 (4-3 pens)" },
    ],
  },
  {
    key: "community-shield",
    title: "FA Community Shield",
    subtitle: "Season curtain-raiser between Premier League winners and FA Cup winners.",
    rows: [
      { season: "2024", winner: "Manchester City", runnerUp: "Manchester Utd", score: "1-1 (7-6 pens)" },
      { season: "2023", winner: "Arsenal", runnerUp: "Manchester City", score: "1-1 (4-1 pens)" },
      { season: "2022", winner: "Liverpool", runnerUp: "Manchester City", score: "3-1" },
      { season: "2021", winner: "Leicester City", runnerUp: "Manchester City", score: "1-0" },
      { season: "2020", winner: "Arsenal", runnerUp: "Liverpool", score: "1-1 (5-4 pens)" },
      { season: "2019", winner: "Manchester City", runnerUp: "Liverpool", score: "1-1 (5-4 pens)" },
    ],
  },
];

const Cups = () => {
  const [letterClass] = useState("text-animate");
  const [selectedCup, setSelectedCup] = useState(CUPS[0].key);

  const activeCup = useMemo(
    () => CUPS.find((c) => c.key === selectedCup) || CUPS[0],
    [selectedCup]
  );

  return (
    <div className="container cups-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Domestic cups</p>
        <h1 className="page-title">
          <AnimatedLetters letterClass={letterClass} strArray={"Major English Cups".split("")} idx={12} />
        </h1>
        <p className="browse-page__intro">
          Final results and recent past winners for the FA Cup, EFL Cup, and Community Shield.
        </p>

        <div className="cups-tabs" role="tablist" aria-label="English cup competitions">
          {CUPS.map((cup) => (
            <button
              key={cup.key}
              type="button"
              className={`cups-tab ${selectedCup === cup.key ? "is-active" : ""}`}
              onClick={() => setSelectedCup(cup.key)}
              role="tab"
              aria-selected={selectedCup === cup.key}
            >
              {cup.title}
            </button>
          ))}
        </div>

        <section className="cups-card">
          <h2 className="cups-card__title">{activeCup.title}</h2>
          <p className="cups-card__subtitle">{activeCup.subtitle}</p>

          <div className="cups-table-wrap">
            <table className="cups-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Winner</th>
                  <th>Runner-up</th>
                  <th>Final result</th>
                </tr>
              </thead>
              <tbody>
                {activeCup.rows.map((row) => (
                  <tr key={`${activeCup.key}-${row.season}`}>
                    <td>{row.season}</td>
                    <td>{row.winner}</td>
                    <td>{row.runnerUp}</td>
                    <td>{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Cups;
