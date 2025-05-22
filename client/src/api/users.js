// src/api/users.js

const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}/api`;

// Hàm helper xử lý response (giữ nguyên)
const handleApiResponse = async (response) => {
    let data = {};
    try {
        data = await response.json();
    } catch (e) {
        console.error("Failed to parse JSON response:", e);
        console.error("Response status:", response.status);
        console.error("Response URL:", response.url);
        try {
            const text = await response.text();
            console.error("Raw response:", text.substring(0, 200));
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

// Tìm kiếm người dùng theo tên/username (giữ nguyên)
export const searchUsersApi = async (name) => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/search?name=${encodeURIComponent(name)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        const result = await handleApiResponse(response);
        return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
        console.error(`Error searching users "${name}":`, error);
        throw error;
    }
};

// Lấy thông tin người dùng theo email
export const getUserByEmailApi = async (email) => {
    const url = `${API_BASE_URL}/user/email/${encodeURIComponent(email)}`;
    console.log("Calling getUserByEmailApi with URL:", url);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        const result = await handleApiResponse(response);
        return result.data;
    } catch (error) {
        console.error(`Error fetching user by email "${email}":`, error);
        throw error;
    }
};

// Lấy thông tin người dùng theo ID
export const getUserDetailsApi = async (userId) => {
    const url = `${API_BASE_URL}/user/${encodeURIComponent(userId)}`; // Đúng theo API doc
    console.log("Calling getUserDetailsApi with URL:", url);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        const result = await handleApiResponse(response);
        return result.data;
    } catch (error) {
        console.error(`Error fetching user details for ${userId}:`, error);
        throw error;
    }
};

// Lấy danh sách gợi ý kết bạn
export const getPotentialFriendsApi = async () => {
    const url = `${API_BASE_URL}/user/potential-friends`;
    console.log("Calling getPotentialFriendsApi with URL:", url);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        const result = await handleApiResponse(response);
        return result.data || [];
    } catch (error) {
        console.error('Error fetching potential friends:', error);
        throw error;
    }
};