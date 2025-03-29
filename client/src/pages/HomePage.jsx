import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// --- IMPORT API FUNCTION ---
import { logoutApi } from '../api/auth'; // Điều chỉnh đường dẫn

const Home = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      // --- GỌI HÀM API ---
      await logoutApi();
      // -------------------
      console.log('Logout successful on server');
      // Các bước logout client sẽ nằm trong finally
    } catch (error) { // --- Lỗi đã được ném từ hàm API ---
      console.error('Server logout error:', error);
      setLogoutError(error.message || 'Logout failed on server.');
      // Dù lỗi server, vẫn logout client trong finally
      // --------------------------------------
    } finally {
      // Luôn logout client
      localStorage.removeItem('access_token');
      setIsLoggingOut(false);
      navigate('/auth');
    }
  };

  // Kiểm tra token trước khi render
  const accessToken = localStorage.getItem('access_token');
   if (!accessToken && !isLoggingOut) {
      return null;
   }

  // --- JSX return giữ nguyên như code trước của bạn ---
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Home</h1>
      <p>Welcome to your homepage!</p>
      {logoutError && <p style={{ color: 'red' }}>{logoutError}</p>}
      <button onClick={handleLogout} disabled={isLoggingOut} style={buttonStyle}>
        {isLoggingOut ? 'Logging Out...' : 'Logout'}
      </button>
    </div>
  );
};

// --- Style giữ nguyên ---
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