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

export const editPost = async (id, content) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/edit-post`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: id,
                newContent: [
                    {
                        type: "text",
                        data: content
                    }
                ]
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API EditPost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}

export const deletePost = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/delete-post`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: id
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API DeletePost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}   

export const likePost = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/react-to-post`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: id,
                type: "like",
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API LikePost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}

export const unlikePost = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/unreact-to-post`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: id,
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API UnlikePost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}

export const commentPost = async (id, content) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/comment-to-post`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: id,
                type: "text",
                data: {
                    type: "text",
                    data: content,
                },
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API CommentPost Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}

export const getCommentsByPostId = async (id) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/post/get-comments/${id}?page=1&limit=20`,
            {
                method: "GET",
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            }
        );
        return handleApiResponse(response);
    } catch (error) {
        console.error("API GetCommentsByPostId Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
};

export const editComment = async (id, content) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/edit-comment`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commentId: id,
                newData: content
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API EditComment Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}   

export const deleteComment = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/delete-comment`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commentId: id
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    }
    catch (error) {
        console.error("API DeleteComment Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}  

export const replyComment = async (postId, content, replyCommentId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/post/comment-to-post`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId,
                type: "text",
                data: {
                    type: "text",
                    data: content,
                },
                replyCommentId: replyCommentId
            }),
            credentials: 'include',
        })
        return handleApiResponse(response);
    } catch (error) {
        console.error("API ReplyComment Error:", error);
        if (error instanceof TypeError) {
            throw new Error('Connection error. Please check your network and CORS settings.');
        }
        throw error;
    }
}