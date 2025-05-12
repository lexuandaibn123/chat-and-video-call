// src/api/setting.js
const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}/api`;

// --- Hàm xử lý response chung ---
const handleApiResponse = async (response) => {
  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = { message: response.statusText || 'An unknown error occurred.' };
  }

  if (!response.ok) {
    let errorMessage = 'An unknown error occurred.';
    if (data.error) {
      if (Array.isArray(data.error) && data.error.length > 0 && data.error[0].msg) {
        errorMessage = data.error[0].msg;
      } else if (typeof data.error === 'string') {
        errorMessage = data.error;
      } else if (data.error.message) {
        errorMessage = data.error.message;
      }
    } else if (data.message) {
      errorMessage = data.message;
    } else if (response.statusText) {
       errorMessage = response.statusText;
    } else {
        errorMessage = `Error: ${response.status}`;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;

    if (response.status === 401 && data.error === "Email not verified") {
        error.isVerificationError = true;
    }
    throw error;
  }

  return data;
};
// --- Kết thúc hàm xử lý response ---

export const avtUpdate = async (avatarUrl) => {
  try {
    // Lấy token từ localStorage hoặc nơi lưu trữ token của bạn
    const token = localStorage.getItem('authToken');
    
    // Giữ nguyên phương pháp gửi base64 nhưng đảm bảo gửi đúng định dạng
    // Nếu avatarUrl bắt đầu với "data:", chỉ lấy phần dữ liệu base64 thực sự
    const base64Data = avatarUrl.includes('base64,') 
      ? avatarUrl.split('base64,')[1] 
      : avatarUrl;
    
    const response = await fetch(`${API_BASE_URL}/user/update-avatar`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        // Thêm CORS headers để yêu cầu server chấp nhận
        'Origin': window.location.origin
      },
      body: JSON.stringify({ avatar: base64Data }),
      credentials: 'include', // Gửi cookies nếu sử dụng xác thực dựa trên cookie
      mode: 'cors' // Đảm bảo CORS được xử lý đúng
    });
    return handleApiResponse(response);
    
  } catch (error) {
    console.error("Error updating avatar:", error.message);
    throw error;
  }
};

export const passwordUpdate = async (email, oldPassword, newPassword) => {
  console.log(email, oldPassword, newPassword);
  try {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        oldPassword,
        newPassword,
      }),
      credentials: 'include',
    })
    return handleApiResponse(response);
  } catch (error) {
    console.error("Password update failed:", error);
    return {
      success: false,
      message: "An error occurred while updating password.",
      error,
    };
  }
}