import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthForm from './components/Auth/AuthForm';
import HomePage from './components/Home/HomePage'; // Cập nhật đường dẫn import

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthForm />} /> {/* Thay đổi đường dẫn đến trang đăng nhập */}
        <Route path="/home" element={<HomePage />} /> {/* Thay đổi đường dẫn đến trang chủ */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;