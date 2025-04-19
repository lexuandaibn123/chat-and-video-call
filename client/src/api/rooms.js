// src/api/rooms.js

const API_BASE_URL = '/api/rooms'; // Endpoint giả định

const handleResponse = async (response) => { /* ... (Copy hàm handleResponse từ messages.js) ... */
    if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch (e) { errorData = { error: `HTTP error! status: ${response.status}` }; }
        console.error("API Error Response:", errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
     if (response.status === 204 || response.headers.get("content-length") === "0") { return { success: true, data: null }; }
    const data = await response.json();
    if (data.success === false) { console.error("API Logic Error:", data.error); throw new Error(data.error || 'API request failed'); }
    return data;
};


// Hàm giả định để lấy danh sách phòng của user hiện tại
export const getMyRoomsApi = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/my`, { // GET đến /api/rooms/my (ví dụ)
      method: 'GET',
      headers: {
        // 'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      credentials: 'include',
    });
    const data = await handleResponse(response);
    // API này cần trả về một mảng các object room, ví dụ:
    // [{ id: 'room1', type: 'friend', name: 'Friend A', avatar: 'url' }, { id: 'group1', type: 'group', name: 'Group X', avatar: null }]
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch (error) {
    console.error("Error fetching user rooms:", error);
    throw error;
  }
};