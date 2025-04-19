// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'; // Thêm useRef
import ConversationListPanel from '../components/Chat/ConversationListPanel';
import ChatWindow from '../components/Chat/ChatWindow';
import { sendMessageApi, getMessagesByRoomIdApi, getLastMessagesApi } from '../api/messages'; // <<< Import API messages
import { getMyRoomsApi } from '../api/rooms'; // <<< Import API rooms
import '../components/Chat/Chat.scss';

// --- Dữ liệu mẫu (giữ nguyên) ---
const sampleGroups = [/* ... */];
const sampleFriends = [/* ... */];
const sampleMessagesData = {/* ... */};
const sampleContactData = {/* ... */};

const ChatPage = () => {
  // --- State ---
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]); // State chính cho danh sách
  const [activeChat, setActiveChat] = useState(null); // { id, type, name, avatar, statusText }
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  // const { isMobileChatActive, setIsMobileChatActive } = useLayout(); // Nếu dùng context
  const [isMobileChatActive, setIsMobileChatActive] = useState(false); // State cục bộ (nếu không dùng context)


  // <<< Lấy và lưu trữ User ID (QUAN TRỌNG) >>>
  const currentUserIdRef = useRef(null);
  useEffect(() => {
    // Lấy user ID khi component mount (thay bằng cách của bạn)
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      console.error("User ID not found! Please login.");
      // Có thể chuyển hướng về trang login ở đây
    }
    currentUserIdRef.current = userId;
    console.log("Current User ID:", currentUserIdRef.current); // Kiểm tra
  }, []);


  // --- Hàm Fetch dữ liệu ban đầu ---
  const fetchInitialData = useCallback(async () => {
    if (!currentUserIdRef.current) return; // Đảm bảo có user ID

    setIsLoadingConversations(true);
    setError(null);
    try {
      console.log("Fetching initial rooms...");
      const myRooms = await getMyRoomsApi(); // Lấy list phòng chat
      console.log("Fetched rooms:", myRooms);

      if (myRooms && myRooms.length > 0) {
         const roomIds = myRooms.map(room => room.id || room._id); // Lấy ID phòng (_id hoặc id tùy backend)
         console.log("Fetching last messages for rooms:", roomIds);
         const lastMessagesData = await getLastMessagesApi(roomIds); // Lấy tin nhắn cuối
         console.log("Fetched last messages:", lastMessagesData);

         // --- Gộp dữ liệu ---
         const conversationsData = myRooms.map(room => {
           const roomId = room.id || room._id; // ID của phòng
           const lastMsg = lastMessagesData.find(msg => msg.room === roomId);
           const contactInfo = sampleContactData[roomId] || {}; // Lấy thêm statusText từ sample (tạm thời)

           return {
             id: roomId,
             type: room.type || (room.members && room.members.length > 2 ? 'group' : 'friend'), // Suy đoán type nếu API không trả về
             name: room.name || 'Unknown',
             avatar: room.avatar || null,
             lastMessage: lastMsg?.content || '',
             time: lastMsg?.createdAt ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '',
             // --- Logic Unread/Status cần API riêng hoặc WebSocket ---
             unread: 0, // Tạm thời
             status: null, // Tạm thời
             statusText: contactInfo.statusText || (room.type === 'group' ? `${room.members?.length || 0} members` : 'Offline') // Tạm thời
           };
         });
         // Sắp xếp lại theo thời gian tin nhắn cuối (tùy chọn)
         conversationsData.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

         setConversations(conversationsData);
         console.log("Processed conversations:", conversationsData);

      } else {
         setConversations([]);
      }

    } catch (err) {
      console.error("Error fetching initial chat data:", err);
      setError(err.message || 'Failed to load conversations.');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []); // Chỉ phụ thuộc vào fetchInitialData (không thay đổi)

  // --- Fetch dữ liệu ban đầu khi component mount ---
  useEffect(() => {
    fetchInitialData();
    // Logic dispatch event 'toggleMobileNav' hoặc set state nếu không dùng context (giữ nguyên)
    const toggleMobileNavVisibility = (hide) => { window.dispatchEvent(new CustomEvent('toggleMobileNav', { detail: { hideNav: hide } })); };
    toggleMobileNavVisibility(false);
    return () => toggleMobileNavVisibility(false);
  }, [fetchInitialData]);

  // --- Load tin nhắn chi tiết khi activeChat thay đổi ---
   useEffect(() => {
     const fetchMessages = async () => {
       if (activeChat && activeChat.id && currentUserIdRef.current) { // Đảm bảo có cả activeChat.id và userId
         console.log("Fetching messages for room:", activeChat.id);
         setIsLoadingMessages(true);
         setError(null);
         const isMobileView = window.innerWidth <= 768;
         if(isMobileView) setIsMobileChatActive(true);

         try {
           const fetchedMessages = await getMessagesByRoomIdApi(activeChat.id); // Gọi API lấy tin nhắn
           console.log("Fetched messages:", fetchedMessages);
           const formattedMessages = fetchedMessages.map(msg => ({
              id: msg._id,
              // <<< So sánh sender với currentUserId để xác định self/other >>>
              sender: msg.sender === currentUserIdRef.current ? 'self' : 'other',
              text: [msg.content],
              time: new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
              // senderName: ... // Lấy tên người gửi nếu là group
           }));
           setMessages(formattedMessages);
           console.log("Formatted messages:", formattedMessages);
         } catch (err) {
           console.error(`Error fetching messages for ${activeChat.id}:`, err);
           setError(err.message || `Failed to load messages.`);
           setMessages([]);
         } finally {
           setIsLoadingMessages(false);
         }
       } else {
         setMessages([]);
         if(activeChat === null) setIsMobileChatActive(false); // Chỉ tắt view mobile khi activeChat là null (nhấn back)
       }
     }
     fetchMessages();
   }, [activeChat, setIsMobileChatActive]); // Dependency là activeChat

  // --- Callback để xử lý click item ---
  const handleConversationClick = useCallback((type, id) => {
     const clickedConv = conversations.find(c => c.id === id);
     if (clickedConv) {
         // <<< Set activeChat đầy đủ thông tin >>>
         setActiveChat({
             id: clickedConv.id,
             type: clickedConv.type,
             name: clickedConv.name,
             avatar: clickedConv.avatar,
             statusText: clickedConv.statusText // Lấy statusText đã có từ list
         });
     }
  }, [conversations]);

  // --- Callback để xử lý nút back mobile ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null); // useEffect [activeChat] sẽ xử lý isMobileChatActive
  }, []);

  // --- Callback xử lý gửi tin nhắn ---
  const handleSendMessage = useCallback(async (newMessageText) => {
      // Đảm bảo có activeChat, id và user id
      if (!activeChat || !activeChat.id || !currentUserIdRef.current || sendingMessage) return;

      setSendingMessage(true);
      setError(null);
      const tempId = `temp-${Date.now()}`;

      // --- Optimistic Update ---
      const newMessageOptimistic = {
        id: tempId,
        sender: 'self', // Luôn là self khi gửi từ client này
        text: [newMessageText],
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
        status: 'sending'
      };
      setMessages(prevMessages => [...prevMessages, newMessageOptimistic]);
      // ------------------------

      try {
        // <<< Gọi API gửi tin nhắn >>>
        const sentMessage = await sendMessageApi(activeChat.id, newMessageText);
        console.log("Message sent successfully:", sentMessage);

        // --- Cập nhật tin nhắn với dữ liệu thật từ server ---
        setMessages(prevMessages => prevMessages.map(msg =>
          msg.id === tempId
            ? {
                ...newMessageOptimistic,
                id: sentMessage._id, // <<< ID thật từ server
                status: 'sent',    // <<< Trạng thái đã gửi
                time: new Date(sentMessage.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() // <<< Thời gian thật
              }
            : msg
        ));
        // --------------------------------------------------

        // <<< Cập nhật Last Message trong list (Cách đơn giản: fetch lại) >>>
        // Tốt hơn là cập nhật cục bộ hoặc dùng WebSocket
         fetchInitialData(); // Gọi lại để cập nhật last message và thứ tự

      } catch (err) {
        console.error("Failed to send message:", err);
        setError(err.message || 'Failed to send message.');
        // --- Đánh dấu tin nhắn gửi lỗi ---
        setMessages(prevMessages => prevMessages.map(msg =>
          msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg
        ));
        // ----------------------------------
      } finally {
        setSendingMessage(false);
      }
  }, [activeChat, sendingMessage, fetchInitialData]); // Thêm fetchInitialData vào dependency

  // --- Xử lý tìm kiếm (giữ nguyên) ---
  const handleSearchChange = (event) => { /* ... */ };
  const filteredGroups = groups.filter(group => {
    // Kiểm tra group và các thuộc tính tồn tại trước khi gọi hàm
    const nameMatch = group?.name && typeof group.name === 'string' && group.name.toLowerCase().includes(searchTerm);
    const messageMatch = group?.lastMessage && typeof group.lastMessage === 'string' && group.lastMessage.toLowerCase().includes(searchTerm);
    return nameMatch || messageMatch;
  });

  const filteredFriends = friends.filter(friend => {
    // Kiểm tra friend và các thuộc tính tồn tại trước khi gọi hàm
    const nameMatch = friend?.name && typeof friend.name === 'string' && friend.name.toLowerCase().includes(searchTerm);
    const messageMatch = friend?.lastMessage && typeof friend.lastMessage === 'string' && friend.lastMessage.toLowerCase().includes(searchTerm);
    return nameMatch || messageMatch;
  });
  // const filteredGroups = filteredConversations.filter(c => c.type === 'group'); // Không cần tách nữa nếu ConversationListPanel dùng conversations
  // const filteredFriends = filteredConversations.filter(c => c.type === 'friend');
  const currentActiveContact = activeChat ? sampleContactData[activeChat.id] : null;


  // --- Render ---
  return (
    <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>
      <ConversationListPanel
        groups={filteredGroups} // <<< Truyền mảng đã lọc (hoặc rỗng)
        friends={filteredFriends} // <<< Truyền mảng đã lọc (hoặc rỗng)
        onSearchChange={handleSearchChange}
        onItemClick={handleConversationClick}
        activeChat={activeChat}
      />
      <ChatWindow
         activeContact={currentActiveContact}
         messages={messages}
         onMobileBack={handleMobileBack}
         isMobile={isMobileChatActive}
         onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatPage;