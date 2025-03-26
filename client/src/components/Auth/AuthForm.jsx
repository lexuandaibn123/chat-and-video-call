import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import PopupNotification from './PopupNotification';
import ForgotPasswordPopup from './ForgotPasswordPopup';
import './AuthForm.scss';

const AuthForm = () => {
  const navigate = useNavigate(); // Khởi tạo useNavigate

  const [isLogin, setIsLogin] = useState(true);
  const [isTransitionActive, setIsTransitionActive] = useState(false);

  // State cho đăng ký
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // State cho hiển thị/ẩn mật khẩu
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // State cho đăng nhập
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // const [errorMessage, setErrorMessage] = useState(''); // Có thể không cần nữa nếu chỉ dùng popup
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // New state for popup
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState(''); // 'success' hoặc 'error'

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setIsTransitionActive(!isTransitionActive);
    setConfirmPasswordError(''); // Reset confirm password error
    setPopupMessage(''); // Đóng popup khi chuyển form
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'registerPassword') {
      setShowRegisterPassword(!showRegisterPassword);
    } else if (field === 'confirmPassword') {
      setShowConfirmPassword(!showConfirmPassword);
    } else if (field === 'loginPassword') {
      setShowLoginPassword(!showLoginPassword)
    }
  };

  const closePopup = () => {
    setPopupMessage('');
    setPopupType('');
  };

  const openForgotPasswordPopup = () => {
    setShowForgotPassword(true);
  };

  const closeForgotPasswordPopup = () => {
    setShowForgotPassword(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    // setErrorMessage(''); // Không cần nữa
    setConfirmPasswordError('');
    setPopupMessage(''); // Reset popup trước khi gọi API

    // Kiểm tra xem mật khẩu và xác nhận mật khẩu có khớp nhau hay không
    if (registerPassword !== registerConfirmPassword) {
      setConfirmPasswordError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    console.log("dang dki")
    try {
      const response = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // username: registerUsername,
          email: registerEmail,
          password: registerPassword,
          confirmPassword: registerConfirmPassword
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) { // Kiểm tra cả response.ok và data.success
        // Đăng ký thành công
        setPopupMessage(data.message || 'Registration successful');
        setPopupType('success');
        console.log('Đăng ký thành công:', data);
        // Không chuyển form ngay, để người dùng thấy popup thành công
        // toggleForm();
        // Có thể reset form đăng ký ở đây nếu muốn
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
      } else {
        // Đăng ký thất bại
        setPopupMessage(data.error || 'Registration failed. Please try again.');
        setPopupType('error');
        console.error('Đăng ký thất bại:', data);
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      setPopupMessage('Connection error. Please try again.');
      setPopupType('error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setPopupMessage('');
    try {
      const response = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Đăng nhập thành công
        console.log('Đăng nhập thành công:', data);
        // Lưu access token vào localStorage hoặc cookie
        localStorage.setItem('access_token', data.access_token);
        // Chuyển hướng người dùng đến trang chính
        window.location.href = '/home';
      } else {
        // Đăng nhập thất bại (Code 400, 404, 500, hoặc success: false)
        console.error('Đăng nhập thất bại:', data);
        let errorMessageToShow = 'Login failed. Please try again.'; // Lỗi mặc định
        if (data.error && Array.isArray(data.error) && data.error.length > 0 && data.error[0].msg) {
          // Nếu có mảng lỗi và có msg trong phần tử đầu tiên
          errorMessageToShow = data.error[0].msg;
        } else if (typeof data.error === 'string') {
          // Nếu data.error là một chuỗi (cho các trường hợp lỗi khác)
          errorMessageToShow = data.error;
        } else if (data.status) {
          // Nếu có data.status (ví dụ: lỗi 404)
          errorMessageToShow = data.status;
        }

        setPopupMessage(errorMessageToShow);
        setPopupType('error');
      }
    } catch (error) {
      // Lỗi kết nối mạng hoặc lỗi không xác định khác
      console.error('Lỗi kết nối:', error);
      setPopupMessage('Connection error. Please try again.');
      setPopupType('error');
    }
  };

  return (
    <>
      {/* Render PopupNotification nếu có message */}
      {popupMessage && (
        <PopupNotification
          message={popupMessage}
          type={popupType}
          onClose={closePopup}
        />
      )}

      {showForgotPassword && (
        <ForgotPasswordPopup onClose={closeForgotPasswordPopup} />
      )}

      {/* Container chính */}
      <div className={`auth-container ${isTransitionActive ? 'right-panel-active' : ''}`}>
        {/* Form đăng nhập */}
        <div className={`form-container sign-in-container ${!isLogin ? 'hide' : ''}`}>
          <form onSubmit={handleLogin}>
            <h1>Sign In</h1>
            <div className="social-container">
              {/* Social icons */}
              <a href="#" className="social"><i className="fab fa-google"></i></a>
              <a href="#" className="social"><i className="fab fa-github"></i></a>
              <a href="#" className="social"><i className="fab fa-linkedin-in"></i></a>
            </div>
            <span>or use your email password</span>
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required // Thêm required để trình duyệt kiểm tra
            />
            <div className="password-container">
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required // Thêm required
              />
              <span className="toggle-password" onClick={() => togglePasswordVisibility('loginPassword')}>
                {showLoginPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
              </span>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); openForgotPasswordPopup(); }}>
              Forgot Your Password?
            </a>
            <button type="submit">Sign In</button> {/* Đảm bảo type="submit" */}
          </form>
        </div>

        {/* Form đăng ký */}
        <div className={`form-container sign-up-container ${isLogin ? 'hide' : ''}`}>
          <form onSubmit={handleRegister}>
            <h1>Create Account</h1>
            <input
              type="text"
              placeholder="Name"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <div className="password-container">
              <input
                type={showRegisterPassword ? "text" : "password"}
                placeholder="Password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
              <span className="toggle-password" onClick={() => togglePasswordVisibility('registerPassword')}>
                {showRegisterPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
              </span>
            </div>
            <div className="password-container">
              <div className="password-input-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  className={confirmPasswordError ? 'error-input' : ''}
                  required
                />
                <span className="toggle-password" onClick={() => togglePasswordVisibility('confirmPassword')}>
                  {showConfirmPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
                </span>
              </div>
            </div>
            {/* Hiển thị lỗi inline cho confirm password */}
            <div>
              {confirmPasswordError && <p className="input-error">{confirmPasswordError}</p>}
            </div>
            <button type="submit">Sign Up</button> {/* Đảm bảo type="submit" */}

            {/* Xóa đoạn code thừa này
            {registerResponseMessage && (
              <div className={`response-message ${registerResponseMessage.includes('successful') ? 'success' : 'error'}`}>
                {registerResponseMessage}
              </div>
            )}
            */}
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container">
          <div className="overlay">
            <div className={`overlay-panel overlay-left ${!isLogin ? 'hide' : ''}`}>
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button type="button" className="ghost" onClick={toggleForm}>Sign In</button> {/* Thêm type="button" */}
            </div>
            <div className={`overlay-panel overlay-right ${isLogin ? 'hide' : ''}`}>
              <h1>Hello, Friend!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button type="button" className="ghost" onClick={toggleForm}>Sign Up</button> {/* Thêm type="button" */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthForm;