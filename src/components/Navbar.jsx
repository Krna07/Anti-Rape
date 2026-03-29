import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <nav className="navbar">
      <div className="brand">ANTI<span>-R</span></div>
      <div className="nav-links">
        {user?.role === 'admin' ? (
          <NavLink to="/admin/kyc" className={link}>KYC Review</NavLink>
        ) : (
          <>
            <NavLink to="/"            className={link}>Dashboard</NavLink>
            <NavLink to="/alerts"      className={link}>Alerts</NavLink>
            <NavLink to="/leaderboard" className={link}>Leaderboard</NavLink>
            <NavLink to="/profile"     className={link}>Profile</NavLink>
          </>
        )}
        <button className="btn btn-ghost" style={{padding:'5px 12px',fontSize:13}}
          onClick={() => { logout(); nav('/auth'); }}>Logout</button>
      </div>
    </nav>
  );
}
