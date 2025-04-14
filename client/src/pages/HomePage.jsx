// src/pages/HomePage.jsx
import React, { useEffect } from 'react'; // Bỏ useState nếu không dùng logout ở đây
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    // Không cần div bao ngoài .home-page-container nữa vì đã có .main-content từ layout
    // Chỉ render nội dung chính của trang
    <> {/* Hoặc dùng div với class="page-content" nếu đã định nghĩa */}
      <h1>Welcome to Home Page</h1>
      <p>This is the main content area.</p>
      <p>It will be displayed next to the sidebar on desktop and above the bottom bar on mobile.</p>
      {/* Nút logout đã chuyển vào Navigation */}
    </>
  );
};

export default HomePage;