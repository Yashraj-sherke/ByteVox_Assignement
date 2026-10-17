import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const authPage = pathname === '/login';
  return <>
    <nav className="navbar no-print" aria-label="Main navigation">
      <Link to="/" className="nav-brand" aria-label="ReportCraft home"><BrandLogo/></Link>
      {!authPage && <span className="topbar-location">Workspace <span>/</span> {pathname.startsWith('/report') ? 'Report editor' : pathname.startsWith('/dataset') ? 'Dataset profile' : 'Overview'}</span>}
      <div className="nav-links"><ThemeToggle/>{user && !authPage ? <><span className="user-identity"><span className="avatar">{user.email.charAt(0).toUpperCase()}</span><span>{user.email}</span></span><button onClick={()=>{logout();navigate('/login');}} className="btn btn-secondary btn-sm">Sign out</button></> : <span className="nav-caption">A clearer perspective on your data.</span>}</div>
    </nav>
    {!authPage && user && <aside className="sidebar no-print"><div className="workspace-switch"><span className="workspace-avatar">P</span><div><strong>Personal workspace</strong><small>Your analytics studio</small></div></div><span className="sidebar-label">WORKSPACE</span><nav aria-label="Workspace sections"><Link className={pathname==='/' && !hash ? 'active' : ''} to="/"><Icon size={18}/>Overview</Link><Link className={hash==='#reports'||pathname.startsWith('/report') ? 'active' : ''} to="/#reports"><Icon name="chart" size={18}/>Reports</Link><Link className={hash==='#datasets'||pathname.startsWith('/dataset') ? 'active' : ''} to="/#datasets"><Icon name="file" size={18}/>Data sources</Link></nav><div className="sidebar-bottom"><div className="workspace-support"><Icon name="link" size={16}/><span>Traceable reporting<small>Inspect the source of every result.</small></span></div><span className="sidebar-version">REPORTCRAFT <span>V1.0</span></span></div></aside>}
  </>;
}
