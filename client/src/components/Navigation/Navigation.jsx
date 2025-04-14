// src/components/Navigation/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logoutApi } from '../../api/auth';
import './Navigation.scss';

// --- BỎ IMPORT FONT AWESOME ---
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import {
//   faHome,
//   faComments,
//   faBell,
//   faCog,
//   faSignOutAlt
// } from '@fortawesome/free-solid-svg-icons';
// -----------------------------

// --- Import ảnh avatar mẫu hoặc lấy từ state/props ---
import avatarPlaceholder from '../../assets/images/avatar_placeholder.jpg'; // Thay bằng đường dẫn đúng

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeLink, setActiveLink] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const currentUser = {
    // Sử dụng placeholder trực tiếp
    avatar: avatarPlaceholder
  };

  const handleLogout = async () => {
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
  };

  // --- CẬP NHẬT LẠI navItems VỚI iconClass ---
  const navItems = [
    { name: 'home', iconClass: 'fas fa-home', path: '/' }, // <<< Sử dụng class CSS
    { name: 'chat', iconClass: 'fas fa-comments', path: '/chat' }, // <<< Sử dụng class CSS
    { name: 'notifications', iconClass: 'fas fa-bell', path: '/notifications' }, // <<< Sử dụng class CSS
    { name: 'settings', iconClass: 'fas fa-cog', path: '/settings' }, // <<< Sử dụng class CSS
  ];
  // -----------------------------------------

  useEffect(() => {
    const currentBaseRoute = location.pathname === '/' ? 'home' : location.pathname.substring(1).split('/')[0];
    setActiveLink(currentBaseRoute);
  }, [location.pathname]);


  return (
    <nav className="navigation-container modern-sidebar">

      <div className="nav-avatar">
        <img
          src={currentUser.avatar} // Sử dụng trực tiếp từ currentUser đã sửa
          alt="User Avatar"
          className="avatar-image"
        />
      </div>

      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.name} className={activeLink === item.name ? 'active' : ''}>
            <Link to={item.path} className="nav-link" title={item.name.charAt(0).toUpperCase() + item.name.slice(1)}>
              {/* --- ĐỔI LẠI THÀNH THẺ <i> --- */}
              <i className={`${item.iconClass} nav-icon`}></i> {/* <<< Thêm class nav-icon */}
              {/* --------------------------- */}
            </Link>
          </li>
        ))}
      </ul>

      <ul className="nav-list logout-section">
         <li className="nav-logout-item">
           <button onClick={handleLogout} disabled={isLoggingOut} className="logout-button" title="Logout">
             {/* --- ĐỔI LẠI THÀNH THẺ <i> --- */}
             <i className="fas fa-sign-out-alt nav-icon"></i> {/* <<< Thêm class nav-icon */}
             {/* --------------------------- */}
           </button>
         </li>
       </ul>
    </nav>
  );
};

export default Navigation;