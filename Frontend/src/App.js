import React, { useEffect, useState } from 'react';
import './App.scss';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Teams from './components/Teams';
import TeamData from './components/TeamData';
import Nation from "./components/Nation";
import Position from "./components/Position";
import Search from "./components/Search";
import LiveScores from "./components/LiveScores";
import Results from "./components/Results";
import Gameweeks from "./components/Gameweeks";
import Standings from "./components/Standings";
import Cups from "./components/Cups";
import Stats from "./components/Stats";
import SplashLoader from "./components/SplashLoader";

const SPLASH_SESSION_KEY = "premierzone_splash_seen";

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
  });

  useEffect(() => {
    document.title = 'EPL';

    if (!showSplash) return undefined;

    const splashTimer = window.setTimeout(() => {
      setShowSplash(false);
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    }, 1400);

    return () => window.clearTimeout(splashTimer);
  }, [showSplash]);

  if (showSplash) {
    return <SplashLoader />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="teams" element={<Teams />} />
          <Route path="data" element={<TeamData />} />
          <Route path="nation" element={<Nation />} />
          <Route path="position" element={<Position />} />
          <Route path="search" element={<Search />} />
          <Route path="live" element={<LiveScores />} />
          <Route path="results" element={<Results />} />
          <Route path="gameweeks" element={<Gameweeks />} />
          <Route path="standings" element={<Standings />} />
          <Route path="cups" element={<Cups />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;