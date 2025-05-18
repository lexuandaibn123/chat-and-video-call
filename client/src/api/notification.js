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

// Fetch posts with pagination
export const getPosts = async (page = 1, limit = 20) => {
  try {
    const token = localStorage.getItem('authToken'); // Lấy token từ localStorage
    const response = await fetch(`${API_BASE_URL}/post/get-posts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': window.location.origin,
      },
      credentials: 'include',
      mode: 'cors',
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching posts:', error.message);
    throw error;
  }
};

// Fetch comments for a specific post with pagination
export const getComments = async (postId, page = 1, limit = 20) => {
  try {
    const token = localStorage.getItem('authToken'); // Lấy token từ localStorage
    const response = await fetch(`${API_BASE_URL}/post/get-posts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': window.location.origin,
      },
      credentials: 'include',
      mode: 'cors',
    });
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    throw error;
  }
};