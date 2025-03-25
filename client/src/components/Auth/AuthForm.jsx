import React, { useState } from 'react';
import './AuthForm.scss';

const AuthForm = () => {
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
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setIsTransitionActive(!isTransitionActive);
    setErrorMessage(''); // Reset error message when toggling
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (registerPassword !== registerConfirmPassword) {
      setConfirmPasswordError('Mật khẩu và xác nhận mật khẩu không khớp.');
      return;
    } else {
      setConfirmPasswordError('');
    }

    console.log("dang dki")
    try {
      const response = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerUsername,
          email: registerEmail,
          password: registerPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Đăng ký thành công
        console.log('Đăng ký thành công:', data);
        // Có thể chuyển hướng người dùng hoặc hiển thị thông báo thành công
        toggleForm(); // Chuyển sang form đăng nhập
      } else {
        // Đăng ký thất bại
        console.error('Đăng ký thất bại:', data);
        setErrorMessage(data.error || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      setErrorMessage('Lỗi kết nối. Vui lòng thử lại.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
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
        window.location.href = '/home'; // Thay đổi '/dashboard' thành đường dẫn phù hợp
      } else {
        // Đăng nhập thất bại
        console.error('Đăng nhập thất bại:', data);
        setErrorMessage(data.error || 'Sai email hoặc mật khẩu. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      setErrorMessage('Lỗi kết nối. Vui lòng thử lại.');
    }
  };

  return (
    <div className={`auth-container ${isTransitionActive ? 'right-panel-active' : ''}`}>
      <div className={`form-container sign-in-container ${!isLogin ? 'hide' : ''}`}>
        <form onSubmit={handleLogin}>
          <h1>Sign In</h1>
          <div className="social-container">
            <a href="#" className="social">
              <i className="fab fa-google"></i>
            </a>
            <a href="#" className="social">
              <i className="fab fa-github"></i>
            </a>
            <a href="#" className="social">
              <i className="fab fa-linkedin-in"></i>
            </a>
          </div>
          <span>or use your email password</span>
          <input 
            type="email" 
            placeholder="Email" 
            value={loginEmail} 
            onChange={(e) => setLoginEmail(e.target.value)} 
          />
          <div className="password-container">
            <input 
              type={showLoginPassword ? "text" : "password"} 
              placeholder="Password" 
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            <span className="toggle-password" onClick={() => togglePasswordVisibility('loginPassword')}>
              {showLoginPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
            </span>
          </div>
          <a href="#">Forgot Your Password?</a>
          <button>Sign In</button>
        </form>
      </div>

      <div className={`form-container sign-up-container ${isLogin ? 'hide' : ''}`}>
        <form onSubmit={handleRegister}>
          <h1>Create Account</h1>
          {/* <span>or use your email for registration</span> */}
          <input 
            type="text" 
            placeholder="Name" 
            value={registerUsername}
            onChange={(e) => setRegisterUsername(e.target.value)}
          />
          <input 
            type="email" 
            placeholder="Email" 
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
          />
          <div className="password-container">
            <input 
              type={showRegisterPassword ? "text" : "password"} 
              placeholder="Password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
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
              />
              <span className="toggle-password" onClick={() => togglePasswordVisibility('confirmPassword')}>
                {showConfirmPassword ? <i className="fas fa-eye"></i> : <i className="fas fa-eye-slash"></i>}
              </span>
            </div>
          </div>
          <div> 
            {confirmPasswordError && <p className="input-error">{confirmPasswordError}</p>}
          </div>
          <button>Sign Up</button>
        </form>
      </div>

      <div className="overlay-container">
        <div className="overlay">
          <div className={`overlay-panel overlay-left ${!isLogin ? 'hide' : ''}`}>
            <h1>Welcome Back!</h1>
            <p>Enter your personal details to use all of site features</p>
            <button className="ghost" onClick={toggleForm}>Sign In</button>
          </div>
          <div className={`overlay-panel overlay-right ${isLogin ? 'hide' : ''}`}>
            <h1>Hello, Friend!</h1>
            <p>Enter your personal details to use all of site features</p>
            <button className="ghost" onClick={toggleForm}>Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;