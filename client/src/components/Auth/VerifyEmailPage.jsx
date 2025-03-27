import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import './AuthCommon.scss'; // Sử dụng SCSS chung

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Đang xác thực email của bạn...');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (!token) {
      setMessage('Liên kết xác thực không hợp lệ hoặc bị thiếu.');
      setVerificationStatus('error');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`http://localhost:8080/auth/verify-email?token=${token}`, {
          method: 'GET', // Hoặc POST tùy thuộc vào backend của bạn, nhưng GET thường hợp lý hơn cho link
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setMessage(data.message || 'Xác thực email thành công!');
          setVerificationStatus('success');
          // Tùy chọn: Tự động chuyển hướng đến trang đăng nhập sau vài giây
          setTimeout(() => navigate('/auth'), 3000);
        } else {
          setMessage(data.error || 'Xác thực email thất bại. Liên kết có thể đã hết hạn hoặc không hợp lệ.');
          setVerificationStatus('error');
        }
      } catch (error) {
        console.error('Lỗi khi xác thực email:', error);
        setMessage('Lỗi kết nối khi cố gắng xác thực email.');
        setVerificationStatus('error');
      }
    };

    verifyToken();
  }, [location.search, navigate]); // Dependency là location.search và navigate

  return (
    <div className="auth-page-container">
      <div className="auth-form-simple">
        <h2>Email Verification</h2>
        <div className={`verification-status ${verificationStatus}`}>
          {verificationStatus === 'verifying' && (
            <div className="spinner"></div> // Thêm spinner CSS nếu muốn
          )}
          <p>{message}</p>
        </div>

        {/* Chỉ hiển thị link đăng nhập khi thành công hoặc lỗi */}
        {(verificationStatus === 'success' || verificationStatus === 'error') && (
          <div className="auth-link">
            <Link to="/auth">Đi đến trang Đăng nhập</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;