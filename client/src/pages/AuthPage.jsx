import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PopupNotification from '../components/Auth/PopupNotification';
// import './AuthForm.scss';
// --- IMPORT API FUNCTIONS ---
import { loginApi, registerApi, resendVerificationEmailApi } from '../api/auth'; // Điều chỉnh đường dẫn nếu cần

const AuthForm = () => {
  const navigate = useNavigate();

  // --- Các state giữ nguyên ---
  const [isLogin, setIsLogin] = useState(true);
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);
  // --- Kết thúc state ---

  // --- Các hàm toggle và close giữ nguyên ---
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setIsTransitionActive(!isTransitionActive);
    setConfirmPasswordError('');
    setPopupMessage('');
    setShowResendVerification(false);
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
  // --- Kết thúc hàm toggle/close ---


  // --- handleRegister gọi API ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setConfirmPasswordError('');
    setPopupMessage('');
    setShowResendVerification(false);

    if (registerPassword !== registerConfirmPassword) {
      setConfirmPasswordError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }

    setIsRegisterLoading(true);
    console.log("Đang thực hiện đăng ký...")

    try {
      const userData = {
        fullName: registerUsername,
        email: registerEmail,
        password: registerPassword,
        confirmPassword: registerConfirmPassword // Gửi đi nếu backend cần
      };
      const data = await registerApi(userData); // Gọi hàm API

      setPopupMessage(data.message || 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      setPopupType('success');
      console.log('Đăng ký thành công:', data);
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      // Không chuyển form ngay
    } catch (error) { // Lỗi đã được ném từ hàm API
      console.error('Đăng ký thất bại:', error);
      setPopupMessage(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      setPopupType('error');
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // --- handleLogin gọi API ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setPopupMessage('');
    setShowResendVerification(false);
    setIsLoginLoading(true);

    try {
      const credentials = { email: loginEmail, password: loginPassword };
      const data = await loginApi(credentials); // Gọi hàm API

      console.log('Đăng nhập thành công:', data);
      // Lưu ý: API login gốc chỉ trả về token khi thành công, không có success:true
      // Hàm handleApiResponse đã xử lý việc trả về data khi response.ok
      localStorage.setItem('access_token', data.access_token);
      navigate('/'); // Chuyển hướng trang chủ

    } catch (error) { // Lỗi đã được ném từ hàm API
      console.error('Đăng nhập thất bại:', error);
      setPopupMessage(error.message || 'Login failed. Please try again.');
      setPopupType('error');
      // Hiện nút gửi lại nếu lỗi là do chưa xác thực email
      setShowResendVerification(error.isVerificationError || false);
    } finally {
      setIsLoginLoading(false);
    }
  };

  // --- handleResendVerification gọi API ---
   const handleResendVerification = async () => {
    if (!loginEmail) {
      setPopupMessage('Vui lòng nhập email của bạn vào ô đăng nhập trước.');
      setPopupType('error');
      return;
    }
    setPopupMessage('');
    console.log("Đang gửi lại email xác thực cho:", loginEmail);
    try {
      const data = await resendVerificationEmailApi({ email: loginEmail }); // Gọi hàm API
      setPopupMessage(data.message || 'Email xác thực đã được gửi lại.');
      setPopupType('success');
      setShowResendVerification(false);
    } catch (error) { // Lỗi đã được ném từ hàm API
      console.error('Lỗi gửi lại email:', error);
      setPopupMessage(error.message || 'Gửi lại email thất bại.');
      setPopupType('error');
    }
  };

  // --- Phần JSX return giữ nguyên như code trước của bạn ---
  return (
    <>
      {popupMessage && (
        <PopupNotification
          message={popupMessage}
          type={popupType}
          onClose={closePopup}
        />
      )}

      <div className={`auth-container ${isTransitionActive ? 'right-panel-active' : ''}`}>
        {/* Form đăng nhập */}
        <div className={`form-container sign-in-container ${!isLogin ? 'hide' : ''}`}>
          <form onSubmit={handleLogin}>
            <h1>Sign In</h1>
            <div className="social-container">
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
              required
            />
            <div className="password-container">
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <span className="toggle-password" onClick={() => togglePasswordVisibility('loginPassword')}>
                {showLoginPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
              </span>
            </div>
            <Link to="/auth/forgot-password">Forgot Your Password?</Link>
            <button type="submit" disabled={isLoginLoading}>
              {isLoginLoading ? 'Signing In...' : 'Sign In'}
            </button>
            {showResendVerification && (
              <button type="button" onClick={handleResendVerification} className="resend-button">
                Gửi lại Email Xác thực
              </button>
            )}
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
                minLength={6}
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
            <div>
              {confirmPasswordError && <p className="input-error">{confirmPasswordError}</p>}
            </div>
            <button type="submit" disabled={isRegisterLoading}>
              {isRegisterLoading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* Overlay */}
        <div className="overlay-container">
          <div className="overlay">
            <div className={`overlay-panel overlay-left ${!isLogin ? 'hide' : ''}`}>
              <h1>Welcome Back!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button type="button" className="ghost" onClick={toggleForm}>Sign In</button>
            </div>
            <div className={`overlay-panel overlay-right ${isLogin ? 'hide' : ''}`}>
              <h1>Hello, Friend!</h1>
              <p>Enter your personal details to use all of site features</p>
              <button type="button" className="ghost" onClick={toggleForm}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthForm;