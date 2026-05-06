import './index.scss'
import { Link, NavLink } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faSearch, faTshirt, faBars, faClose, faUsers, faFlag, faBolt, faList, faTable, faChartBar } from '@fortawesome/free-solid-svg-icons'
import epLogo from '../../assets/images/EPLOGO.png'
import { useEffect, useState } from 'react'

const navLinkClass =
    (extra) =>
    ({ isActive }) =>
        [extra, isActive ? 'active' : ''].filter(Boolean).join(' ')

const Sidebar = () => {
    const [showNav, setShowNav] = useState(false)

    useEffect(() => {
        if (!showNav) return undefined
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [showNav])

    const playTopicSwitchSound = () => {
        if (document.hidden) return
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return

        const ctx = new AudioCtx()
        const now = ctx.currentTime

        const oscillator = ctx.createOscillator()
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(180, now)
        oscillator.frequency.exponentialRampToValueAtTime(92, now + 0.08)

        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.07, ctx.sampleRate)
        const channelData = noiseBuffer.getChannelData(0)
        for (let i = 0; i < channelData.length; i += 1) {
            channelData[i] = (Math.random() * 2 - 1) * 0.35
        }
        const noiseSource = ctx.createBufferSource()
        noiseSource.buffer = noiseBuffer

        const bandPass = ctx.createBiquadFilter()
        bandPass.type = 'bandpass'
        bandPass.frequency.value = 900
        bandPass.Q.value = 0.7

        const gainNode = ctx.createGain()
        gainNode.gain.setValueAtTime(0.0001, now)
        gainNode.gain.exponentialRampToValueAtTime(0.018, now + 0.012)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

        oscillator.connect(gainNode)
        noiseSource.connect(bandPass)
        bandPass.connect(gainNode)
        gainNode.connect(ctx.destination)

        oscillator.start(now)
        noiseSource.start(now)
        noiseSource.stop(now + 0.07)
        oscillator.stop(now + 0.09)

        window.setTimeout(() => {
            ctx.close().catch(() => {})
        }, 220)
    }

    const handleTopicClick = () => {
        setShowNav(false)
        playTopicSwitchSound()
    }

    return(
        <header className='nav-bar'>
            <Link className="logo" to="/" onClick={() => setShowNav(false)}>
                <img src={epLogo} alt="" aria-hidden="true" />
                <span className="logo-wordmark">PremierZone</span>
            </Link>
            <nav
                id="primary-navigation"
                className={showNav ? 'mobile-show' : ''}
                aria-label="Primary navigation"
            >
                <button type="button" className="close-icon" aria-label="Close menu" onClick={() => setShowNav(false)}>
                    <FontAwesomeIcon icon={faClose} />
                </button>
                <NavLink end className={navLinkClass('')} to="/" aria-label="Home" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faHome} />
                </NavLink>
                <NavLink className={navLinkClass('teams-link')} to="/teams" aria-label="Teams" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faUsers} />
                </NavLink>
                <NavLink className={navLinkClass('nation-link')} to="/nation" aria-label="Nation" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faFlag} />
                </NavLink>
                <NavLink className={navLinkClass('position-link')} to="/position" aria-label="Position" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faTshirt} />
                </NavLink>
                <NavLink className={navLinkClass('search-link')} to="/search" aria-label="Search" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faSearch} />
                </NavLink>
                <NavLink className={navLinkClass('live-link')} to="/live" aria-label="Live" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faBolt} />
                </NavLink>
                <NavLink className={navLinkClass('results-link')} to="/results" aria-label="Results" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faList} />
                </NavLink>
                <NavLink className={navLinkClass('standings-link')} to="/standings" aria-label="Table" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faTable} />
                </NavLink>
                <NavLink className={navLinkClass('stats-link')} to="/stats" aria-label="Stats" onClick={handleTopicClick}>
                    <FontAwesomeIcon icon={faChartBar} />
                </NavLink>
            </nav>
            <button
                type="button"
                className="hamburger-icon"
                aria-label="Open menu"
                aria-expanded={showNav}
                aria-controls="primary-navigation"
                onClick={() => setShowNav(true)}
            >
                <FontAwesomeIcon icon={faBars} />
            </button>
        </header>
    )
}

export default Sidebar 
