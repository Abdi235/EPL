import './index.scss'; 
import Sidebar from '../Sidebar'
import BackgroundAnthems from '../BackgroundAnthems'
import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'

/** Dark tint over photos — keep text readable while letting imagery show through clearly */
const BG_OVERLAY =
    'linear-gradient(rgba(6, 12, 24, 0.38), rgba(3, 8, 18, 0.55))'

const STADIUM_BACKGROUNDS = [
    '/stadiums/stadium-1.png',
    '/stadiums/stadium-2.png',
    '/stadiums/stadium-4.png',
    '/stadiums/stadium-5.png',
    '/stadiums/stadium-6.png',
    '/Background/download.jpg',
    '/Background/images.jpg',
    '/Background/images (1).jpg',
    '/Background/download (1).jpg',
    '/Background/download (2).jpg',
    '/Background/download (3).jpg',
    '/Background/download (4).jpg',
    '/Background/download (5).jpg',
    '/Background/download (6).jpg',
    '/Background/download (7).jpg',
    '/Background/download (8).jpg',
    '/Background/st-james-park.jpg',
]

const Layout = () => { 
    const [backgroundIndex, setBackgroundIndex] = useState(0)
    const [previousIndex, setPreviousIndex] = useState(null)
    const [isFading, setIsFading] = useState(false)

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setPreviousIndex(backgroundIndex)
            setBackgroundIndex((prev) => (prev + 1) % STADIUM_BACKGROUNDS.length)
            setIsFading(true)
        }, 12000)

        return () => window.clearInterval(intervalId)
    }, [backgroundIndex])

    useEffect(() => {
        if (!isFading) return undefined
        const fadeTimer = window.setTimeout(() => {
            setIsFading(false)
            setPreviousIndex(null)
        }, 1200)
        return () => window.clearTimeout(fadeTimer)
    }, [isFading])

    return(
        <div className = "App">
            {previousIndex !== null && (
                <div
                    className="stadium-background"
                    style={{ backgroundImage: `${BG_OVERLAY}, url(${encodeURI(STADIUM_BACKGROUNDS[previousIndex])})` }}
                    aria-hidden="true"
                />
            )}
            <div
                className={`stadium-background stadium-background--current ${isFading ? 'is-fading-in' : ''}`}
                style={{ backgroundImage: `${BG_OVERLAY}, url(${encodeURI(STADIUM_BACKGROUNDS[backgroundIndex])})` }}
                aria-hidden="true"
            />
            <Sidebar />
            <div className = "page">
                <Outlet />
            </div>
            <BackgroundAnthems />
        </div>
    ) 
}

export default Layout