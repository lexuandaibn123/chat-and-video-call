import React, { useState } from 'react';
import './ForgotPasswordPopup.scss'; // Tạo file SCSS riêng cho popup này

const ForgotPasswordPopup = ({ onClose }) => {
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

      const data = await response.json(); // Luôn cố gắng parse JSON

      if (response.ok) {
        // Giả sử API trả về success: true hoặc chỉ cần status 200 là thành công
        // (API doc không mô tả response thành công, nên ta giả định)
        setMessage(data.message || 'Nếu email tồn tại, một mật khẩu tạm thời đã được gửi.');
        setMessageType('success');
        setEmail(''); // Xóa email sau khi gửi thành công
      } else {
        // Xử lý lỗi từ server (4xx, 5xx)
        setMessage(data.error || 'Yêu cầu thất bại. Vui lòng thử lại.');
        setMessageType('error');
      }
    } catch (error) {
      // Xử lý lỗi mạng hoặc lỗi khác
      console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error);
      setMessage('Lỗi kết nối. Vui lòng thử lại.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}> {/* Overlay để đóng khi click bên ngoài */}
      <div className="popup-content" onClick={(e) => e.stopPropagation()}> {/* Ngăn đóng khi click vào content */}
        <h2>Forgot Password</h2>
        <p>Nhập email của bạn để nhận mật khẩu tạm thời.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {message && (
            <p className={`popup-message ${messageType}`}>{message}</p>
          )}
          <div className="popup-buttons">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button type="button" onClick={onClose} className="close-button">
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPopup;