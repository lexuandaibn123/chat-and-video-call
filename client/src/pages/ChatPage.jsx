// src/pages/ChatPage.jsx (using sample data version)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationListPanel from '../components/Chat/ConversationListPanel';
import ChatWindow from '../components/Chat/ChatWindow';
import ChatSettingsOverlay from '../components/Chat/ChatSettingsOverlay'; // <<< Import overlay component
// import { sendMessageApi, getMessagesByRoomIdApi, getLastMessagesApi } from '../api/messages'; // <<< Comment out API imports
// import { getMyRoomsApi } from '../api/rooms'; // <<< Comment out API imports
import '../components/Chat/Chat.scss';

// --- Dữ liệu mẫu để hiển thị giao diện ---
// Thêm trường 'members' và 'leader' vào dữ liệu mẫu cho group
// Giả định members là một mảng các object { _id, name, avatar }
// Giả định có 3 user mẫu: self-user-id, user-alice-id, user-bob-id, user-charlie-id, user-david-id
const sampleUsers = [
    { _id: 'self-user-id', name: 'You', avatar: 'https://via.placeholder.com/150/787878/FFFFFF?text=You' },
    { _id: 'user-alice-id', name: 'Alice Wonderland', avatar: 'https://via.placeholder.com/150/33C3FF/FFFFFF?text=Alice' },
    { _id: 'user-bob-id', name: 'Bob The Builder', avatar: 'https://via.placeholder.com/150/FFFF33/000000?text=Bob' },
    { _id: 'user-charlie-id', name: 'Charlie Chaplin', avatar: 'https://via.placeholder.com/150/8A33FF/FFFFFF?text=Charlie' },
    { _id: 'user-david-id', name: 'David Doe', avatar: 'https://via.placeholder.com/150/FF8A33/FFFFFF?text=David' },
    { _id: 'user-eve-id', name: 'Eve Adams', avatar: 'https://via.placeholder.com/150/33FFA1/FFFFFF?text=Eve' },
];

// Helper để tìm user theo ID trong sampleUsers
const findSampleUser = (userId) => sampleUsers.find(u => u._id === userId);

