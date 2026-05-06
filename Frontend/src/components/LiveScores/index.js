import { useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import "./index.scss";

const LiveScores = () => {
  const [letterClass] = useState("text-animate");

  return (
    <div className="container live-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Matchday</p>
        <h1 className="page-title">
          <AnimatedLetters letterClass={letterClass} strArray={"Live Scores".split("")} idx={12} />
        </h1>
        <p className="browse-page__intro">
          Real-time fixtures and scorelines will surface here once the live feed is connected.
        </p>
        <p className="status">Coming soon — live match tracking is under development.</p>
      </div>
    </div>
  );
};

export default LiveScores;
