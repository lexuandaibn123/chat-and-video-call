// src/layouts/MainLayout.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation/Navigation';
import { infoApi } from '../api/auth'; // Import infoApi
import './MainLayout.scss';

const MainLayout = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true); // Bắt đầu với trạng thái loading

  // useEffect 1: Kiểm tra xác thực khi component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication status...");
        const data = await infoApi(); // Gọi API /auth/info

        // Backend trả về { success: true, userInfo: {...} } hoặc lỗi (ví dụ 401)
        if (data && data.userInfo) {
          console.log("User is authenticated:", data.userInfo);
          setUserInfo(data.userInfo); // Lưu thông tin người dùng
        } else {
           // Trường hợp API trả về 200 nhưng userInfo là null/undefined (ít xảy ra)
           console.log("Authentication check failed: No user info received.");
           setUserInfo(null);
        }
      } catch (error) {
        // infoApi sẽ ném lỗi nếu status không phải 2xx (ví dụ: 401 Unauthorized)
        console.error('Authentication check failed:', error);
        setUserInfo(null); // Set userInfo về null khi xác thực thất bại
      } finally {
        setLoading(false); // Dù thành công hay thất bại, đều dừng trạng thái loading
      }
    };

    checkAuth();

  }, []); // Dependency array rỗng: effect chỉ chạy một lần khi component mount

  // useEffect 2: Thực hiện điều hướng sau khi loading hoàn tất
  useEffect(() => {
      // Chỉ điều hướng khi loading đã xong VÀ người dùng chưa được xác thực
      if (!loading && !userInfo) {
          console.log("User not authenticated after check, redirecting to /auth");
          navigate('/auth'); // <--- Gọi navigate ở đây, trong useEffect
      }
  }, [loading, userInfo, navigate]); // Chạy lại khi loading hoặc userInfo thay đổi


  // --- Logic Render dựa trên trạng thái loading và userInfo ---

  // Nếu đang kiểm tra xác thực, hiển thị loading
  if (loading) {
    return <div>Loading user data...</div>; // Hoặc spinner
  }

  // Nếu không loading VÀ userInfo là null, component sẽ không render nội dung protected
  // mà thay vào đó, useEffect thứ 2 sẽ kích hoạt navigate.
  // Chúng ta có thể trả về null ở đây để tránh hiển thị nội dung trong một khoảnh khắc ngắn
  // trước khi navigate kịp thời.
  if (!userInfo) {
      // useEffect sẽ xử lý việc điều hướng.
      // Trả về null để không hiển thị nội dung gì trong lúc chờ navigate.
      return null;
  }

  // Nếu không loading VÀ userInfo có giá trị (đã xác thực)
  // Render layout chính
  console.log("User authenticated, rendering MainLayout.");
  return (
    <div className="main-layout-container">
      {/* Truyền userInfo xuống Navigation nếu cần */}
      <Navigation userInfo={userInfo} />
      <main className="main-content">
        <Outlet /> {/* Nơi các component trang con sẽ được render */}
      </main>
    </div>
  );
};

export default MainLayout;