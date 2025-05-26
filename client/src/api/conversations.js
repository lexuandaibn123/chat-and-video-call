// src/api/conversations.js

// const API_BASE_URL = '/api/conversations'; // <<< Điều chỉnh để khớp URL mới
const API_BASE_URL = `${import.meta.env.VITE_SERVER_URL}/api`; // <<< Base URL chung

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

// --- API Calls for Conversations & Messages ---
export const createConversationApi = async ({ members = [], name = "" }) => {
  if (!Array.isArray(members)) {
    throw new Error("Members must be an array");
  }
  if (members.some(member => typeof member !== 'string' || !/^[a-fA-F0-9]{24}$/.test(member))) {
    throw new Error("All members must be valid ObjectIDs (24-character hex strings)");
  }
  if (typeof name !== 'string') {
    throw new Error("Name must be a string");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/conversation/create-conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ members, name }),
    });
    const result = await handleApiResponse(response);
    
    // Kiểm tra cấu trúc response
    if (!result.data || typeof result.data !== 'object' || !result.data._id) {
      throw new Error("Invalid conversation data returned from API");
    }
    
    return result.data;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};


// Lấy danh sách phòng/cuộc trò chuyện của người dùng
// URL trong screenshot: GET /conversation/get-conversations
export const getMyRoomsApi = async (page = 1, limit = 20) => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/get-conversations?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }, // Headers không cần thiết cho GET không body, nhưng thêm vào cũng không hại
      credentials: 'include', // Cần gửi session cookie
    });
    const result = await handleApiResponse(response);
     // API trả về { success: true, data: [conversations] }
    return Array.isArray(result.data) ? result.data : []; // Trả về mảng data
  } catch (error) {
    console.error("Error fetching my rooms:", error);
    throw error;
  }
};

export const getConversationByIdApi = async (conversationId) => {
  if (!conversationId) {
    throw new Error("conversationId is required to fetch conversation details.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/conversation/get-conversation?conversationId=${conversationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }, 
      credentials: 'include', 
    });

    const result = await handleApiResponse(response);
    return result.data; 
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw error; 
  }
};

// Tìm kiếm cuộc trò chuyện theo tên (cho group)
// URL trong screenshot: GET /conversation/search-by-name
export const searchConversationsByNameApi = async (name, page = 1, limit = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/search-by-name?name=${encodeURIComponent(name)}&page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cần gửi session cookie
    });
    const result = await handleApiResponse(response);
    return Array.isArray(result.data) ? result.data : []; // Trả về mảng data
  } catch (error) {
    console.error(`Error searching conversations by name "${name}":`, error);
    throw error;
  }
};

// Thêm thành viên vào nhóm
// URL trong screenshot: POST /conversation/add-new-member
export const addNewMemberApi = async ({ conversationId, newMemberId, role = 'member' }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/add-new-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cần gửi session cookie
      body: JSON.stringify({ conversationId, newMemberId, role }),
    });
    const result = await handleApiResponse(response);
     // API trả về { success, message, data: updatedConversation }
    return result.data; // Trả về conversation object
  } catch (error) {
    console.error("Error adding new member:", error);
    throw error;
  }
};

// Xoá thành viên khỏi nhóm
// URL trong screenshot: POST /conversation/remove-member
export const removeMemberApi = async ({ conversationId, memberId }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/remove-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cần gửi session cookie
      body: JSON.stringify({ conversationId, memberId }),
    });
    const result = await handleApiResponse(response);
     // API trả về { success, message, data: updatedConversation }
    return result.data; // Trả về conversation object
  } catch (error) {
    console.error("Error removing member:", error);
    throw error;
  }
};

// Cập nhật vai trò thành viên (bao gồm đổi leader)
// URL trong screenshot: POST /conversation/update-member-role
export const updateMemberRoleApi = async ({ conversationId, memberId, newRole }) => {
  try {
      const response = await fetch(`${API_BASE_URL}/conversation/update-member-role`, {
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', 
          body: JSON.stringify({ conversationId, memberId, newRole }),
      });
      const result = await handleApiResponse(response);
      
      if (!result.success) {
          throw new Error(result.message || "Failed to update member role");
      }
      
      return result; 
  } catch (error) {
      console.error("Error updating member role:", error);
      throw error;
  }
};



// Rời khỏi cuộc trò chuyện (chỉ nhóm)
// URL trong screenshot: POST /conversation/leave-conversation
export const leaveConversationApi = async ({ conversationId }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/conversation/leave-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Cần gửi session cookie
            body: JSON.stringify({ conversationId }),
        });
        const result = await handleApiResponse(response);
        // API trả về { success, message }
        return result; // Trả về { success, message }
    } catch (error) {
        console.error("Error leaving conversation:", error);
        throw error;
    }
};

// Xoá cuộc trò chuyện (thành viên 1-1 hoặc nhóm đã rời) - chỉ ẩn khỏi danh sách của mình
// URL trong screenshot: POST /conversation/delete-conversation-by-member
export const deleteConversationMemberApi = async ({ conversationId }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/conversation/delete-conversation-by-member`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Cần gửi session cookie
            body: JSON.stringify({ conversationId }),
        });
        const result = await handleApiResponse(response);
         // API trả về { success, message }
        return result; // Trả về { success, message }
    } catch (error) {
        console.error("Error deleting conversation for member:", error);
        throw error;
    }
};

// Xoá cuộc trò chuyện (leader của nhóm)
// URL trong screenshot: POST /conversation/delete-conversation-by-leader
export const deleteGroupApi = async ({ conversationId }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/conversation/delete-conversation-by-leader`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Cần gửi session cookie
            body: JSON.stringify({ conversationId }),
        });
        const result = await handleApiResponse(response);
         // API trả về { success, message }
        return result; // Trả về { success, message }
    } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
    }
};

// Cập nhật tên nhóm
// URL trong screenshot: POST /conversation/update-conversation-name
export const updateConversationNameApi = async ({ conversationId, newName }) => {
  try {
      const response = await fetch(`${API_BASE_URL}/conversation/update-conversation-name`, {
          method: 'PUT', // Đúng theo API
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ conversationId, newName }),
      });
      const result = await handleApiResponse(response);
      // API mới trả về { success, message }, không còn 'conversation' nữa
      if (!result.success) {
          throw new Error(result.message || "Failed to update group name");
      }
      return result; // ✅ Trả về { success, message }
  } catch (error) {
      console.error("Error updating group name:", error);
      throw error;
  }
};



// Lấy danh sách tin nhắn cho conversation (Endpoint mới)
// URL trong screenshot: POST /conversation/get-messages
export const getMessagesByRoomIdApi = async ({ conversationId, limit = 30, skip = 0 }) => {
  try {
    const url = new URL(`${API_BASE_URL}/conversation/get-messages`);
    url.searchParams.append('conversationId', conversationId);
    url.searchParams.append('limit', limit);
    url.searchParams.append('skip', skip);

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Gửi cookie kèm theo
    });

    const result = await handleApiResponse(response);
    console.log(result)
    // API trả về dạng JSON array các message
    return result.data; // Vì theo ảnh, trả về array trực tiếp, không phải { success: true, data: [...] }
  } catch (error) {
    console.error(`Error fetching messages for conversation ${conversationId}:`, error);
    throw error;
  }
};



// Gửi tin nhắn mới (Endpoint mới)
// URL trong screenshot: POST /conversation/create-new-message
export const sendMessageApi = async ({ conversationId, data, type, replyToMessageId = null }) => { // Tên hàm giữ nguyên để ít thay đổi ChatPage
  console.log(JSON.stringify({ conversationId, data, type, replyToMessageId }));
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/create-new-message`, { // Endpoint mới
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cần gửi session cookie
      body: JSON.stringify({ conversationId, data, type, replyToMessageId }),
    });
    const result = await handleApiResponse(response);
    return result.data; // API trả về { success: true, data: messageObject }
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Sửa tin nhắn (chỉ text) (Endpoint mới)
// URL trong screenshot: POST /conversation/edit-message
export const editMessageApi = async ({ messageId, newData }) => { // Tên hàm giữ nguyên
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/edit-message`, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', 
      body: JSON.stringify({ messageId, newData }),
    });

    const result = await handleApiResponse(response);
    return result.data; // API trả về { success: true, data: updatedMessage }
  } catch (error) {
    console.error(`Error editing message ${messageId}:`, error);
    throw error;
  }
};


// Xoá tin nhắn (Endpoint mới)
// URL trong screenshot: POST /conversation/delete-message
export const deleteMessageApi = async ({ messageId }) => { // Tên hàm giữ nguyên
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/delete-message`, { // Endpoint mới
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Cần gửi session cookie
      body: JSON.stringify({ messageId }),
    });
    const result = await handleApiResponse(response);
    return result.data; // API trả về { success: true, data: updatedMessage }
  } catch (error) {
    console.error(`Error deleting message ${messageId}:`, error);
    throw error;
  }
};

export const updateConversationAvatar = async (conversationId, newAvatar) => {
  try {
    const response = await fetch(`${API_BASE_URL}/conversation/update-conversation-avatar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        newAvatar,
      }),
      credentials: 'include',
    });

    const data = await handleApiResponse(response);
    return data;
  } catch (error) {
    console.error('Failed to update conversation avatar:', error);
    throw error;
  }
};


// NOTE: getLastMessagesApi KHÔNG CÓ trong screenshot API mới.
// Chúng ta đã comment/loại bỏ chức năng này tạm thời trong ChatPage.jsx ở các bước trước.
// Nếu bạn cần lại, bạn sẽ phải thêm endpoint mới vào server hoặc tìm endpoint tương đương.
// export const getLastMessagesApi = async ({ roomIds }) => { ... };

// TODO: Add createConversationApi implementation if needed later