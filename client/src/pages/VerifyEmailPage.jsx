import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
// import './AuthCommon.scss';
// --- IMPORT API FUNCTION ---
import { verifyEmailApi } from '../api/auth'; // Điều chỉnh đường dẫn

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    if (!token) {
      setMessage('The verification link is invalid or missing.');
      setVerificationStatus('error');
      return;
    }

    const verifyToken = async () => {
      try {
        // --- GỌI HÀM API ---
        const data = await verifyEmailApi(token);
        // -------------------

        setMessage(data.message || 'Email verification successful!');
        setVerificationStatus('success');
        setTimeout(() => navigate('/auth'), 3000); // Chuyển hướng sau thành công

      } catch (error) { // --- Lỗi đã được ném từ hàm API ---
        console.error('Lỗi khi xác thực email:', error);
        setMessage(error.message || 'Email verification failed.');
        setVerificationStatus('error');
        // --------------------------------------
      }
    };

    verifyToken();
  }, [location.search, navigate]);

  // --- JSX return giữ nguyên như code trước của bạn ---
  return (
    <div className="auth-page-container">
      <div className="auth-form-simple">
        <h2>Email Verification</h2>
        <div className={`verification-status ${verificationStatus}`}>
          {verificationStatus === 'verifying' && (
            <div className="spinner"></div>
          )}
          <p>{message}</p>
        </div>
        {(verificationStatus === 'success' || verificationStatus === 'error') && (
          <div className="auth-link">
            <Link to="/auth">Go to Login Page</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;