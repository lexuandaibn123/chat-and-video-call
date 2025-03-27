import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Sử dụng Link để điều hướng tốt hơn
import './AuthCommon.scss'; // Tạo một file SCSS chung cho các trang Auth

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(data.message || 'Nếu email tồn tại, một liên kết đặt lại mật khẩu đã được gửi.');
        setMessageType('success');
        setEmail(''); // Xóa email sau khi gửi thành công
      } else {
        setMessage(data.error || 'Yêu cầu thất bại. Vui lòng thử lại.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error);
      setMessage('Lỗi kết nối. Vui lòng thử lại.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container"> {/* Container bao bọc trang */}
      <div className="auth-form-simple">   {/* Style đơn giản hơn cho trang này */}
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
            <Link to="/auth">Quay lại Đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;