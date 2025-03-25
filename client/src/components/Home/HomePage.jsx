import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate(); // Hook để chuyển hướng trang

  useEffect(() => {
    // Kiểm tra xem access token có tồn tại trong localStorage không
    const accessToken = localStorage.getItem('access_token');

    // Nếu không có access token, chuyển hướng người dùng đến trang đăng nhập
    if (!accessToken) {
      navigate('/'); // Sử dụng navigate để chuyển hướng trang
    }
  }, [navigate]); // useEffect chỉ chạy một lần khi component mount

  // Nếu có access token, hiển thị nội dung trang home
  return (
    <div>
      <h1>Home</h1>
      <p>Welcome to your homepage!</p>
      <button onClick={() => {
        localStorage.removeItem('access_token');
        navigate('/'); // Sử dụng navigate để chuyển hướng trang
      }}>Logout</button>
    </div>
  );
};

export default Home;