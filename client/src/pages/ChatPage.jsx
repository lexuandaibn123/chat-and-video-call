// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import ConversationListPanel from '../components/Chat/ConversationListPanel';
import ChatWindow from '../components/Chat/ChatWindow';
// <<< Đổi đường dẫn import SCSS cho đúng vị trí file >>>
import '../components/Chat/Chat.scss';

// --- Dữ liệu mẫu (NÊN thay thế bằng API calls) ---
// <<< Đã cập nhật: avatar là null để test placeholder >>>
const sampleGroups = [
    { id: 'g1', name: 'Friends Forever', lastMessage: 'Hahahahah!', time: 'Today, 9:52pm', unread: 4, avatar: null },
    { id: 'g2', name: 'Mera Gang', lastMessage: 'Kyuuuuu???', time: 'Yesterday, 12:31pm', unread: 0, avatar: null },
    { id: 'g3', name: 'Hiking', lastMessage: 'It\'s not going to happen', time: 'Wednesday, 9:12am', unread: 0, avatar: null },
];

const sampleFriends = [
    { id: 'f1', name: 'Anil', lastMessage: 'April fool\'s day', time: 'Today, 9:52pm', status: 'sent-read', avatar: null },
    { id: 'f2', name: 'Chuuthiya', lastMessage: 'Baag', time: 'Today, 12:11pm', unread: 1, avatar: null },
    { id: 'f3', name: 'Mary ma\'am', lastMessage: 'You have to report it...', time: 'Today, 2:40pm', unread: 1, avatar: null },
    { id: 'f4', name: 'Bill Gates', lastMessage: 'Nevermind bro', time: 'Yesterday, 12:31pm', unread: 5, avatar: null },
    { id: 'f5', name: 'Victoria H', lastMessage: 'Okay, brother. let\'s see...', time: 'Wednesday, 11:12am', status: 'sent-read', avatar: null },
];

const sampleMessagesData = {
    'f1': [
        { id: 'm1', sender: 'other', text: ['Hey There!', 'How are you?'], time: '8:30pm' },
        { id: 'm2', sender: 'self', text: ['Hello!'], time: '8:33pm' },
        { id: 'm3', sender: 'self', text: ['I am fine and how are you?'], time: '8:34pm' },
        { id: 'm4', sender: 'other', text: ['I am doing well, Can we meet tomorrow?'], time: '8:36pm' },
        { id: 'm5', sender: 'self', text: ['Yes Sure!'], time: '8:58pm' },
         // Thêm nhiều tin nhắn để test cuộn
        { id: 'm6', sender: 'other', text: ['Great! See you then.'], time: '9:02pm' },
        { id: 'm7', sender: 'self', text: ['Okay, looking forward to it.'], time: '9:05pm' },
        { id: 'm8', sender: 'other', text: ['Remember to bring the documents.'], time: '9:10pm' },
        { id: 'm9', sender: 'self', text: ['Sure, I won\'t forget.'], time: '9:11pm' },
        { id: 'm10', sender: 'other', text: ['Perfect!'], time: '9:12pm' },
        { id: 'm11', sender: 'self', text: ['Have a good night!'], time: '9:15pm' },
        { id: 'm12', sender: 'other', text: ['You too! Bye.'], time: '9:16pm' },
    ],
    'f2': [ { id: 'm_f2_1', sender: 'other', text: ['Hi!'], time: '1:00pm' } ],
    'f3': [ { id: 'm_f3_1', sender: 'self', text: ['Regarding the report...'], time: '2:30pm' } ],
    'g1': [
        { id: 'm_g1_1', sender: 'other', senderName: 'Anil', text: ['Party tonight? 🎉'], time: '9:00pm' },
        { id: 'm_g1_2', sender: 'other', senderName: 'Mary', text: ['I\'m in!'], time: '9:01pm' },
        { id: 'm_g1_3', sender: 'self', text: ['Let\'s do it! Where?'], time: '9:05pm' }
    ],
};

