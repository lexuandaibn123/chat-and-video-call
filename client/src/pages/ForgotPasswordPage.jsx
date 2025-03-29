// src/components/Auth/ForgotPasswordPage.jsx (Hoặc src/pages/ForgotPasswordPage.jsx)
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// import './AuthCommon.scss';
// --- IMPORT API FUNCTION ---
import { forgotPasswordApi } from '../api/auth'; // Điều chỉnh đường dẫn

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setIsLoading(true);

    try {
      // --- GỌI HÀM API ---
      const data = await forgotPasswordApi({ email });
      // -------------------
      setMessage(data.message || 'Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi.');
      setMessageType('success');
      setEmail('');
    } catch (error) { // --- Lỗi đã được ném từ hàm API ---
      console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error);
      setMessage(error.message || 'Yêu cầu thất bại. Vui lòng thử lại.');
      setMessageType('error');
      // --------------------------------------
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX return giữ nguyên ---
  return (
    <div className="auth-page-container">
      <div className="auth-form-simple">
        <h2>Forgot Password</h2>
        <p>Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {message && (
            <p className={`auth-message ${messageType}`}>{message}</p>
          )}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Đang gửi...' : 'Gửi liên kết'}
          </button>
          <div className="auth-link">
            <Link to="/auth">Quay lại Đăng nhập</Link> {/* Đảm bảo link đúng */}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;