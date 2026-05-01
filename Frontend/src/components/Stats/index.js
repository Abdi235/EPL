import { useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import "./index.scss";

const Stats = () => {
  const [letterClass] = useState("text-animate");

  return (
    <div className="container stats-page">
      <h1 className="page-title">
        <AnimatedLetters letterClass={letterClass} strArray={"Player Stats".split("")} idx={12} />
      </h1>
      <p className="coming-soon-message">
        Coming soon - top scorers, top assists, and clean sheet leaders by season.
      </p>
    </div>
  );
};

export default Stats;