// <<< Đã cập nhật: avatar là null để test placeholder >>>
const sampleContactData = {
    'f1': { id: 'f1', type:'friend', name: 'Anil', statusText: 'Online - Last seen, 2.02pm', avatar: null },
    'f2': { id: 'f2', type:'friend', name: 'Chuuthiya', statusText: 'Offline', avatar: null },
    'f3': { id: 'f3', type:'friend', name: 'Mary ma\'am', statusText: 'Typing...', avatar: null },
    'f4': { id: 'f4', type:'friend', name: 'Bill Gates', statusText: 'Last seen yesterday', avatar: null },
    'f5': { id: 'f5', type:'friend', name: 'Victoria H', statusText: 'Online', avatar: null },
    'g1': { id: 'g1', type:'group', name: 'Friends Forever', statusText: 'Anil, Mary, You', avatar: null },
    'g2': { id: 'g2', type:'group', name: 'Mera Gang', statusText: 'You added John', avatar: null },
    'g3': { id: 'g3', type:'group', name: 'Hiking', statusText: 'Archived', avatar: null },
};
// --------------------------------------------------

const ChatPage = () => {
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  // --- Load dữ liệu ban đầu ---
  useEffect(() => {
    console.log("Fetching initial data...");
    setGroups(sampleGroups);
    setFriends(sampleFriends);
  }, []);

  // --- Load tin nhắn và quản lý view mobile khi activeChat thay đổi ---
   useEffect(() => {
     if (activeChat && activeChat.id) {
       console.log("Loading messages for:", activeChat);
       const chatMessages = sampleMessagesData[activeChat.id] || [];
       setMessages(chatMessages);

       // <<< Chỉ tự động chuyển view trên màn hình nhỏ >>>
       const isMobileView = window.innerWidth <= 768; // Sử dụng breakpoint của bạn
       if (isMobileView) {
           setIsMobileChatActive(true);
       }
     } else {
       setMessages([]);
       // Nếu không còn active chat nào (ví dụ khi nhấn back), đảm bảo view mobile quay lại list
       setIsMobileChatActive(false);
     }
     // <<< Thêm isMobileChatActive vào dependency nếu bạn muốn logic phức tạp hơn,
     // nhưng hiện tại chỉ dựa vào activeChat là đủ >>>
   }, [activeChat]);

  // --- Callback để xử lý click item ---
  const handleConversationClick = useCallback((type, id) => {
    // Chỉ cần set activeChat, useEffect sẽ xử lý phần còn lại
    setActiveChat({ type, id });
  }, []);

  // --- Callback để xử lý nút back mobile ---
  const handleMobileBack = useCallback(() => {
    // Khi nhấn back, xóa active chat và tắt view mobile chat
    setActiveChat(null); // <<<< Quan trọng: useEffect sẽ chạy lại và set isMobileChatActive = false
    // setIsMobileChatActive(false); // Không cần set trực tiếp ở đây nữa
  }, []);

  // --- Callback xử lý gửi tin nhắn ---
  const handleSendMessage = useCallback((newMessageText) => {
      if (!activeChat || !activeChat.id) return;

      console.log(`Sending message to ${activeChat.type} ${activeChat.id}:`, newMessageText);
      const newMessage = {
        id: `m${Date.now()}`,
        sender: 'self',
        text: [newMessageText],
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);

      // TODO: Gọi API để gửi tin nhắn lên server
      // TODO: Cập nhật lastMessage trong danh sách (optional)

  }, [activeChat]);

  // --- Xử lý tìm kiếm ---
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm) ||
    group.lastMessage?.toLowerCase().includes(searchTerm)
  );
  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm) ||
    friend.lastMessage?.toLowerCase().includes(searchTerm)
  );

  // Lấy thông tin contact đang active
  const currentActiveContact = activeChat ? sampleContactData[activeChat.id] : null;


  return (
    // Thêm class động vào container chính dựa trên state mobile
    <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>
      <ConversationListPanel
        groups={filteredGroups}
        friends={filteredFriends}
        onSearchChange={handleSearchChange}
        onItemClick={handleConversationClick}
        activeChat={activeChat}
      />
      <ChatWindow
         activeContact={currentActiveContact}
         messages={messages}
         onMobileBack={handleMobileBack}
         // <<< Truyền thẳng isMobileChatActive vào prop isMobile >>>
         isMobile={isMobileChatActive}
         onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatPage;