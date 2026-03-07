import { useEffect, useState, useRef } from 'react';
import Loader from 'react-loaders';
import { Link } from 'react-router-dom';
import AnimatedLetters from '../AnimatedLetters';
import './index.scss';
import bgImage from '../../assets/images/oldTraffordBackground.jpg';
import epLogo from '../../assets/images/EPLOGO.png';
import soundIcon from '../../assets/images/soundonandoff.jpg';

const Home = () => {
    const [letterClass, setLetterClass] = useState('text-animate');
    const nameArray = "Welcome to".split("");
    const jobArray = "EPL".split("");
    const playerRef = useRef(null);

    // Get mute state from localStorage or default to true
    const [isMuted, setIsMuted] = useState(() => {
        const savedMute = localStorage.getItem('isMuted');
        return savedMute === null ? true : savedMute === 'true';
    });

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
        if (isMuted) {
            event.target.mute();
        } else {
            event.target.unMute();
        }
        event.target.playVideo();
    };

    const toggleMute = () => {
        if (!playerRef.current) return;

        if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
            localStorage.setItem('isMuted', 'false');
        } else {
            playerRef.current.mute();
            setIsMuted(true);
            localStorage.setItem('isMuted', 'true');
        }
    };

    return (
        <div
            className="home-page"
            style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                width: '100%',
                height: '100vh',
                position: 'relative',
            }}
        >
            {/* Overlay for text readability */}
            <div className="overlay"></div>

            <div className="container">
                <div className="text-zone">
                    <h1>
                        <img src={epLogo} alt="EPL Logo" />
                        <br />
                        <AnimatedLetters letterClass={letterClass} strArray={nameArray} idx={12} />
                        <br />
                        <AnimatedLetters letterClass={letterClass} strArray={jobArray} idx={15} />
                    </h1>
                    <h2>Your home For The Future of EPL Coverage!</h2>
                    <Link to="/teams" className="flat-button">GET STARTED</Link>
                </div>
            </div>

            {/* YouTube video container */}
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

                <img
                    src={soundIcon}
                    alt="Toggle Sound"
                    onClick={toggleMute}
                    className="mute-icon"
                />
            </div>

            <Loader type="pacman" />
        </div>
    );
};

export default Home;
