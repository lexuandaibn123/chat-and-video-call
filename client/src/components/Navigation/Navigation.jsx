import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logoutApi } from '../../api/auth';
import './Navigation.scss';
import avatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';

const Navigation = (userInfo) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLink, setActiveLink] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUser = {
    avatar: avatarPlaceholder
  };

  console.log("userInfo: ", userInfo);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Do you really want to log out?");
    if (confirmLogout) {
        setIsLoggingOut(true);
        try {
            await logoutApi();
        } catch (error) {
            console.error("Logout API failed:", error);
        } finally {
            localStorage.removeItem('access_token');
            setIsLoggingOut(false);
            navigate('/auth', { replace: true });
        }
    }
  };

  const navItems = [
    { name: 'home', iconClass: 'fas fa-home', path: '/' },
    { name: 'chat', iconClass: 'fas fa-comments', path: '/chat' },
    { name: 'notifications', iconClass: 'fas fa-bell', path: '/notifications' },
    { name: 'settings', iconClass: 'fas fa-cog', path: '/settings' },
  ];

  useEffect(() => {
    const currentBaseRoute = location.pathname === '/' ? 'home' : location.pathname.substring(1).split('/')[0];
    setActiveLink(currentBaseRoute);
  }, [location.pathname]);

  return (
    <nav className="navigation-container modern-sidebar">
      <div className="nav-avatar">
        <img
          src={currentUser.avatar}
          alt="User Avatar"
          className="avatar-image"
        />
      </div>
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.name} className={activeLink === item.name ? 'active' : ''}>
            <Link to={item.path} className="nav-link" title={item.name.charAt(0).toUpperCase() + item.name.slice(1)}>
              <i className={`${item.iconClass} nav-icon`}></i>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="nav-list logout-section">
        <li className="nav-logout-item">
          <button onClick={handleLogout} disabled={isLoggingOut} className="logout-button" title="Logout">
            <i className="fas fa-sign-out-alt nav-icon"></i>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;