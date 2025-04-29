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
      const data = await forgotPasswordApi( email );
      // -------------------
      setMessage('If the email exists, a password reset link has been sent. Check your mail!');
      setMessageType('success');
    } catch (error) { // --- Lỗi đã được ném từ hàm API ---
      console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error);
      setMessage(error.message || 'Request failed. Please try again.');
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
        <p>Enter your email to receive a password reset link.</p>
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
            {isLoading ? "Sending..." : "Send Link"}
          </button>
          <div className="auth-link">
            <Link to="/auth">Back to Login Page</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;