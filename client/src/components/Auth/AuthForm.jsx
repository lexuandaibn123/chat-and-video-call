import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import useNavigate và Link
import PopupNotification from './PopupNotification';
import './AuthForm.scss';

const AuthForm = () => {
  const navigate = useNavigate(); // Khởi tạo useNavigate

  const [isLogin, setIsLogin] = useState(true);
  const [isTransitionActive, setIsTransitionActive] = useState(false);

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

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
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // State cho popup thông báo
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState(''); // 'success' hoặc 'error'

  // State để hiển thị nút gửi lại email xác thực
  const [showResendVerification, setShowResendVerification] = useState(false);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setIsTransitionActive(!isTransitionActive);
    setConfirmPasswordError(''); // Reset lỗi confirm password
    setPopupMessage(''); // Đóng popup khi chuyển form
    setShowResendVerification(false); // Ẩn nút gửi lại khi chuyển form
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
    // Không ẩn nút gửi lại ở đây, chỉ ẩn khi chuyển form hoặc gửi thành công
    // setShowResendVerification(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setConfirmPasswordError('');
    setPopupMessage('');
    setShowResendVerification(false); // Ẩn nút gửi lại khi bắt đầu đăng ký

    if (registerPassword !== registerConfirmPassword) {
      setConfirmPasswordError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    }
    
    setIsRegisterLoading(true); 
    console.log("Đang thực hiện đăng ký...")
    try {
      const response = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: registerUsername,
          email: registerEmail,
          password: registerPassword,
          confirmPassword: registerConfirmPassword // Backend có thể không cần cái này nếu đã check ở client
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPopupMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
        setPopupType('success');
        console.log('Đăng ký thành công:', data);
        // Reset form
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        // Không chuyển form ngay để user đọc thông báo
        // toggleForm();~
      } else {
        // Ưu tiên lỗi từ validation array nếu có
        const errorMsg = data.error && Array.isArray(data.error) ? data.error[0]?.msg : data.error;
        setPopupMessage(errorMsg || 'Đăng ký thất bại. Vui lòng thử lại.');
        setPopupType('error');
        console.error('Đăng ký thất bại:', data);
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      setPopupMessage('Lỗi kết nối. Vui lòng thử lại.');
      setPopupType('error');
    } finally {
      setIsRegisterLoading(false); // --- KẾT THÚC LOADING ---
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setPopupMessage('');
    setIsLoginLoading(true);
    setShowResendVerification(false); // Ẩn nút gửi lại khi bắt đầu đăng nhập

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

      // --- XỬ LÝ LOGIN RESPONSE ---
      if (response.ok && data.success) {
        // Thành công hoàn toàn (status 200 và success: true)
        console.log('Đăng nhập thành công:', data);
        localStorage.setItem('access_token', data.access_token); // Giả sử API trả về token ở đây
        navigate('/'); // Chuyển hướng đến trang chủ
      } else {
        // Xử lý các trường hợp thất bại
        console.error('Đăng nhập thất bại:', response.status, data);
        let errorMessageToShow = 'Login failed. Please try again.'; // Default error
        let isVerificationError = false;

        // Kiểm tra lỗi cụ thể "Email not verified"
        if (response.status === 401 && data.error === "Email not verified") {
             errorMessageToShow = 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư của bạn.';
             isVerificationError = true;
        }
        // Kiểm tra lỗi validation từ express-validator (nếu có)
        else if (data.error && Array.isArray(data.error) && data.error.length > 0 && data.error[0].msg) {
             errorMessageToShow = data.error[0].msg;
        }
        // Kiểm tra lỗi dạng chuỗi khác
        else if (typeof data.error === 'string') {
             errorMessageToShow = data.error;
        }
        // Các trường hợp lỗi khác (vd: 404, 500)
        else if (data.status) {
             errorMessageToShow = `Error ${response.status}: ${data.status}`;
        }

        setPopupMessage(errorMessageToShow);
        setPopupType('error');
        setShowResendVerification(isVerificationError); // Chỉ hiện nút gửi lại nếu là lỗi xác thực
      }
      // --- KẾT THÚC XỬ LÝ LOGIN RESPONSE ---

    } catch (error) {
      console.error('Lỗi kết nối:', error);
      setPopupMessage('Lỗi kết nối. Vui lòng thử lại.');
      setPopupType('error');
    } finally {
      setIsLoginLoading(false); // --- KẾT THÚC LOADING ---
    }
  };

  // --- HÀM GỬI LẠI EMAIL XÁC THỰC ---
  const handleResendVerification = async () => {
    if (!loginEmail) { // Cần email người dùng đã nhập
      setPopupMessage('Vui lòng nhập email của bạn vào ô đăng nhập.');
      setPopupType('error');
      return;
    }
    setPopupMessage(''); // Xóa popup cũ
    console.log("Đang gửi lại email xác thực cho:", loginEmail);
    try {
      const response = await fetch('http://localhost:8080/auth/resend-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPopupMessage(data.message || 'Email xác thực đã được gửi lại. Vui lòng kiểm tra hộp thư.');
        setPopupType('success');
        setShowResendVerification(false); // Ẩn nút sau khi gửi thành công
      } else {
        // Xử lý lỗi từ server (vd: email đã xác thực, không tìm thấy user)
         const errorMsg = data.error && Array.isArray(data.error) ? data.error[0]?.msg : data.error;
        setPopupMessage(errorMsg || 'Gửi lại email thất bại.');
        setPopupType('error');
      }
    } catch (error) {
      console.error('Lỗi gửi lại email:', error);
      setPopupMessage('Lỗi kết nối khi gửi lại email.');
      setPopupType('error');
    }
  };
  // --- KẾT THÚC HÀM GỬI LẠI ---

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
            <button type="submit" disabled={isLoginLoading}> {/* Thêm disabled */}
              {isLoginLoading ? 'Signing In...' : 'Sign In'} {/* Thay đổi text */}
            </button>
            {/* --- NÚT GỬI LẠI EMAIL XÁC THỰC --- */}
            {showResendVerification && (
              <button type="button" onClick={handleResendVerification} className="resend-button">
                Gửi lại Email Xác thực
              </button>
            )}
            {/* --------------------------------- */}
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
                minLength={6} // Thêm minLength nếu backend yêu cầu
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
            <button type="submit" disabled={isRegisterLoading}> {/* Thêm disabled */}
              {isRegisterLoading ? 'Signing Up...' : 'Sign Up'} {/* Thay đổi text */}
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
              <p>Register with your personal details to use all of site features</p>
              <button type="button" className="ghost" onClick={toggleForm}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthForm;