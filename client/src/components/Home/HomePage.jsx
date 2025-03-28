import React, { useState, useEffect } from 'react'; // Thêm useState
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false); // State cho hiệu ứng loading
  const [logoutError, setLogoutError] = useState(''); // State cho lỗi logout (nếu cần)

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      navigate('/auth');
    }
  }, [navigate]);

  // --- HÀM XỬ LÝ LOGOUT ---
  const handleLogout = async () => {
    setIsLoggingOut(true); // Bắt đầu loading
    setLogoutError(''); // Xóa lỗi cũ

    try {
      // Lấy token từ localStorage để gửi kèm (nếu API yêu cầu)
      // Mặc dù API logout của bạn dùng session, việc gửi token có thể hữu ích
      // nếu bạn có middleware kiểm tra token trên mọi request.
      // Nếu API logout không cần token, bạn có thể bỏ qua phần header Authorization.
      const accessToken = localStorage.getItem('access_token');

      const response = await fetch('http://localhost:8080/auth/logout', {
        method: 'POST', // Backend của bạn dùng POST cho logout theo logic session.destroy
        headers: {
          'Content-Type': 'application/json',
          // Thêm Authorization header nếu API logout cần token
          // 'Authorization': `Bearer ${accessToken}`
        },
        // Body có thể không cần thiết nếu API chỉ dựa vào session
        // body: JSON.stringify({})
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Logout thành công trên server
        console.log('Logout successful on server');
      } else {
        // Có lỗi xảy ra trên server khi logout
        console.error('Server logout error:', data);
        setLogoutError(data.error || 'Logout failed on server.');
        // Dù lỗi server, vẫn tiến hành logout ở client
      }
    } catch (error) {
      // Lỗi kết nối mạng
      console.error('Connection error during logout:', error);
      setLogoutError('Connection error during logout.');
      // Dù lỗi mạng, vẫn tiến hành logout ở client
    } finally {
      // Luôn thực hiện các bước logout ở client dù server có lỗi hay không
      localStorage.removeItem('access_token'); // Xóa token khỏi localStorage
      setIsLoggingOut(false); // Kết thúc loading
      navigate('/auth'); // Chuyển hướng về trang đăng nhập
    }
  };
  // --- KẾT THÚC HÀM XỬ LÝ LOGOUT ---

  // Kiểm tra lại token một lần nữa trước khi render (phòng trường hợp bị xóa)
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken && !isLoggingOut) { // Chỉ render nếu có token hoặc đang logout
      // Có thể return null hoặc một component loading/redirect khác
      return null;
  }


  return (
    <div style={{ padding: '50px', textAlign: 'center' }}> {/* Thêm style ví dụ */}
      <h1>Home</h1>
      <p>Welcome to your homepage!</p>
      {logoutError && <p style={{ color: 'red' }}>{logoutError}</p>} {/* Hiển thị lỗi logout */}
      <button onClick={handleLogout} disabled={isLoggingOut} style={buttonStyle}> {/* Thêm style ví dụ */}
        {isLoggingOut ? 'Logging Out...' : 'Logout'}
      </button>
    </div>
  );
};

// Ví dụ style cho nút (bạn nên đưa vào file CSS/SCSS riêng)
const buttonStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  marginTop: '20px',
};

export default Home;