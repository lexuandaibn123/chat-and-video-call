// src/api/users.js

// const API_BASE_URL = '/api/users'; // <<< Điều chỉnh để khớp URL mới
const API_BASE_URL = ''; // <<< Base URL chung

// Hàm helper xử lý response (Sao chép từ auth.js, đảm bảo nhất quán)
const handleApiResponse = async (response) => {
  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    console.error("Failed to parse JSON response:", e);
     try {
         const text = await response.text();
         data = { error: `Unexpected response format. Server responded with: ${text.substring(0, 100)}...` };
     } catch (eText) {
         data = { error: response.statusText || 'An unknown error occurred.' };
     }
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

   if (data.success === false) {
      console.error("API Logic Error:", data.error);
      const errorMessage = typeof data.error === 'string' ? data.error : (data.message || 'API request failed');
      const error = new Error(errorMessage);
      error.data = data;
      throw error;
  }

  return data;
};


// --- API Calls for Users ---

// Tìm kiếm người dùng theo tên/username (cho chức năng thêm thành viên)
// URL trong screenshot: GET /users/search
export const searchUsersApi = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/search?name=${encodeURIComponent(name)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }, // Có thể không cần headers cho GET không body
      credentials: 'include', // Cần gửi session cookie nếu API protected
    });
    const result = await handleApiResponse(response);
     // API trả về { success: true, data: [user objects] }
    return Array.isArray(result.data) ? result.data : []; // Trả về mảng data
  } catch (error) {
    console.error(`Error searching users "${name}":`, error);
    throw error;
  }
};

// Lấy thông tin chi tiết một người dùng theo ID (Giả định endpoint này tồn tại và là GET /users/:id)
// URL trong screenshot: Không hiển thị cụ thể, nhưng giả định theo cấu trúc RESTful
export const getUserDetailsApi = async (userId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, { // Giả định endpoint GET /users/:id
            method: 'GET',
             headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Cần gửi session cookie nếu API protected
        });
        const result = await handleApiResponse(response);
         // API trả về { success: true, data: userObject }
        return result.data; // Trả về object user
    } catch (error) {
        console.error(`Error fetching user details for ${userId}:`, error);
        throw error;
    }
};

// TODO: Có thể thêm getUsersByIdsApi(userIds) nếu API hỗ trợ batch fetch