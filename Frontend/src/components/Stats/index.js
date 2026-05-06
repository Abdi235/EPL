import { useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import "./index.scss";

const Stats = () => {
  const [letterClass] = useState("text-animate");

  return (
    <div className="container stats-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Leaders</p>
        <h1 className="page-title">
          <AnimatedLetters letterClass={letterClass} strArray={"Player Stats".split("")} idx={12} />
        </h1>
        <p className="browse-page__intro">
          Season-long leaderboards for goals, assists, and defensive records will appear here next.
        </p>
        <p className="coming-soon-message">
          Coming soon: top scorers, top assists, and clean sheet leaders by season.
        </p>
      </div>
    </div>
  );
};

export default Stats;
