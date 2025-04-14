// src/layouts/MainLayout.jsx
import React, { useEffect } from 'react'; // Thêm useEffect nếu cần kiểm tra auth ở đây
import { useNavigate, Outlet } from 'react-router-dom'; // Import Outlet
import Navigation from '../components/Navigation/Navigation'; // Import Navigation
import './MainLayout.scss';

const MainLayout = () => {
  const navigate = useNavigate();

  // --- Có thể thêm logic kiểm tra xác thực ở đây ---
  // Nếu dùng Context API thì sẽ lấy từ context, nếu không thì kiểm tra localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      console.log("No access token found in MainLayout, redirecting to auth.");
      navigate('/auth');
    }
  }, [navigate]);
  // -------------------------------------------------

  // Kiểm tra lại lần nữa trước khi render để tránh flash nội dung
  const accessToken = localStorage.getItem('access_token');
   if (!accessToken) {
      return null; // Hoặc một trang loading toàn màn hình
   }

  return (
    <div className="main-layout-container">
      <Navigation /> {/* <<<--- NAVIGATION ĐƯỢC RENDER Ở ĐÂY */}
      <main className="main-content">
        <Outlet /> {/* <<<--- NƠI CÁC COMPONENT TRANG CON SẼ ĐƯỢC RENDER */}
      </main>
    </div>
  );
};

export default MainLayout;