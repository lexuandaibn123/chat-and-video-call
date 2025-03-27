import React, { useState, useEffect } from 'react';
// Import thêm useLocation
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './AuthCommon.scss'; // Đảm bảo import file SCSS

const ResetPasswordPage = () => {
  // Sử dụng useLocation
  const location = useLocation();
  const navigate = useNavigate();

  // State để lưu token lấy từ URL
  const [token, setToken] = useState(null);

  // Các state khác giữ nguyên
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // useEffect để lấy token từ query parameter khi component mount
  useEffect(() => {
    // Tạo đối tượng URLSearchParams từ location.search (phần query string)
    const queryParams = new URLSearchParams(location.search);
    // Lấy giá trị của tham số 'token'
    const tokenFromUrl = queryParams.get('token');

    if (tokenFromUrl) {
      setToken(tokenFromUrl); // Lưu token vào state
      console.log("Token from URL:", tokenFromUrl);
    } else {
      // Xử lý trường hợp không tìm thấy token
      console.error("No token found in URL query parameters.");
      setMessage('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      setMessageType('error');
      // Có thể thêm logic chuyển hướng sau vài giây nếu muốn
      // setTimeout(() => navigate('/forgot-password'), 3000);
    }
  }, [location.search]); // Dependency là location.search để chạy lại nếu URL thay đổi

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else if (field === 'confirmPassword') {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setConfirmPasswordError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setConfirmPasswordError('Mật khẩu và xác nhận mật khẩu không khớp.');
      setIsLoading(false);
      return;
    }

    // --- KIỂM TRA TOKEN TRONG STATE ---
    if (!token) {
      setMessage('Token đặt lại mật khẩu không hợp lệ hoặc không tìm thấy.');
      setMessageType('error');
      setIsLoading(false);
      return;
    }
    // ---------------------------------

    try {
      const response = await fetch('http://localhost:8080/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // --- SỬ DỤNG TOKEN TỪ STATE ---
        body: JSON.stringify({ token, password }),
        // ---------------------------
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(data.message || 'Đặt lại mật khẩu thành công!');
        setMessageType('success');
        // Chuyển hướng về trang đăng nhập sau vài giây
        setTimeout(() => navigate('/auth'), 3000);
      } else {
        setMessage(data.error || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Lỗi khi đặt lại mật khẩu:', error);
      setMessage('Lỗi kết nối. Vui lòng thử lại.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Hiển thị thông báo lỗi/loading nếu chưa có token
  if (!token && !message) {
    return (
       <div className="auth-page-container">
           <div className="auth-form-simple">
              {/* Có thể hiển thị spinner hoặc thông báo khác */}
              <p className="auth-message error">Đang kiểm tra liên kết...</p>
           </div>
       </div>
    )
 }

  return (
    <div className="auth-page-container">
      <div className="auth-form-simple">
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="password-container">
             <div className="password-input-group">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6} // Thêm validation cơ bản
                />
                <span className="toggle-password" onClick={() => togglePasswordVisibility('password')}>
                    {showPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
                </span>
             </div>
          </div>
          <div className="password-container">
             <div className="password-input-group">
                <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={confirmPasswordError ? 'error-input' : ''}
                    required
                />
                <span className="toggle-password" onClick={() => togglePasswordVisibility('confirmPassword')}>
                    {showConfirmPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
                </span>
            </div>
             {confirmPasswordError && <p className="input-error">{confirmPasswordError}</p>}
          </div>

          {message && (
            <p className={`auth-message ${messageType}`}>{message}</p>
          )}
          <button type="submit" disabled={isLoading || (messageType === 'success')}>
            {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
           <div className="auth-link">
             {/* Chỉ hiển thị link quay lại nếu chưa thành công */}
             {messageType !== 'success' && <Link to="/auth">Quay lại Đăng nhập</Link>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;