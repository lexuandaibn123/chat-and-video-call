import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
// import './AuthCommon.scss';
// --- IMPORT API FUNCTION ---
import { resetPasswordApi } from '../api/auth'; // Điều chỉnh đường dẫn nếu cần

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenFromUrl = queryParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      console.log("Token from URL:", tokenFromUrl);
    } else {
      console.error("No token found in URL query parameters.");
      setMessage('The password reset link is invalid or has expired.');
      setMessageType('error');
    }
  }, [location.search]);

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
      setConfirmPasswordError('Password and confirmation password do not match.');
      setIsLoading(false);
      return;
    }
    if (!token) {
      setMessage('The password reset token is invalid or not found.');
      setMessageType('error');
      setIsLoading(false);
      return;
    }

    try {
      const resetData = { token, password };
      // --- GỌI HÀM API ---
      const data = await resetPasswordApi(resetData);
      // -------------------

      setMessage(data.message || 'Password reset successful!');
      setMessageType('success');
      setTimeout(() => navigate('/auth'), 3000); // Chuyển hướng sau thành công

    } catch (error) { // --- Lỗi đã được ném từ hàm API ---
      console.error('Lỗi khi đặt lại mật khẩu:', error);
      setMessage(error.message || 'Password reset failed. Please try again.');
      setMessageType('error');
      // --------------------------------------
    } finally {
      setIsLoading(false);
    }
  };

  // JSX return giữ nguyên như code trước của bạn
  // Chỉ cần đảm bảo gọi đúng handleSubmit
  return (
    <div className="auth-page-container">
      <div className="auth-form-simple">
        <h2>Reset Password</h2>
        {/* Hiển thị lỗi nếu token không hợp lệ ngay từ đầu */}
         {message && !token && messageType === 'error' && (
            <p className={`auth-message ${messageType}`}>{message}</p>
         )}
        <form onSubmit={handleSubmit}>
          <div className="password-container">
             <div className="password-input-group">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={!token || messageType === 'success'} // Disable nếu không có token hoặc đã thành công
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
                    disabled={!token || messageType === 'success'}
                />
                <span className="toggle-password" onClick={() => togglePasswordVisibility('confirmPassword')}>
                    {showConfirmPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
                </span>
            </div>
             {confirmPasswordError && <p className="input-error">{confirmPasswordError}</p>}
          </div>

          {message && token && ( // Chỉ hiển thị message API nếu có token
            <p className={`auth-message ${messageType}`}>{message}</p>
          )}
          <button type="submit" disabled={isLoading || !token || (messageType === 'success')}>
            {isLoading ? "Processing..." : "Reset Password"}
          </button>
           <div className="auth-link">
             {(messageType !== 'success') && <Link to="/auth">Back to Login Page</Link>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;