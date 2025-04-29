// src/pages/HomePage.jsx
import React, { useEffect } from 'react'; // Bỏ useState nếu không dùng logout ở đây
// import { useNavigate } from 'react-router-dom';
import FriendList from '../components/HomePage/FriendList';

const HomePage = () => {
  // const navigate = useNavigate();

  return (
    // Không cần div bao ngoài .home-page-container nữa vì đã có .main-content từ layout
    // Chỉ render nội dung chính của trang
    <FriendList /> // Gọi component FriendList để hiển thị danh sách bạn bè
  );
};

export default HomePage;