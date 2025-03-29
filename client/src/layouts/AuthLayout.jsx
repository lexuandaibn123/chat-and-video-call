// src/layouts/AuthLayout.jsx
import React from 'react';
import './AuthLayout.scss'; // Import SCSS

const AuthLayout = ({ children }) => {
  // Container này sẽ căn giữa bất cứ thứ gì được truyền vào (children)
  return <div className="auth-layout-container">{children}</div>;
};

export default AuthLayout;