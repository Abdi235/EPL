import './index.scss'
import { Link, NavLink } from "react-router-dom"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faSearch, faTshirt, faBars, faClose, faUsers, faFlag, faBolt, faTable, faList } from '@fortawesome/free-solid-svg-icons'
import LogoPL from '../../assets/images/PL.webp'
import LogoSubtitle from '../../assets/images/sub-logo.png'
import { useState } from 'react'

const Sidebar = () => {
    const [showNav, setShowNav] = useState(false)

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
        <div className = 'nav-bar'> 
            <Link className = "logo" to="/"> 
                <img src = {LogoPL} alt="logo" />
                <img className="sub-logo" src = {LogoSubtitle} alt="PremierZone" />
            </Link>
            <nav className={showNav ? 'mobile-show' : ""} aria-label="Primary navigation">
                <NavLink exact="true" activeclassname = "active" to="/" aria-label="Home">
                    <FontAwesomeIcon icon = {faHome}  onClick={handleTopicClick} />
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "teams-link" to="/teams" aria-label="Teams">
                    <FontAwesomeIcon icon = {faUsers} onClick={handleTopicClick}/>
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "nation-link" to="/nation" aria-label="Nation">
                    <FontAwesomeIcon icon = {faFlag} onClick={handleTopicClick} />
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "position-link" to="/position" aria-label="Position">
                    <FontAwesomeIcon icon = {faTshirt}  onClick={handleTopicClick}/>
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "search-link" to="/search" aria-label="Search">
                    <FontAwesomeIcon icon = {faSearch} onClick={handleTopicClick} />
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "live-link" to="/live" aria-label="Live">
                    <FontAwesomeIcon icon = {faBolt} onClick={handleTopicClick} />
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "results-link" to="/results" aria-label="Results">
                    <FontAwesomeIcon icon = {faList} onClick={handleTopicClick} />
                </NavLink>
                <NavLink exact="true" activeclassname = "active" className = "standings-link" to="/standings" aria-label="Table">
                    <FontAwesomeIcon icon = {faTable} onClick={handleTopicClick} />
                </NavLink>
                <FontAwesomeIcon icon = {faClose} size = "3x" className="close-icon" onClick={() => setShowNav(false)} />
            </nav>
            <FontAwesomeIcon onClick={() => setShowNav(true)} icon={faBars} color="#ffd700" size="3x" className="hamburger-icon" />
        </div>
    )
}

export default Sidebar 