const sampleConversations = [
    {
        id: 'room-1',
        type: 'group',
        name: 'Project Alpha Team',
        avatar: 'https://via.placeholder.com/150/FF5733/FFFFFF?text=GroupA',
        lastMessage: 'Hey everyone, meeting at 3 PM?',
        time: '2:58 pm',
        unread: 3,
        status: null,
        statusText: '5 members',
        members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id'), findSampleUser('user-david-id'), findSampleUser('user-eve-id')].filter(Boolean), // Lấy user objects
        leader: 'self-user-id', // Giả định bạn là leader
    },
    {
        id: 'friend-abc',
        type: 'friend',
        name: 'Alice Wonderland',
        avatar: 'https://via.placeholder.com/150/33C3FF/FFFFFF?text=Alice',
        lastMessage: 'Sounds good! See you then.',
        time: '2:55 pm',
        unread: 0,
        status: 'online',
        statusText: 'Online',
        members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id')].filter(Boolean),
        leader: null, // Không có leader cho chat 1-1
    },
    {
        id: 'room-2',
        type: 'group',
        name: 'Weekly Sync',
        avatar: 'https://via.placeholder.com/150/33FF57/FFFFFF?text=GroupB',
        lastMessage: 'Don\'t forget to submit reports.',
        time: 'Yesterday',
        unread: 0,
        status: null,
        statusText: '8 members',
        members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id'), findSampleUser('user-david-id')].filter(Boolean),
        leader: 'user-alice-id', // Giả định Alice là leader
    },
    {
        id: 'friend-xyz',
        type: 'friend',
        name: 'Bob The Builder',
        avatar: 'https://via.placeholder.com/150/FFFF33/000000?text=Bob',
        lastMessage: 'Can we fix it?',
        time: 'Wed',
        unread: 1,
        status: 'offline',
        statusText: 'Offline',
        members: [findSampleUser('self-user-id'), findSampleUser('user-bob-id')].filter(Boolean),
        leader: null,
    },
    {
        id: 'friend-pqr',
        type: 'friend',
        name: 'Charlie Chaplin',
        avatar: 'https://via.placeholder.com/150/8A33FF/FFFFFF?text=Charlie',
        lastMessage: '...',
        time: 'Tue',
        unread: 0,
        status: 'online',
        statusText: 'Online',
         members: [findSampleUser('self-user-id'), findSampleUser('user-charlie-id')].filter(Boolean),
         leader: null,
    },
    {
        id: 'room-3',
        type: 'group',
        name: 'Team Social',
        avatar: 'https://via.placeholder.com/150/FF33A1/FFFFFF?text=GroupC',
        lastMessage: 'Pizza party this Friday!',
        time: 'Last Week',
        unread: 0,
        status: null,
        statusText: '12 members',
         members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id')].filter(Boolean),
         leader: 'user-bob-id', // Giả định Bob là leader
    },
    {
        id: 'room-3',
        type: 'group',
        name: 'Team Social',
        avatar: 'https://via.placeholder.com/150/FF33A1/FFFFFF?text=GroupC',
        lastMessage: 'Pizza party this Friday!',
        time: 'Last Week',
        unread: 0,
        status: null,
        statusText: '12 members',
         members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id')].filter(Boolean),
         leader: 'user-bob-id', // Giả định Bob là leader
    },
    {
        id: 'room-3',
        type: 'group',
        name: 'Team Social',
        avatar: 'https://via.placeholder.com/150/FF33A1/FFFFFF?text=GroupC',
        lastMessage: 'Pizza party this Friday!',
        time: 'Last Week',
        unread: 0,
        status: null,
        statusText: '12 members',
         members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id')].filter(Boolean),
         leader: 'user-bob-id', // Giả định Bob là leader
    },
    {
        id: 'room-3',
        type: 'group',
        name: 'Team Social',
        avatar: 'https://via.placeholder.com/150/FF33A1/FFFFFF?text=GroupC',
        lastMessage: 'Pizza party this Friday!',
        time: 'Last Week',
        unread: 0,
        status: null,
        statusText: '12 members',
         members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id')].filter(Boolean),
         leader: 'user-bob-id', // Giả định Bob là leader
    },
    {
        id: 'room-3',
        type: 'group',
        name: 'Team Social',
        avatar: 'https://via.placeholder.com/150/FF33A1/FFFFFF?text=GroupC',
        lastMessage: 'Pizza party this Friday!',
        time: 'Last Week',
        unread: 0,
        status: null,
        statusText: '12 members',
         members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id')].filter(Boolean),
         leader: 'user-bob-id', // Giả định Bob là leader
    },
    {
        id: 'room-3',
        type: 'group',
        name: 'Team Social',
        avatar: 'https://via.placeholder.com/150/FF33A1/FFFFFF?text=GroupC',
        lastMessage: 'Pizza party this Friday!',
        time: 'Last Week',
        unread: 0,
        status: null,
        statusText: '12 members',
         members: [findSampleUser('self-user-id'), findSampleUser('user-alice-id'), findSampleUser('user-bob-id')].filter(Boolean),
         leader: 'user-bob-id', // Giả định Bob là leader
    },
];

