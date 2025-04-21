// src/api/messages.js

const API_BASE_URL = '/api/messages'; // Điều chỉnh nếu cần

// Hàm helper xử lý response
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: `HTTP error! status: ${response.status}` };
    }
    console.error("API Error Response:", errorData);
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  // Xử lý trường hợp 204 No Content (vd: DELETE thành công)
   if (response.status === 204 || response.headers.get("content-length") === "0") {
      // Nếu phương thức là DELETE hoặc không mong đợi nội dung, trả về thành công
      if (response.config?.method === 'DELETE' || response.config?.method === 'delete') {
           return { success: true };
       }
      // Nếu các phương thức khác trả về no content mà không báo lỗi, cũng coi là thành công
      return { success: true, data: null };
   }
  const data = await response.json();
  if (data.success === false) { // Kiểm tra trường success=false từ backend
      console.error("API Logic Error:", data.error);
      throw new Error(data.error || 'API request failed');
  }
  return data; // Trả về toàn bộ data nếu success=true hoặc không có trường success
};


export const sendMessageApi = async (roomId, content) => {
  try {
    const response = await fetch(`${API_BASE_URL}`, { // POST đến /api/messages
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('access_token')}` // Nếu dùng token
      },
      credentials: 'include', // <<< Quan trọng nếu dùng session/cookie
      body: JSON.stringify({ roomId, content }),
    });
    const data = await handleResponse(response);
    return data.message; // Trả về object tin nhắn đã tạo { _id, sender, room, content, createdAt, ... }
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const getMessagesByRoomIdApi = async (roomId) => {
  try {
    // GET đến /api/messages/room/:id (Giả định endpoint này)
    // Hoặc nếu backend dùng req.params.id cho GET /api/messages/:id thì đổi lại
    const response = await fetch(`${API_BASE_URL}/room/${roomId}`, {
      method: 'GET',
      headers: {
        // 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      credentials: 'include',
    });
    const data = await handleResponse(response);
    // Đảm bảo messages là một mảng, kể cả khi API trả về rỗng
    return Array.isArray(data.messages) ? data.messages : [];
  } catch (error) {
    console.error(`Error fetching messages for room ${roomId}:`, error);
    throw error;
  }
};

export const getLastMessagesApi = async (roomIds) => {
  try {
    // POST đến /api/messages/last (Giả định endpoint này)
    const response = await fetch(`${API_BASE_URL}/last`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      credentials: 'include',
      body: JSON.stringify({ roomIds }),
    });
    const data = await handleResponse(response);
     // Đảm bảo messages là một mảng
    return Array.isArray(data.messages) ? data.messages : [];
  } catch (error) {
    console.error("Error fetching last messages:", error);
    throw error;
  }
};

// --- Các hàm API khác (Tùy chọn, thêm nếu cần dùng) ---

// export const deleteMessageApi = async (messageId) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}`, { // Hoặc /api/messages/${messageId}
//       method: 'DELETE',
//       headers: { 'Content-Type': 'application/json', /* Auth */ },
//       credentials: 'include',
//       body: JSON.stringify({ messageId }),
//     });
//     return await handleResponse(response); // Chỉ trả về success status
//   } catch (error) {
//     console.error(`Error deleting message ${messageId}:`, error);
//     throw error;
//   }
// };

// export const editMessageApi = async (messageId, newContent) => {
//   try {
//     const response = await fetch(`${API_BASE_URL}`, { // Hoặc /api/messages/${messageId}
//       method: 'PUT',
//       headers: { 'Content-Type': 'application/json', /* Auth */ },
//       credentials: 'include',
//       body: JSON.stringify({ messageId, newContent }),
//     });
//     const data = await handleResponse(response);
//     return data.message; // Trả về tin nhắn đã update
//   } catch (error) {
//     console.error(`Error editing message ${messageId}:`, error);
//     throw error;
//   }
// };






// import axiosClient from './axiosClient.js';
// import { handleApiError } from './auth.js';

// // Gửi tin nhắn vào room
// export const sendMessageApi = async (roomId, content) => {
//   try {
//     const { data } = await axiosClient.post('/api/messages', { roomId, content });
//     // trả về message object
//     return data.message;
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// // Lấy danh sách tin nhắn theo roomId
// export const getMessagesByRoomIdApi = async roomId => {
//   try {
//     const { data } = await axiosClient.get(`/api/messages/room/${roomId}`);
//     return Array.isArray(data.messages) ? data.messages : [];
//   } catch (e) {
//     handleApiError(e);
//   }
// };

// // Lấy tin nhắn mới nhất cho nhiều room
// export const getLastMessagesApi = async roomIds => {
//   try {
//     const { data } = await axiosClient.post('/api/messages/last', { roomIds });
//     return Array.isArray(data.messages) ? data.messages : [];
//   } catch (e) {
//     handleApiError(e);
//   }
// };
