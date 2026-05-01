import { useEffect, useState, useRef } from 'react';
import Loader from 'react-loaders';
import { Link } from 'react-router-dom';
import AnimatedLetters from '../AnimatedLetters';
import './index.scss';
import bgImage from '../../assets/images/oldTraffordBackground.jpg';
import epLogo from '../../assets/images/EPLOGO.png';

const Home = () => {
    const [letterClass, setLetterClass] = useState('text-animate');
    const nameArray = "Welcome to".split("");
    const jobArray = "EPL".split("");
    const playerRef = useRef(null);

    useEffect(() => {
        const timerId = setTimeout(() => {
            setLetterClass('text-animate-hover');
        }, 4000);
        return () => clearTimeout(timerId);
    }, []);

    useEffect(() => {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            playerRef.current = new window.YT.Player('bottom-right-video', {
                events: {
                    'onReady': onPlayerReady,
                }
            });
        };

        return () => {
            delete window.onYouTubeIframeAPIReady;
            if (playerRef.current?.destroy) playerRef.current.destroy();
        };
    }, []);

    const onPlayerReady = (event) => {
        event.target.mute();
        event.target.playVideo();
    };

    return (
        <div className="home-page" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="overlay"></div>

            <div className="container hero-layout">
                <div className="text-zone">
                    <p className="eyebrow">Premier League Intelligence Platform</p>
                    <h1>
                        <img src={epLogo} alt="EPL Logo" />
                        <br />
                        <AnimatedLetters letterClass={letterClass} strArray={nameArray} idx={12} />
                        <br />
                        <AnimatedLetters letterClass={letterClass} strArray={jobArray} idx={15} />
                    </h1>
                    <h2>
                        Your trusted home for modern EPL coverage, team insights, and data-driven storytelling.
                    </h2>
                    <div className="cta-row">
                        <Link to="/teams" className="flat-button">Get Started</Link>
                        <Link to="/teams" className="secondary-button">Explore Clubs</Link>
                    </div>
                </div>

                <div className="hero-panel">
                    <p className="panel-label">Featured</p>
                    <h3>Premier League Best Goals</h3>
                    <p className="panel-copy">
                        Watch standout moments while you explore our latest EPL insights.
                    </p>
                </div>
            </div>

            <div className="video-container">
                <a
                    href="https://www.youtube.com/watch?v=wz1r_VJaJZw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-link"
                >
                    <iframe
                        id="bottom-right-video"
                        src="https://www.youtube.com/embed/wz1r_VJaJZw?autoplay=1&mute=1&loop=1&playlist=wz1r_VJaJZw&enablejsapi=1&rel=0&modestbranding=1"
                        frameBorder="0"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        title="bottom right video"
                    ></iframe>
                    <p className="video-title">
                        1 HOUR of the Premier League's BEST Goals in the Last 10 Years!
                    </p>
                </a>
            </div>

            <div className="home-metrics">
                <div className="metric-card">
                    <p className="metric-value">20</p>
                    <p className="metric-label">Premier League Clubs</p>
                </div>
                <div className="metric-card">
                    <p className="metric-value">380</p>
                    <p className="metric-label">Matches Per Season</p>
                </div>
                <div className="metric-card">
                    <p className="metric-value">100%</p>
                    <p className="metric-label">Fan-Focused Coverage</p>
                </div>
            </div>

            <Loader type="pacman" />
        </div>
    );
};

export default Home;
