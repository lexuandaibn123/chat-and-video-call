import React, { useState } from 'react';
import './AuthForm.scss';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isTransitionActive, setIsTransitionActive] = useState(false);

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setIsTransitionActive(!isTransitionActive);
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
          <input type="password" placeholder="Password" />
          <a href="#">Forgot Your Password?</a>
          <button>Sign In</button>
        </form>
      </div>

      <div className={`form-container sign-up-container ${isLogin ? 'hide' : ''}`}>
        <form>
          <h1>Create Account</h1>
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
          <span>or use your email for registration</span>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
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