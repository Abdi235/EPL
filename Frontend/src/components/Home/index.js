import { useEffect, useState, useRef } from 'react';
import Loader from 'react-loaders';
import { Link } from 'react-router-dom';
// import LogoPL from '../../assets/images/PL.webp'; // Old logo
import AnimatedLetters from '../AnimatedLetters';
import './index.scss';

const Home = () => {
    const [letterClass, setLetterClass] = useState('text-animate');
    const nameArray = "Welcome to".split("");
    const jobArray = "EPL".split("");
    const playerRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);

    useEffect(() => {
        const timerId = setTimeout(() => {
          setLetterClass('text-animate-hover');
        }, 4000);
      
        return () => {
          clearTimeout(timerId);
        };
      }, []);

    // YouTube Player API setup
    useEffect(() => {
        // Load the Iframe Player API code asynchronously.
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // This function creates an <iframe> (and YouTube player)
        // after the API code downloads.
        window.onYouTubeIframeAPIReady = () => {
            playerRef.current = new window.YT.Player('background-video', {
                events: {
                    'onReady': onPlayerReady,
                }
            });
        };

        return () => {
            // Clean up the global function and player
            delete window.onYouTubeIframeAPIReady;
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
            }
        };
    }, []);

    const onPlayerReady = (event) => {
        // Video starts muted due to URL params.
        // Autoplay is also handled by URL params.
        // We can call playVideo() to be certain, especially if any future changes might affect autoplay.
        event.target.playVideo();
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };

    return(
      <>
        <iframe 
          id="background-video"
          src="https://www.youtube.com/embed/wz1r_VJaJZw?autoplay=1&mute=1&loop=1&playlist=wz1r_VJaJZw&enablejsapi=1" 
          frameBorder="0" 
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="background video"
        ></iframe>
        <div className = "container home-page">
            <div className="text-zone">
                <h1>
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/280px-Premier_League_Logo.svg.png" alt = "EPL Logo" />
                <br />
                <AnimatedLetters letterClass={letterClass} strArray={nameArray} idx={12} />
                <br /> 
                <AnimatedLetters letterClass={letterClass} strArray={jobArray} idx={15} /> 
                </h1>
                <h2>Your home for everything Premier League related!</h2>
                <Link to="/teams" className="flat-button">GET STARTED</Link>
                <button onClick={toggleMute} className="mute-button">
                    {isMuted ? 'Sound On' : 'Sound Off'}
                </button>
            </div>
        </div>
        <Loader type="pacman" />
      </>
    )
}

export default Home
