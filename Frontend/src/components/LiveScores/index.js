import { useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import "./index.scss";

const LiveScores = () => {
  const [letterClass] = useState("text-animate");

  return (
    <div className="container live-page">
      <h1 className="page-title">
        <AnimatedLetters letterClass={letterClass} strArray={"Live Scores".split("")} idx={12} />
      </h1>
      <p className="status">Coming soon - live match tracking is under development.</p>
    </div>
  );
};

export default LiveScores;
