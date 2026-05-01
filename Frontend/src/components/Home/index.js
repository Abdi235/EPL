import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedLetters from '../AnimatedLetters';
import './index.scss';
import epLogo from '../../assets/images/EPLOGO.png';

const Home = () => {
  const [letterClass, setLetterClass] = useState('text-animate');
  const nameArray = 'Welcome to'.split('');
  const jobArray = 'PremierZone'.split('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setLetterClass('text-animate-hover');
    }, 3000);
    return () => clearTimeout(timerId);
  }, []);

  return (
    <div className="home-page">
      <div className="overlay"></div>

      <div className="container hero-layout">
        <section className="hero-content">
          <p className="eyebrow">Premier League Intelligence Platform</p>
          <h1 className="hero-title">
            <img src={epLogo} alt="PremierZone logo" />
            <AnimatedLetters letterClass={letterClass} strArray={nameArray} idx={12} />
            <AnimatedLetters letterClass={letterClass} strArray={jobArray} idx={24} />
          </h1>
          <p className="hero-subtitle">
            A clean, professional hub for Premier League standings, match results, and club insights.
            Built for fast navigation and matchday clarity.
          </p>
          <div className="cta-row">
            <Link to="/standings" className="flat-button">View Standings</Link>
            <Link to="/results" className="secondary-button">Browse Results</Link>
          </div>
        </section>

        <aside className="hero-panel">
          <p className="panel-label">Quick Access</p>
          <div className="feature-list">
            <Link to="/standings" className="feature-card">
              <h3>Standings</h3>
              <p>Track the current table with season filters and qualification highlights.</p>
            </Link>
            <Link to="/results" className="feature-card">
              <h3>Results</h3>
              <p>Review fixtures by season and team with clear, logo-enhanced match cards.</p>
            </Link>
            <Link to="/teams" className="feature-card">
              <h3>Teams</h3>
              <p>Explore club-level views and player-focused data in one place.</p>
            </Link>
          </div>
        </aside>
      </div>

      <div className="home-metrics container">
        <article className="metric-card">
          <p className="metric-value">20</p>
          <p className="metric-label">Premier League Clubs</p>
        </article>
        <article className="metric-card">
          <p className="metric-value">380</p>
          <p className="metric-label">Matches Per Season</p>
        </article>
        <article className="metric-card">
          <p className="metric-value">Latest</p>
          <p className="metric-label">Season-first tables and results</p>
        </article>
      </div>
    </div>
  );
};

export default Home;