const sampleMessagesData = {
    'room-1': [
        { id: 'msg-1-1', sender: 'other', text: ['Hi team!'], time: '2:30 pm' }, // Tin nhắn này từ người khác trong nhóm
        { id: 'msg-1-2', sender: 'other', text: ['Meeting prep needed.'], time: '2:35 pm' },
        { id: 'msg-1-3', sender: 'self', text: ['Got it!'], time: '2:40 pm' }, // Tin nhắn từ bạn
        { id: 'msg-1-4', sender: 'other', text: ['Hey everyone,', 'meeting at 3 PM?'], time: '2:58 pm' },
    ],
    'friend-abc': [
        { id: 'msg-abc-1', sender: 'other', text: ['Hi Alice, how are you?'], time: '2:50 pm' },
        { id: 'msg-abc-2', sender: 'self', text: ['I\'m good, thanks!', 'Just working on the project.'], time: '2:52 pm' },
        { id: 'msg-abc-3', sender: 'other', text: ['Great!'], time: '2:53 pm' },
        { id: 'msg-abc-4', sender: 'other', text: ['Sounds good! See you then.'], time: '2:55 pm' },
    ],
     'room-2': [
        { id: 'msg-2-1', sender: 'other', text: ['Weekly reports are due today.'], time: 'Yesterday' },
        { id: 'msg-2-2', sender: 'self', text: ['Will submit mine shortly.'], time: 'Yesterday' },
        { id: 'msg-2-3', sender: 'other', text: ['Don\'t forget to submit reports.'], time: 'Yesterday' },
    ],
     'friend-xyz': [
        { id: 'msg-xyz-1', sender: 'other', text: ['Can we fix it?'], time: 'Wed' },
     ],
      'friend-pqr': [
        { id: 'msg-pqr-1', sender: 'other', text: ['...'], time: 'Tue' },
     ],
     'room-3': [
        { id: 'msg-3-1', sender: 'other', text: ['Pizza party this Friday!'], time: 'Last Week' },
     ]
};

// Dữ liệu user mẫu để tìm kiếm (những người KHÔNG có trong nhóm hiện tại)
// Cần lọc danh sách này khi thực hiện tìm kiếm thực tế
const sampleSearchableUsers = [
    { _id: 'user-new-1', name: 'New User One', avatar: 'https://via.placeholder.com/150/CCCCCC/000000?text=New1' },
    { _id: 'user-new-2', name: 'Another User', avatar: 'https://via.placeholder.com/150/AAAAAA/FFFFFF?text=New2' },
     { _id: 'user-new-3', name: 'Test Account', avatar: 'https://via.placeholder.com/150/BBBBBB/000000?text=New3' },
];


