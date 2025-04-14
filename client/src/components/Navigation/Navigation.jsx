// src/components/Navigation/Navigation.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Thêm useLocation
import { logoutApi } from '../../api/auth';
import './Navigation.scss';
// import logoImage from '../../assets/logo.png'; // Import logo của bạn

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Lấy location để xác định active link
  // Xác định active link dựa trên pathname hiện tại
  const [activeLink, setActiveLink] = useState(location.pathname === '/' ? 'home' : location.pathname.substring(1));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    // ... (Giữ nguyên hàm logout) ...
    setIsLoggingOut(true);
    try {
      await logoutApi();
      localStorage.removeItem('access_token');
      navigate('/auth');
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.removeItem('access_token');
      navigate('/auth');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Cập nhật lại navItems với đúng path và icon class
  const navItems = [
    { name: 'home', iconClass: 'fas fa-home', path: '/' }, // Đổi path thành /home nếu đó là trang chủ chính
    { name: 'chat', iconClass: 'fas fa-comments', path: '/chat' },
    { name: 'notifications', iconClass: 'fas fa-bell', path: '/notifications' },
    { name: 'settings', iconClass: 'fas fa-cog', path: '/settings' },
  ];

  // Cập nhật active link khi location thay đổi
  React.useEffect(() => {
       const currentPath = location.pathname === '/' ? 'home' : location.pathname.substring(1).split('/')[0]; // Lấy phần đầu của path
       setActiveLink(currentPath);
  }, [location.pathname]);


  return (
    <nav className="navigation-container">
      {/* --- PHẦN LOGO MỚI --- */}
      <div className="nav-logo">
        {/* Thay bằng logo thực tế */}
        {/* <img src={logoImage} alt="App Logo" /> */}
         <i className="fas fa-atom fa-2x"></i> {/* Ví dụ dùng icon */}
      </div>
      {/* -------------------- */}

      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.name} className={activeLink === item.name ? 'active' : ''}>
            {/* Sử dụng Link để điều hướng */}
            <Link to={item.path} className="nav-link">
              <i className={item.iconClass}></i>
              <span className="nav-text">{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav-logout">
        <button onClick={handleLogout} disabled={isLoggingOut} className="logout-button">
          <i className="fas fa-sign-out-alt"></i>
          <span className="nav-text">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;