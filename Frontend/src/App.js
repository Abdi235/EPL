import React, { useEffect } from 'react';
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
import Standings from "./components/Standings";
import Stats from "./components/Stats";

function App() {
  useEffect(() => {
    document.title = 'EPL';
  }, []);

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
          <Route path="standings" element={<Standings />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;