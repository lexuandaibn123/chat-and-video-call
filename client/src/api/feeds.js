// src/api/feeds.js
const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}`;

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

export const createPost = async (type, content) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/create-post`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "content": [
                    {
                        type,
                        data: content
                    }
                ]
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API CreatePost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
};

export const getPosts = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/get-posts`, {
            method: "GET", 
            headers: { 'Content-Type': 'application/json' },
            // body: JSON.stringify({

            // })
            credentials: 'include',
        })
        return handleApiResponse(response);
    } catch (error) {
        console.error("API GetPost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}