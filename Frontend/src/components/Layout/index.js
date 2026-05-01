import './index.scss'; 
import Sidebar from '../Sidebar'
import BackgroundAnthems from '../BackgroundAnthems'
import { Outlet } from 'react-router-dom'

const Layout = () => { 
    return(
        <div className = "App">
            <Sidebar />
            <div className = "page">
                <Outlet />
            </div>
            <BackgroundAnthems />
        </div>
    ) 
}

export default Layout