const ChatPage = () => {
  // --- State ---
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Giả lập trạng thái loading
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  // <<< State cho Overlay Cài đặt >>>
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false); // Trạng thái cho các action trong settings
  const [actionError, setActionError] = useState(null); // Lỗi cho các action trong settings
  const [addUserSearchResults, setAddUserSearchResults] = useState([]); // Kết quả tìm kiếm người dùng để thêm

  // <<< Lấy và lưu trữ User ID (Giả định) >>>
  const currentUserIdRef = useRef('self-user-id'); // ID giả định của người dùng hiện tại ('self-user-id')

  useEffect(() => {
     console.log("Current User ID (Sample):", currentUserIdRef.current);

    // Mô phỏng việc load dữ liệu ban đầu sau 1 khoảng thời gian
    const timer = setTimeout(() => {
        // Sắp xếp dữ liệu mẫu (logic đơn giản như trước)
         const sortedConversations = [...sampleConversations].sort((a, b) => {
             // Logic sắp xếp đơn giản dựa trên thời gian mẫu, cần phức tạp hơn nếu có định dạng khác
             const parseTime = (timeStr) => {
                 if (!timeStr || timeStr.includes('Yesterday') || timeStr.includes('Wed') || timeStr.includes('Tue') || timeStr.includes('Last Week')) return new Date(0); // Đặt ngày cũ nhất cho các định dạng này
                 try {
                     // Cố gắng parse định dạng hh:mm am/pm
                     return new Date(`1970/01/01 ${timeStr.replace(' am', ' AM').replace(' pm', ' PM')}`);
                 } catch (e) {
                     return new Date(0); // Fallback nếu parse lỗi
                 }
             };
              return parseTime(b.time).getTime() - parseTime(a.time).getTime(); // Mới nhất lên đầu
        });

        setConversations(sortedConversations);
        setIsLoadingConversations(false);
         console.log("Loaded sample conversations:", sortedConversations);
    }, 500); // Mô phỏng delay load 0.5 giây

    // Logic dispatch event 'toggleMobileNav'
    const toggleMobileNavVisibility = (hide) => { window.dispatchEvent(new CustomEvent('toggleMobileNav', { detail: { hideNav: hide } })); };
    toggleMobileNavVisibility(true); // Tắt nav khi vào trang chat

    return () => {
        clearTimeout(timer); // Đảm bảo timer được xóa khi unmount
        toggleMobileNavVisibility(false); // Bật lại khi rời trang
    }

  }, []);

  // --- Load tin nhắn chi tiết khi activeChat thay đổi (Dùng dữ liệu mẫu) ---
   useEffect(() => {
     const loadMessages = () => {
         if (activeChat && activeChat.id) {
            console.log("Loading sample messages for room:", activeChat.id);
            setIsLoadingMessages(true); // Giả lập loading messages
            const isMobileView = window.innerWidth <= 768;
            if(isMobileView) setIsMobileChatActive(true);

            // Mô phỏng delay load tin nhắn
            const messageTimer = setTimeout(() => {
                // Lấy tin nhắn mẫu dựa trên activeChat.id
                const fetchedMessages = sampleMessagesData[activeChat.id] || [];
                 setMessages(fetchedMessages);
                 setIsLoadingMessages(false);
                 console.log("Loaded sample messages:", fetchedMessages);
            }, 300); // Mô phỏng delay load 0.3 giây

            return () => clearTimeout(messageTimer); // Cleanup message timer

           } else {
             // Reset messages và trạng thái mobile khi activeChat là null (nhấn back)
             setMessages([]);
             setIsLoadingMessages(false);
             if(activeChat === null) {
                 setIsMobileChatActive(false);
             }
           }
     };
     loadMessages();

   }, [activeChat, setIsMobileChatActive]); // Dependency là activeChat

  // --- Callback để xử lý click item (Giữ nguyên logic) ---
  const handleConversationClick = useCallback((type, id) => {
     const clickedConv = conversations.find(c => c.id === id);
     if (clickedConv) {
         // Set activeChat đầy đủ thông tin từ object tìm được trong state conversations
         setActiveChat({
             id: clickedConv.id,
             type: clickedConv.type,
             name: clickedConv.name,
             avatar: clickedConv.avatar,
             statusText: clickedConv.statusText,
             // Thêm thông tin members và leader cho group chat settings
             members: clickedConv.members,
             leader: clickedConv.leader
         });
         // Đóng settings overlay nếu đang mở
         setIsSettingsOpen(false);
         // Reset unread count cho cuộc trò chuyện này (Mô phỏng)
         setConversations(prev => prev.map(c => c.id === id ? {...c, unread: 0} : c));
     }
  }, [conversations]); // Dependency là conversations state

  // --- Callback để xử lý nút back mobile (Giữ nguyên) ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null); // Setting activeChat to null triggers the useEffect above
    // Đóng settings overlay nếu đang mở khi nhấn back
    setIsSettingsOpen(false);
  }, []);

  // --- Callback xử lý gửi tin nhắn (Mô phỏng) ---
  const handleSendMessage = useCallback((newMessageText) => {
      if (!activeChat || !activeChat.id || !newMessageText.trim()) {
          console.warn("Cannot send empty message or no active chat.");
          return;
      }

      // Tạo tin nhắn mới giả định (luôn là self)
      const newMessage = {
        id: `temp-${Date.now()}`, // ID tạm
        sender: 'self', // Luôn là self khi gửi từ client này
        text: [newMessageText],
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
        status: 'sent' // Giả định gửi thành công ngay
      };

      // Thêm tin nhắn mới vào danh sách tin nhắn
      setMessages(prevMessages => [...prevMessages, newMessage]);

      // Mô phỏng cập nhật Last Message và thứ tự trong danh sách conversations
      setConversations(prevConversations => {
          const updatedConversations = prevConversations.map(conv =>
              conv.id === activeChat.id
                  ? {
                      ...conv,
                      lastMessage: newMessageText,
                      time: newMessage.time // Sử dụng thời gian của tin nhắn vừa gửi
                    }
                  : conv
          );
          // Sắp xếp lại danh sách để cuộc trò chuyện vừa gửi lên đầu
          updatedConversations.sort((a, b) => {
               const parseTime = (timeStr) => {
                 if (!timeStr || timeStr.includes('Yesterday') || timeStr.includes('Wed') || timeStr.includes('Tue') || timeStr.includes('Last Week')) return new Date(0); // Đặt ngày cũ nhất cho các định dạng này
                 try {
                     return new Date(`1970/01/01 ${timeStr.replace(' am', ' AM').replace(' pm', ' PM')}`);
                 } catch (e) {
                     return new Date(0); // Fallback nếu parse lỗi
                 }
             };
               const timeA = parseTime(a.time).getTime();
               const timeB = parseTime(b.time).getTime();
               return timeB - timeA; // Mới nhất lên đầu
          });
          return updatedConversations;
      });

       console.log("Sample message sent:", newMessage);

  }, [activeChat]);

  // --- Xử lý tìm kiếm (Giữ nguyên) ---
  const handleSearchChange = useCallback((event) => {
       setSearchTerm(event.target.value.toLowerCase());
  }, []);

  // Lọc danh sách conversations dựa trên searchTerm
  const filteredConversations = conversations.filter(conv => {
       const nameMatch = conv?.name && typeof conv.name === 'string' && conv.name.toLowerCase().includes(searchTerm);
       const messageMatch = conv?.lastMessage && typeof conv.lastMessage === 'string' && conv.lastMessage.toLowerCase().includes(searchTerm);
       return nameMatch || messageMatch;
  });

  // Tách danh sách đã lọc thành nhóm và bạn bè
  const filteredGroups = filteredConversations.filter(c => c.type === 'group');
  const filteredFriends = filteredConversations.filter(c => c.type === 'friend');

  // --- Handlers cho Overlay Cài đặt ---
  const handleOpenSettings = useCallback(() => {
      // Chỉ mở settings nếu activeChat là group
      if (activeChat && activeChat.type === 'group') {
         setIsSettingsOpen(true);
         setActionError(null); // Reset lỗi khi mở settings
         setAddUserSearchResults([]); // Reset kết quả tìm kiếm khi mở settings
      }
  }, [activeChat]);

  const handleCloseSettings = useCallback(() => {
      setIsSettingsOpen(false);
      setActionError(null); // Reset lỗi khi đóng settings
      setAddUserSearchResults([]); // Reset kết quả tìm kiếm
  }, []);

  // --- Mock API Actions cho Group Settings ---

  const mockPerformAction = async (actionFunc, ...args) => {
       setIsPerformingAction(true);
       setActionError(null);
       try {
           // Mô phỏng delay API
           await new Promise(resolve => setTimeout(resolve, 800));
           await actionFunc(...args);
           // Cập nhật state conversation để UI reflect changes (members, leader)
            // Tìm và cập nhật activeChat trong danh sách conversations
           setConversations(prevConversations => prevConversations.map(conv =>
               conv.id === activeChat.id ? { ...activeChat, ...args[args.length - 1] } : conv // Sử dụng các args cuối cùng để cập nhật activeChat
           ));
            // Cập nhật state activeChat
           setActiveChat(prevActiveChat => ({...prevActiveChat, ...args[args.length - 1]}));

            console.log("Action successful:", args);
       } catch (err) {
           setActionError(err.message || "An error occurred.");
           console.error("Mock action failed:", err);
           throw err; // Ném lỗi để component gọi biết (ví dụ: form)
       } finally {
           setIsPerformingAction(false);
       }
  };


  const handleRemoveUser = useCallback(async (roomId, userIdToRemove) => {
       console.log(`Mock API: Removing user ${userIdToRemove} from room ${roomId}`);
       // API removeUser: req.body = { roomId, userIdToRemove }
       // Backend kiểm tra leader, không phải leader không xoá được
       // Backend kiểm tra không xoá leader, không xoá người không có trong phòng
       // Backend trả về success: true hoặc error
       // Sau khi xoá thành công, frontend cần cập nhật danh sách members trong activeChat

       // Mô phỏng logic backend
       if (roomId !== activeChat?.id || !activeChat.members.find(m => m._id === userIdToRemove)) {
           throw new Error("User not found in group.");
       }
       if (currentUserIdRef.current !== activeChat.leader) {
           throw new Error("Only the leader can remove users.");
       }
        if (userIdToRemove === activeChat.leader) {
           throw new Error("Cannot remove leader from group.");
       }

       // Mô phỏng cập nhật state sau khi thành công
       const updatedMembers = activeChat.members.filter(m => m._id !== userIdToRemove);

       // Sử dụng mockPerformAction để xử lý loading/error và cập nhật state
        await mockPerformAction(
           async () => { /* Mô phỏng API call thành công */ },
           { members: updatedMembers } // Dữ liệu cần cập nhật vào activeChat
       );


  }, [activeChat, currentUserIdRef, mockPerformAction]); // Thêm mockPerformAction vào dependencies

   const handleChangeLeader = useCallback(async (roomId, newLeaderId) => {
        console.log(`Mock API: Changing leader of room ${roomId} to ${newLeaderId}`);
        // API changeLeader: req.body = { roomId, newLeaderId }
        // Backend kiểm tra người gọi có phải leader cũ không
        // Backend kiểm tra newLeaderId có trong members không
        // Sau khi đổi leader thành công, frontend cần cập nhật leader trong activeChat

        // Mô phỏng logic backend
        if (roomId !== activeChat?.id || !activeChat.members.find(m => m._id === newLeaderId)) {
            throw new Error("New leader must be a member.");
        }
        if (currentUserIdRef.current !== activeChat.leader) {
           throw new Error("Only the current leader can change the leader.");
       }
        if (newLeaderId === activeChat.leader) {
           throw new Error("User is already the leader.");
        }


        // Mô phỏng cập nhật state sau khi thành công
        // Sử dụng mockPerformAction để xử lý loading/error và cập nhật state
        await mockPerformAction(
            async () => { /* Mô phỏng API call thành công */ },
            { leader: newLeaderId } // Dữ liệu cần cập nhật vào activeChat
        );

   }, [activeChat, currentUserIdRef, mockPerformAction]); // Thêm mockPerformAction vào dependencies


   const handleAddUserSearch = useCallback(async (searchTerm) => {
       console.log(`Mock API: Searching for users with term "${searchTerm}"`);
       // API findRoomByName/searchUsers (cần endpoint mới): nhận searchTerm, trả về users matching name/username
       // Cần lọc ra những user ĐÃ CÓ trong nhóm hiện tại

       setIsPerformingAction(true);
       setActionError(null);
       setAddUserSearchResults([]); // Clear previous results

       try {
           await new Promise(resolve => setTimeout(resolve, 500)); // Simulate search delay

           // Lọc users từ sampleSearchableUsers + sampleUsers (trừ người hiện tại)
           // Loại bỏ người đã có trong nhóm activeChat
           const usersNotInGroup = sampleUsers
                .filter(user => user._id !== currentUserIdRef.current && !activeChat?.members.some(member => member._id === user._id))
                .concat(sampleSearchableUsers) // Thêm cả users chỉ có trong searchable
                .filter((user, index, self) => // Loại bỏ trùng lặp nếu có ID giống nhau
                     index === self.findIndex((u) => ( u._id === user._id ))
                )


           const results = usersNotInGroup.filter(user =>
               user.name.toLowerCase().includes(searchTerm.toLowerCase())
           );

           setAddUserSearchResults(results);
            console.log("Mock search results:", results);

       } catch (err) {
           setActionError(err.message || "Search failed.");
           console.error("Mock search failed:", err);
           setAddUserSearchResults([]);
       } finally {
           setIsPerformingAction(false);
       }
   }, [activeChat, currentUserIdRef]); // Thêm activeChat và currentUserIdRef

   const handleAddUserConfirm = useCallback(async (roomId, userIdToAdd) => {
       console.log(`Mock API: Adding user ${userIdToAdd} to room ${roomId}`);
       // API addUser: req.body = { roomId, userIdToAdd }
       // Backend kiểm tra leader, kiểm tra user có tồn tại không, kiểm tra user đã có trong phòng chưa
       // Sau khi thêm thành công, frontend cần cập nhật danh sách members trong activeChat

       // Tìm user object từ danh sách mẫu
       const userToAdd = sampleUsers.find(u => u._id === userIdToAdd) || sampleSearchableUsers.find(u => u._id === userIdToAdd);
       if (!userToAdd) {
            throw new Error("User not found.");
       }

        // Mô phỏng logic backend
        if (roomId !== activeChat?.id) {
            throw new Error("Invalid room ID.");
        }
         if (currentUserIdRef.current !== activeChat.leader) {
           throw new Error("Only the leader can add users.");
       }
       if (activeChat.members.some(m => m._id === userIdToAdd)) {
           throw new Error("User is already in this group.");
       }


        // Mô phỏng cập nhật state sau khi thành công
        const updatedMembers = [...activeChat.members, userToAdd];
         // Sắp xếp lại members theo tên (tùy chọn)
        updatedMembers.sort((a, b) => a.name.localeCompare(b.name));


        // Sử dụng mockPerformAction để xử lý loading/error và cập nhật state
        await mockPerformAction(
            async () => { /* Mô phỏng API call thành công */ },
            { members: updatedMembers, statusText: `${updatedMembers.length} members` } // Cập nhật members và statusText
        );

        // Clear search results and selected user after successful add
        setAddUserSearchResults([]);
        // setSelectedUserToAdd(null); // Handled by ChatSettingsOverlay internal state after calling this prop


   }, [activeChat, currentUserIdRef, mockPerformAction]); // Thêm activeChat, currentUserIdRef, mockPerformAction


  // --- Render ---
  return (
    <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>

      {isLoadingConversations ? (
           <div className="loading-overlay">Loading conversations...</div>
      ) : (
          <>
             <ConversationListPanel
                 groups={filteredGroups}
                 friends={filteredFriends}
                 onSearchChange={handleSearchChange}
                 onItemClick={handleConversationClick}
                 activeChat={activeChat}
             />
             <ChatWindow
                  activeContact={activeChat}
                  messages={messages}
                  onMobileBack={handleMobileBack}
                  isMobile={isMobileChatActive}
                  onSendMessage={handleSendMessage}
                  isLoadingMessages={isLoadingMessages}
                  // <<< Truyền hàm mở cài đặt xuống ChatWindow >>>
                  onOpenSettings={activeChat?.type === 'group' ? handleOpenSettings : null} // Chỉ truyền nếu là group
             />

              {/* <<< Hiển thị Settings Overlay nếu đang mở và active chat là group >>> */}
              {isSettingsOpen && activeChat?.type === 'group' && (
                  <ChatSettingsOverlay
                      group={activeChat} // Truyền object group hiện tại
                      currentUserId={currentUserIdRef.current} // Truyền ID người dùng hiện tại
                      onClose={handleCloseSettings} // Hàm đóng overlay
                      onRemoveUser={handleRemoveUser} // Hàm xoá thành viên
                      onChangeLeader={handleChangeLeader} // Hàm đổi trưởng nhóm
                      onAddUserSearch={handleAddUserSearch} // Hàm tìm kiếm người dùng
                      onAddUserConfirm={handleAddUserConfirm} // Hàm xác nhận thêm người dùng
                      isPerformingAction={isPerformingAction} // Trạng thái loading action
                      actionError={actionError} // Lỗi action
                      searchResults={addUserSearchResults} // Kết quả tìm kiếm để thêm
                  />
              )}
          </>
      )}
    </div>
  );
};

export default ChatPage;