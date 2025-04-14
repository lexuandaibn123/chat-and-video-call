import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout'; // <<<--- Import MainLayout

// Pages
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CheckEmailPage from './pages/CheckEmailPage';
// --- Import các trang mới ---
import ChatPage from './pages/ChatPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
// --------------------------

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- AUTH ROUTES (Dùng AuthLayout) --- */}
        {/* Layout Route cho các trang không cần đăng nhập */}
        <Route path="/auth" element={<AuthLayout><AuthPage /></AuthLayout>} />
        <Route path="/auth/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
        <Route path="/auth/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
        <Route path="/auth/verify-email" element={<AuthLayout><VerifyEmailPage /></AuthLayout>} />
        <Route path="/auth/check-email" element={<AuthLayout><CheckEmailPage /></AuthLayout>} />

        {/* --- MAIN APP ROUTES (Dùng MainLayout) --- */}
        {/* Layout Route cho các trang cần đăng nhập và có Navigation */}
        <Route path="/" element={<MainLayout />}> {/* Layout Route này xử lý path "/" và các con */}
          {/* Trang chủ là trang mặc định (index) của layout này */}
          <Route index element={<HomePage />} />
          {/* Các trang con khác */}
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Bạn có thể thêm các route khác cần MainLayout ở đây */}
        </Route>

        {/* Optional: Route 404 (nên đặt cuối cùng) */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;