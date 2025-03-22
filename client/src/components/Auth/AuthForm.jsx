import React, { useState } from 'react';
import './AuthForm.scss';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isTransitionActive, setIsTransitionActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setIsTransitionActive(!isTransitionActive);
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else if (field === 'confirmPassword') {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  return (
    <div className={`auth-container ${isTransitionActive ? 'right-panel-active' : ''}`}>
      <div className={`form-container sign-in-container ${!isLogin ? 'hide' : ''}`}>
        <form>
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
          <input type="email" placeholder="Email" />
          <div className="password-container">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
            />
            <span className="toggle-password" onClick={() => togglePasswordVisibility('password')}>
              {showPassword ? <i class="fa-solid fa-eye"></i> : <i class="fa-solid fa-eye-slash"></i>}
            </span>
          </div>
          <a href="#">Forgot Your Password?</a>
          <button>Sign In</button>
        </form>
      </div>

      <div className={`form-container sign-up-container ${isLogin ? 'hide' : ''}`}>
        <form>
          <h1>Create Account</h1>
          {/* <span>or use your email for registration</span> */}
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <div className="password-container">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
            />
            <span className="toggle-password" onClick={() => togglePasswordVisibility('password')}>
              {showPassword ? '👁️' : '🙈'}
            </span>
          </div>
          <div className="password-container">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Confirm Password" 
            />
            <span className="toggle-password" onClick={() => togglePasswordVisibility('confirmPassword')}>
              {showConfirmPassword ? '👁️' : '🙈'}
            </span>
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
            <p>Register with your personal details to use all of site features</p>
            <button className="ghost" onClick={toggleForm}>Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;