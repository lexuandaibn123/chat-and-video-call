import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';

import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CheckEmailPage from './pages/CheckEmailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthLayout><AuthPage /></AuthLayout>} />
        <Route path="/auth/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
        <Route path="/auth/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
        <Route path="/auth/verify-email" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />
        <Route path="/auth/check-email" element={<AuthLayout><CheckEmailPage /></AuthLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;