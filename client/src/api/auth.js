// src/api/auth.js
const API_BASE_URL = 'http://localhost:8080'; // Hoặc lấy từ file config

// --- Hàm xử lý response chung ---
const handleApiResponse = async (response) => {
  const data = await response.json(); // Luôn cố gắng parse JSON

  if (!response.ok) {
    // Ném lỗi để khối catch trong component xử lý
    let errorMessage = 'An unknown error occurred.';
    if (data.error) {
      if (Array.isArray(data.error) && data.error.length > 0 && data.error[0].msg) {
        errorMessage = data.error[0].msg; // Lỗi từ express-validator
      } else if (typeof data.error === 'string') {
        errorMessage = data.error; // Lỗi dạng chuỗi
      }
    } else if (data.message) { // Một số API có thể trả về lỗi trong message
      errorMessage = data.message;
    } else if (data.status) { // Lỗi 404 có thể có status
       errorMessage = data.status;
    }

    const error = new Error(errorMessage);
    error.status = response.status; // Gắn status code vào lỗi
    error.data = data; // Gắn thêm data gốc nếu cần xử lý thêm
    // Gắn cờ đặc biệt cho lỗi chưa xác thực email
    if (response.status === 401 && data.error === "Email not verified") {
        error.isVerificationError = true;
    }
    throw error;
  }

  // Thêm kiểm tra data.success nếu backend luôn trả về trường này khi thành công
  // (API Login của bạn dường như không trả về success, chỉ trả token khi ok)
  // if (data.success === false && response.ok) {
  //      throw new Error(data.message || data.error || 'Operation reported failure');
  // }

  return data; // Trả về dữ liệu nếu response ok
};
// --- Kết thúc hàm xử lý response ---


// --- Các hàm gọi API ---

export const registerApi = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
      // credentials: 'include',
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("API Register Error:", error);
    if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};

export const loginApi = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      // credentials: 'include',
    });
    // Login có thể trả lỗi 401 mà không có success:false, handleApiResponse đã xử lý
    return handleApiResponse(response);
  } catch (error) {
    console.error("API Login Error:", error);
     if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};

export const forgotPasswordApi = async (emailData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("API Forgot Password Error:", error);
     if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};

export const resetPasswordApi = async (resetData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetData), // Gửi { token, password }
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("API Reset Password Error:", error);
     if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};

export const verifyEmailApi = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`, {
      method: 'GET', // Giả sử backend dùng GET
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("API Verify Email Error:", error);
     if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};

export const resendVerificationEmailApi = async (emailData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error("API Resend Verification Error:", error);
     if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};

export const logoutApi = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST', // Dùng POST theo logic session.destroy của backend
      headers: { 'Content-Type': 'application/json' },
      // Không cần body hoặc token vì dựa vào session
    });
    // Logout thành công chỉ cần status 200, không cần parse body
    if (!response.ok) {
         const error = new Error(`Logout failed: ${response.status}`);
         error.status = response.status;
         try {
             error.data = await response.json(); // Cố gắng đọc lỗi chi tiết
         } catch (e) { /* Bỏ qua */ }
         throw error;
      }
    return { success: true, message: 'Logout successful' }; // Trả về thành công
  } catch (error) {
    console.error("API Logout Error:", error);
     if (error instanceof TypeError) {
        throw new Error('Connection error. Please check your network.');
    }
    throw error;
  }
};


// src/api/auth.js
// import axiosClient from './axiosClient.js';

// // Xử lý lỗi chung cho axios
// export const handleApiError = error => {
//   if (!error.response) throw new Error('Connection error.');
//   const { status, data } = error.response;
//   let msg = 'An unknown error occurred.';
//   if (data) {
//     if (data.error) {
//       if (Array.isArray(data.error) && data.error[0]?.msg) msg = data.error[0].msg;
//       else if (typeof data.error === 'string') msg = data.error;
//     } else if (data.message) {
//       msg = data.message;
//     }
//   }
//   const err = new Error(msg);
//   err.status = status;
//   // cờ xác thực email
//   if (status === 401 && data === 'Email not verified') err.isVerificationError = true;
//   throw err;
// };

// export const registerApi = async userData => {
//   try {
//     const { data } = await axiosClient.post('/auth/register', userData);
//     return data;
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// export const loginApi = async ({ email, password }) => {
//   try {
//     const { data } = await axiosClient.post('/auth/login', { email, password });
//     if (data.token) localStorage.setItem('access_token', data.token);
//     return data;
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// export const logoutApi = async () => {
//   try {
//     await axiosClient.post('/auth/logout');
//     localStorage.removeItem('access_token');
//     return { success: true };
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// export const forgotPasswordApi = async emailData => {
//   try {
//     const { data } = await axiosClient.post('/auth/forgot-password', emailData);
//     return data;
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// export const resetPasswordApi = async resetData => {
//   try {
//     const { data } = await axiosClient.post('/auth/reset-password', resetData);
//     return data;
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// export const verifyEmailApi = async token => {
//   try {
//     const { data } = await axiosClient.get('/auth/verify-email', { params: { token } });
//     return data;
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// export const resendVerificationEmailApi = async emailData => {
//   try {
//     const { data } = await axiosClient.post('/auth/resend-verification-email', emailData);
//     return data;
//   } catch (e) {
//     handleApiError(e);
//   }
// };


