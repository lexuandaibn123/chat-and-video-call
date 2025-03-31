import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import PopupNotification from '../components/Common/PopupNotification/PopupNotification'; // Để hiển thị thông báo gửi lại
import { resendVerificationEmailApi } from '../api/auth'; // Import API gửi lại
import '../components/Auth/AuthCommon.scss'; // Sử dụng style chung

const CheckEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [popupMessage, setPopupMessage] = useState(''); // Dùng popup cho kết quả resend
  const [popupType, setPopupType] = useState('');

  useEffect(() => {
    // Lấy email từ state được truyền qua navigate
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      // Nếu không có email (ví dụ: truy cập trực tiếp), chuyển về trang đăng nhập
      console.warn("No email found in location state for CheckEmailPage, redirecting.");
      navigate('/auth');
    }
  }, [location.state, navigate]);

  const handleResendVerification = async () => {
    if (!email) return; // Không làm gì nếu không có email

    setIsResending(true);
    setPopupMessage(''); // Xóa popup cũ

    try {
      const data = await resendVerificationEmailApi({ email });
      setPopupMessage(data.message || 'Verification email has been resent.');
      setPopupType('success');
    } catch (error) {
      console.error('Lỗi gửi lại email:', error);
      setPopupMessage(error.message || 'Resending email failed.');
      setPopupType('error');
    } finally {
      setIsResending(false);
    }
  };

  const closePopup = () => {
    setPopupMessage('');
    setPopupType('');
  };

  // Nếu chưa lấy được email, có thể hiển thị loading hoặc null
  if (!email) {
      return null; // Hoặc một spinner
  }

  return (
    <>
      {/* Popup cho kết quả gửi lại email */}
      {popupMessage && (
        <PopupNotification
          message={popupMessage}
          type={popupType}
          onClose={closePopup}
        />
      )}
      <div className="auth-page-container">
        <div className="auth-form-simple"> {/* Sử dụng style form đơn giản */}
          <h2>Check Your Email</h2>
          <p>
            Registration almost complete! We have sent a verification email to{' '}
            <strong>{email}</strong>.
          </p>
          <p>
            Please check your inbox (and spam folder) and click the link to activate your account.
          </p>
          <div style={{ marginTop: '30px' }}> {/* Thêm khoảng cách */}
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="resend-button-page" // Class riêng cho nút này nếu cần style khác
            >
              {isResending ? "Resending..." : "Resend Verification Email"}
            </button>
          </div>
          <div className="auth-link">
            <Link to="/auth">Back to Login Page</Link>
          </div>
        </div>
      </div>
    </>
  );
};


export default CheckEmailPage;