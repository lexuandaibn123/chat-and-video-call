// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationListPanel from '../components/Chat/ConversationListPanel';
import ChatWindow from '../components/Chat/ChatWindow';
import ChatSettingsOverlay from '../components/Chat/ChatSettingsOverlay';

// <<< Cập nhật Import API functions >>>
import {
    createConversationApi,
    getMyRoomsApi,
    searchConversationsByNameApi,
    addNewMemberApi,
    removeMemberApi,
    updateMemberRoleApi,
    leaveConversationApi,
    deleteConversationMemberApi,
    deleteGroupApi,
    updateConversationNameApi,
    getMessagesByRoomIdApi,
    sendMessageApi,
    editMessageApi,
    deleteMessageApi,
} from '../api/conversations';

import { searchUsersApi, getUserDetailsApi } from '../api/users';
import { infoApi } from '../api/auth';

// <<< IMPORT MOCK UPLOAD API >>>
import { mockUploadFileApi } from '../api/upload'; // <<< Import mock upload API

import '../components/Chat/Chat.scss';

// Giả định useAuth hook: user object có _id
// import { useAuth } from '../context/AuthContext';


const ChatPage = () => {
  // --- State ---
  const [conversations, setConversations] = useState([]);
  // activeChat: thông tin chi tiết conversation, members đã populated
  // activeChat.detailedMembers: mảng members với user ID đã trim (.id)
  const [activeChat, setActiveChat] = useState(null);
  // messages: mảng messages với sender ID đã trim (.senderId) và trạng thái (.status)
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  // sendingMessage state can now also cover file uploads
  const [sendingMessage, setSendingMessage] = useState(false); // Or a more specific state like isSendingText, isUploadingFile

  const [error, setError] = useState(null); // State lỗi chung

  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  // <<< State cho Overlay Cài đặt Group >>>
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  // addUserSearchResults: mảng user objects từ search API { _id, ... }
  const [addUserSearchResults, setAddUserSearchResults] = useState([]);

  // currentUserIdRef: Lưu user ID đã trim
  const currentUserIdRef = useRef(null);


  // --- MOCK useAuth HOOK (hoặc Auth Hook thật của bạn) ---
  const [mockAuth, setMockAuth] = useState({ user: null, isAuthenticated: false, isLoading: true });

   // EFFECT 1: Kiểm tra xác thực ban đầu khi component mount
   useEffect(() => {
       const checkAuthStatus = async () => {
           try {
               const userInfoResponse = await infoApi();
               if (userInfoResponse && userInfoResponse.success && userInfoResponse.userInfo) {
                    const userId = userInfoResponse.userInfo.id ? String(userInfoResponse.userInfo.id).trim() : null;
                    const authenticatedUser = userId ? { _id: userId, ...userInfoResponse.userInfo } : null;

                    if (authenticatedUser) {
                         setMockAuth({ user: authenticatedUser, isAuthenticated: true, isLoading: false });
                         currentUserIdRef.current = authenticatedUser._id;
                         console.log("Mock Auth check: User authenticated.", authenticatedUser);
                    } else {
                         console.error("Mock Auth check: User ID is missing or invalid from API.");
                         setMockAuth({ user: null, isAuthenticated: false, isLoading: false });
                         currentUserIdRef.current = null;
                    }
               } else {
                   setMockAuth({ user: null, isAuthenticated: false, isLoading: false });
                   currentUserIdRef.current = null;
                    console.log("Mock Auth check: User not authenticated.");
               }
           } catch (err) {
               console.error("Mock Auth check Error:", err);
               setMockAuth({ user: null, isAuthenticated: false, isLoading: false });
               currentUserIdRef.current = null;
               console.log("Mock Auth check: User not authenticated due to error.");
           }
       };
       checkAuthStatus();
   }, []); // Effect này chỉ chạy 1 lần khi component mount

   const { user, isAuthenticated, isLoading: isAuthLoading } = mockAuth;


  // Callback để fetch initial conversations
  const fetchInitialData = useCallback(async () => {
    const currentUserId = user?._id;

    if (!currentUserId) {
        console.warn("fetchInitialData: User ID is not set.");
        return;
    }

    console.log("Fetching initial rooms for user:", currentUserId);
    setIsLoadingConversations(true);
    setError(null);

    try {
      const rooms = await getMyRoomsApi();

      if (rooms && Array.isArray(rooms)) {
         const conversationsData = rooms.map(room => {
           const roomId = room._id;
           const isGroup = room.isGroup;
           const latestMessage = room.latestMessage;

           let conversationName = room.name;
           let conversationAvatar = room.avatar || null;
           let conversationType = isGroup ? 'group' : 'friend';

           const processedMembers = room.members?.map(m => ({
               ...m,
               id: (m.id && typeof m.id === 'object' && m.id._id) ? String(m.id._id).trim() : (typeof m.id === 'string' ? m.id.trim() : null)
           })) || [];


           const activeMembers = processedMembers?.filter(m => m.leftAt === null) || [];
           let conversationStatusText = isGroup ? `${activeMembers.length} members` : 'Offline';

           if (!isGroup && processedMembers && processedMembers.length === 2) {
               const otherMember = processedMembers.find(member => member.id && member.id !== currentUserId);
               if (otherMember && otherMember.id) {
                   const originalMemberData = room.members?.find(m => m.id?._id === otherMember.id);
                    conversationName = originalMemberData?.id?.fullName || originalMemberData?.id?.email || 'Unknown User';
                    conversationAvatar = originalMemberData?.id?.avatar || null;
               } else if (processedMembers.length === 1 && processedMembers[0].id === currentUserId) {
                   const originalMemberData = room.members?.find(m => m.id?._id === processedMembers[0].id);
                   conversationName = room.name || originalMemberData?.id?.fullName || 'Self Chat';
                   conversationAvatar = room.avatar || originalMemberData?.id?.avatar || null;
               } else {
                   conversationName = room.name || 'Unknown User';
                   conversationAvatar = room.avatar || null;
               }
           }

            const leaderMember = processedMembers?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
            const leaderId = leaderMember ? leaderMember.id : null;


           return {
             id: roomId,
             type: conversationType,
             name: conversationName || 'Unknown Conversation',
             avatar: conversationAvatar,
             lastMessage: latestMessage ?
                           (latestMessage.type === 'text' ? latestMessage.content?.text?.data || '' : `[${latestMessage.type.toUpperCase()}]`)
                           : '',
             time: latestMessage?.datetime_created ? new Date(latestMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '',
             createdAt: room.datetime_created,
             latestMessage: latestMessage?._id || null,
             latestMessageTimestamp: latestMessage?.datetime_created || room.datetime_created,
             unread: 0,
             status: null,
             statusText: conversationStatusText,
             members: room.members || [],
             leader: leaderId,
             isGroup: isGroup,
             detailedMembers: processedMembers,
           };
         });

         conversationsData.sort((a, b) => {
             const dateA = new Date(a.latestMessageTimestamp || 0);
             const dateB = new Date(b.latestMessageTimestamp || 0);
             return dateB.getTime() - dateA.getTime();
         });

         setConversations(conversationsData);
         console.log("Processed conversations:", conversationsData);

      } else {
         setConversations([]);
         console.log("No rooms found for user.");
      }

    } catch (err) {
      console.error("Error fetching initial chat data:", err);
       if (err.message.includes("HTTP error! status: 401") || err.message.includes("not authenticated")) {
             setError("Authentication failed. Please login again.");
       } else {
            setError(err.message || 'Failed to load conversations.');
       }
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);


  // EFFECT 2: Kích hoạt fetchInitialData
  useEffect(() => {
      console.log("Auth state check for initial fetch:", { isAuthLoading, isAuthenticated, userId: user?._id });
      if (!isAuthLoading && isAuthenticated && user?._id) {
           console.log("Auth complete and user ID available. Triggering fetchInitialData...");
           fetchInitialData();
           setError(null);
      } else if (!isAuthLoading && !isAuthenticated) {
           console.warn("Auth complete but user not authenticated. Cannot fetch chat data.");
           setError("User not authenticated. Please login.");
           setIsLoadingConversations(false);
           setConversations([]);
           setActiveChat(null);
           setMessages([]);
           setIsMobileChatActive(false);
      }
  }, [isAuthLoading, isAuthenticated, user?._id, fetchInitialData]);


   // EFFECT 3: Xử lý mobile nav toggle
   useEffect(() => {
       const toggleMobileNavVisibility = (hide) => { window.dispatchEvent(new CustomEvent('toggleMobileNav', { detail: { hideNav: hide } })); };
       toggleMobileNavVisibility(true);
       return () => toggleMobileNavVisibility(false);
   }, []);


  // --- Load tin nhắn chi tiết khi activeChat thay đổi ---
   useEffect(() => {
     const currentUserId = user?._id;

     const fetchMessages = async (userId) => {
       if (!activeChat?.id || !userId) {
         console.warn("fetchMessages: No active chat or user ID.");
         setMessages([]);
         setIsLoadingMessages(false);
         if(activeChat === null) {
             setIsMobileChatActive(false);
         }
         return;
       }

       console.log("Fetching messages for room:", activeChat.id, "for user:", userId);
       setIsLoadingMessages(true);

       const isMobileView = window.innerWidth <= 768;
       if(isMobileView) setIsMobileChatActive(true);

       try {
         const messages = await getMessagesByRoomIdApi({ conversationId: activeChat.id, limit: 100, skip: 0 });

         if (messages && Array.isArray(messages)) {
            const formattedMessages = messages.map(msg => {
               let messageSenderId = null;
               if (msg.senderId) {
                   if (typeof msg.senderId === 'object' && msg.senderId._id) {
                       messageSenderId = String(msg.senderId._id).trim();
                   } else if (typeof msg.senderId === 'string') {
                       messageSenderId = String(msg.senderId).trim();
                   }
               }

               return ({
                   id: msg._id,
                   type: msg.type,
                   content: msg.content, // Keep original content structure from API
                   text: msg.type === 'text' && msg.content?.text?.data ? [msg.content.text.data] : [`[${msg.type.toUpperCase()}]`], // Placeholder text prop
                   time: msg.datetime_created ? new Date(msg.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '',
                   createdAt: msg.datetime_created,
                   isEdited: msg.isEdited || false,
                   isDeleted: msg.isDeleted || false,
                   senderId: messageSenderId, // Store trimmed sender ID
                   senderName: msg.senderId?.fullName,
                   senderAvatar: msg.senderId?.avatar,
               });
            });

            formattedMessages.reverse(); // Đảo ngược

            setMessages(formattedMessages);
            console.log("Formatted messages (oldest first):", formattedMessages);

         } else {
            setMessages([]);
         }

       } catch (err) {
         console.error(`Error fetching messages for ${activeChat.id}:`, err);
          if (err.message.includes("HTTP error! status: 401")) {
               setError("Session expired. Please login again.");
          } else {
              setError(err.message || `Failed to load messages.`);
          }
         setMessages([]);
       } finally {
         setIsLoadingMessages(false);
       }
     }
     if (activeChat && currentUserId) {
         fetchMessages(currentUserId); // Vẫn truyền user ID vào hàm fetch để log và potential future use
     } else if (activeChat === null) {
        setMessages([]);
        setIsLoadingMessages(false);
        setIsMobileChatActive(false);
     }

   }, [activeChat, user?._id, setIsMobileChatActive, isAuthLoading, isAuthenticated]);


  // --- Callback để xử lý click item (Chọn Conversation) ---
  const handleConversationClick = useCallback(async (type, id) => {
     if (!isAuthenticated || !user?._id) {
          console.warn("User not authenticated. Cannot select conversation.");
          setError("Please login to view conversations.");
          return;
     }
     const clickedConv = conversations.find(c => c.id === id);
     if (clickedConv) {
          setActiveChat({
               ...clickedConv,
               id: clickedConv.id,
               detailedMembers: clickedConv.detailedMembers || [], // detailedMembers already has trimmed IDs
          });
         setIsSettingsOpen(false);
     }
  }, [conversations, isAuthenticated, user]);


  // --- Callback để xử lý nút back mobile ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null);
    setIsSettingsOpen(false);
  }, []);


  // Handlers cho Overlay Cài đặt
  const handleOpenSettings = useCallback(() => {
      if (activeChat?.isGroup && activeChat.detailedMembers) { // Use detailedMembers
         setIsSettingsOpen(true);
         setActionError(null);
         setAddUserSearchResults([]);
      } else if (activeChat) {
           console.warn("Attempted to open settings for a non-group chat.");
      }
  }, [activeChat]);

  const handleCloseSettings = useCallback(() => {
      setIsSettingsOpen(false);
      setActionError(null);
      setAddUserSearchResults([]);
  }, []);


  // --- Callback xử lý gửi tin nhắn text ---
  const handleSendTextMessage = useCallback(async (newMessageText) => {
    const currentUserId = currentUserIdRef.current;

    if (!activeChat?.id || !currentUserId || sendingMessage || !newMessageText.trim()) {
        console.warn("Cannot send empty text message or no active chat/user or message already sending.");
        return;
    }

    setSendingMessage(true); // Disable send button for any sending action
    setActionError(null);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // --- Optimistic Update for Text ---
    const newMessageOptimistic = {
      id: tempId,
      sender: 'self',
      type: 'text',
      // Optimistic content structure matches fetched content structure for rendering
      content: { text: { type: 'text', data: newMessageText } },
      text: [newMessageText], // Keep text prop for legacy/simplicity if needed
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
      createdAt: new Date().toISOString(),
      status: 'sending', // Add a status field
      isEdited: false,
      isDeleted: false,
      senderId: currentUserId, // Trimmed sender ID
    };
    setMessages(prevMessages => [...prevMessages, newMessageOptimistic]);

    try {
      // <<< CHỈNH SỬA CẤU TRÚC data CHO TEXT MESSAGE PAYLOAD (Confirmed correct) >>>
      const messagePayload = {
          conversationId: activeChat.id,
          type: 'text',
          data: { // This 'data' field is the content payload wrapper
              data: newMessageText, // The actual text content (string)
              type: 'text' // Type indicator within the content payload (string)
          },
          replyToMessageId: null // TODO
      };
      // ----------------------------------------------------------

      const sentMessage = await sendMessageApi(messagePayload);
      console.log("Text message sent successfully:", sentMessage);

      if (sentMessage && sentMessage._id) {
           setMessages(prevMessages => prevMessages.map(msg =>
             msg.id === tempId
               ? { // Update optimistic message with real data
                   ...msg, // Keep optimistic fields like 'sender' for immediate display
                   id: sentMessage._id, // Real ID
                   content: sentMessage.content, // Real content (should match fetch structure)
                   type: sentMessage.type, // Real type
                   createdAt: sentMessage.datetime_created, // Real timestamp
                   time: new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(), // Formatted time
                   isEdited: sentMessage.isEdited || false,
                   isDeleted: sentMessage.isDeleted || false,
                   senderId: sentMessage.senderId?._id ? String(sentMessage.senderId._id).trim() : null, // Trim API sender ID
                   senderName: sentMessage.senderId?.fullName, // Use real sender info
                   senderAvatar: sentMessage.senderId?.avatar,
                   status: 'sent', // Update status
                 }
               : msg
           ));

           // Update conversation list with latest message
           setConversations(prevConversations => {
               const updatedConversations = prevConversations.map(conv =>
                   conv.id === activeChat.id
                       ? {
                           ...conv,
                           lastMessage: sentMessage.type === 'text' ? sentMessage.content?.text?.data || '' : `[${sentMessage.type.toUpperCase()}]`,
                           time: new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
                           latestMessageTimestamp: sentMessage.datetime_created,
                           latestMessage: sentMessage._id,
                       }
                       : conv
               );
               updatedConversations.sort((a, b) => {
                     const dateA = new Date(a.latestMessageTimestamp || 0);
                     const dateB = new Date(b.latestMessageTimestamp || 0);
                     return dateB.getTime() - dateA.getTime();
               });
               return updatedConversations;
           });

      } else {
           console.error("Failed to send text message: API error response or missing data", sentMessage);
           setMessages(prevMessages => prevMessages.map(msg =>
             msg.id === tempId ? { ...msg, status: 'failed' } : msg
           ));
           setActionError(sentMessage?.message || sentMessage?.error || "Failed to send text message.");
      }

    } catch (err) {
      console.error("Failed to send text message:", err);
      setActionError(err.message || 'Failed to send text message.');
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg
      ));
    } finally {
      setSendingMessage(false); // Re-enable send button
    }
  }, [activeChat, sendingMessage, currentUserIdRef, conversations]);


  // --- Callback xử lý chọn & gửi file ---
  // This function will be called by ChatWindow when a file is selected via input
  const handleSendFile = useCallback(async (file) => {
      const currentUserId = currentUserIdRef.current;

      if (!activeChat?.id || !currentUserId || sendingMessage || !file) {
          console.warn("Cannot send file: No active chat/user, sending in progress, or no file selected.");
          return;
      }

      setSendingMessage(true); // Disable send button for any sending action
      setActionError(null);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const fileType = file.type.startsWith('image/') ? 'image' : 'file';

      // --- Optimistic Update for File/Image ---
      // Use FileReader to create a local URL for image preview if it's an image
      let localPreviewUrl = null;
      if (fileType === 'image') {
          try {
              localPreviewUrl = URL.createObjectURL(file);
          } catch (e) {
              console.error("Error creating object URL for image preview:", e);
          }
      }

      // Optimistic content structure should match fetched content structure for rendering
      const optimisticContent = fileType === 'image'
          ? { image: [{ data: localPreviewUrl, metadata: { fileName: file.name, size: file.size, mimeType: file.type }, type: 'image' }] }
          : { file: { data: null, metadata: { fileName: file.name, size: file.size, mimeType: file.type }, type: 'file' } }; // data is null initially

      const newFileMessageOptimistic = {
        id: tempId,
        sender: 'self',
        type: fileType,
        content: optimisticContent, // Use constructed optimistic content
        text: [`[${fileType.toUpperCase()}: ${file.name}]`], // Placeholder text
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
        createdAt: new Date().toISOString(),
        status: 'uploading', // Add an 'uploading' status
        isEdited: false,
        isDeleted: false,
        senderId: currentUserId, // Trimmed sender ID
      };
      setMessages(prevMessages => [...prevMessages, newFileMessageOptimistic]);

      let uploadedFileDetails = null; // { data: "URL", metadata: {...}, type: "image"|"file" }
      try {
          // --- Step 1: Upload File ---
          const uploadResponse = await mockUploadFileApi(file); // Call your upload API
          console.log("File upload response:", uploadResponse);

          if (!uploadResponse || !uploadResponse.success || !uploadResponse.data) {
              throw new Error(uploadResponse?.message || uploadResponse?.error || 'File upload failed.');
          }
          // uploadedFileDetails structure from mock: { data: "URL", metadata: {...}, type: "image"|"file" }
          uploadedFileDetails = uploadResponse.data;

          // --- Step 2: Send Message with Uploaded File Details ---
          // <<< CHỈNH SỬA CẤU TRÚC data CHO FILE/IMAGE MESSAGE PAYLOAD DỰA TRÊN LOG LỖI VÀ CẤU TRÚC TEXT THÀNH CÔNG >>>
          // Log lỗi: "Cast to string failed for value { ... } at path "data"" -> API expects string at data.data
          // Cấu trúc text thành công: data: { data: "string", type: "text" }
          // => Cấu trúc file/image thành công có vẻ là: data: { data: "URL_STRING", type: "file"|"image" }
          const messagePayload = {
              conversationId: activeChat.id,
              type: fileType, // 'image' or 'file'
              data: { // This 'data' field is the content payload wrapper object
                  data: uploadedFileDetails.data, // <<< Use ONLY the URL string here
                  type: fileType // Type indicator within the content payload
                  // NOTE: Metadata might need to be sent elsewhere if API requires it.
                  // If API fetches metadata from the URL, this payload is enough.
                  // If API requires metadata in the payload, the contract is different.
                  // Let's try sending just the URL first based on the error message.
              },
              replyToMessageId: null // TODO
          };
          // ----------------------------------------------------------
          console.log("File message send payload:", messagePayload); // Log payload before sending


          const sentMessage = await sendMessageApi(messagePayload); // Call your send message API
          console.log("File message sent successfully:", sentMessage);

          // --- Update optimistic message with real data ---
          if (sentMessage && sentMessage._id) {
              setMessages(prevMessages => prevMessages.map(msg =>
                msg.id === tempId
                  ? {
                      ...msg, // Keep optimistic fields like 'sender', 'text'
                      id: sentMessage._id, // Real ID
                      content: sentMessage.content, // Real content (should match fetch structure)
                      type: sentMessage.type, // Real type
                      createdAt: sentMessage.datetime_created, // Real timestamp
                      time: new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(), // Formatted time
                      isEdited: sentMessage.isEdited || false,
                      isDeleted: sentMessage.isDeleted || false,
                      senderId: sentMessage.senderId?._id ? String(sentMessage.senderId._id).trim() : null, // Trim API sender ID
                      senderName: sentMessage.senderId?.fullName, // Use real sender info
                      senderAvatar: sentMessage.senderId?.avatar,
                      status: 'sent', // Update status
                    }
                  : msg
              ));

              // Update conversation list with latest message
              setConversations(prevConversations => {
                  const updatedConversations = prevConversations.map(conv =>
                      conv.id === activeChat.id
                          ? {
                              ...conv,
                              lastMessage: sentMessage.type === 'text' ? sentMessage.content?.text?.data || '' : `[${sentMessage.type.toUpperCase()}]`,
                              time: new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
                              latestMessageTimestamp: sentMessage.datetime_created,
                              latestMessage: sentMessage._id,
                          }
                          : conv
                  );
                  updatedConversations.sort((a, b) => {
                        const dateA = new Date(a.latestMessageTimestamp || 0);
                        const dateB = new Date(b.latestMessageTimestamp || 0);
                        return dateB.getTime() - dateA.getTime();
                  });
                  return updatedConversations;
              });

              // Clean up local object URL if created
               if (localPreviewUrl) {
                   URL.revokeObjectURL(localPreviewUrl);
               }

           } else {
                console.error("Failed to send file message: API error response or missing data", sentMessage);
                 // Update optimistic message status to failed
                setMessages(prevMessages => prevMessages.map(msg =>
                  msg.id === tempId ? { ...msg, status: 'failed' } : msg
                ));
                setActionError(sentMessage?.message || sentMessage?.error || "Failed to send file message.");
                // Clean up local object URL on failure
                if (localPreviewUrl) {
                    URL.revokeObjectURL(localPreviewUrl);
                }
           }


      } catch (err) {
        console.error("Failed to upload or send file:", err);
         // Update optimistic message status to failed
        setMessages(prevMessages => prevMessages.map(msg =>
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        ));
        setActionError(err.message || 'Failed to send file.');
         // Clean up local object URL on failure
         if (localPreviewUrl) {
             URL.revokeObjectURL(localPreviewUrl);
         }
      } finally {
        setSendingMessage(false); // Re-enable send button
      }
  }, [activeChat, sendingMessage, currentUserIdRef, conversations]);


  // --- Xử lý tìm kiếm ---
  const handleSearchChange = useCallback(async (event) => {
     const term = event.target.value.toLowerCase();
     setSearchTerm(term);
  }, []);

  // Lọc danh sách conversations dựa trên searchTerm
  const filteredConversations = conversations.filter(conv => {
       const nameMatch = conv?.name && typeof conv.name === 'string' && conv.name.toLowerCase().includes(searchTerm);
       return nameMatch;
  });

  // Tách danh sách đã lọc
  const filteredGroups = filteredConversations.filter(c => c.type === 'group');
  const filteredFriends = filteredConversations.filter(c => c.type === 'friend');

  // --- API Action Helper for Settings ---
  const performApiAction = useCallback(async (apiCall, successMessage, updateStateFunc) => {
    setIsPerformingAction(true);
    setActionError(null);
    try {
        const response = await apiCall();
        if (response && response.success) {
            console.log(`${successMessage} successful:`, response);
            let updatedConvData = response.data || response.conversation;

            if (updatedConvData && updatedConvData._id) {
                let membersWithDetails = updatedConvData.members?.map(m => ({
                    ...m,
                    id: (m.id && typeof m.id === 'object' && m.id._id) ? String(m.id._id).trim() : (typeof m.id === 'string' ? m.id.trim() : null)
                })) || [];

                 const leaderMember = membersWithDetails?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
                 const leaderId = leaderMember ? leaderMember.id : null;

                setConversations(prevConvs => prevConvs.map(conv =>
                    conv.id === updatedConvData._id ? {
                        ...conv,
                        ...updatedConvData,
                        id: updatedConvData._id,
                        type: updatedConvData.isGroup ? 'group' : 'friend',
                        statusText: updatedConvData.isGroup ? `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members` : conv.statusText,
                        leader: leaderId,
                        members: updatedConvData.members || [],
                        detailedMembers: membersWithDetails,
                    } : conv
                ));

                setActiveChat(prevActive => {
                    if (!prevActive || prevActive.id !== updatedConvData._id) return prevActive;
                     const leaderMemberActive = membersWithDetails?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
                     const leaderIdActive = leaderMemberActive ? leaderMemberActive.id : null;

                    return ({
                         ...prevActive,
                         ...updatedConvData,
                         id: updatedConvData._id,
                         type: updatedConvData.isGroup ? 'group' : 'friend',
                         statusText: updatedConvData.isGroup ? `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members` : prevActive.statusText,
                         leader: leaderIdActive,
                         detailedMembers: membersWithDetails,
                    });
                });

             } else if (response.message) {
                  console.log(response.message);
             }

            if(updateStateFunc) updateStateFunc(response);

        } else {
             const errorMessage = response?.message || response?.error || "Action failed.";
             console.error(`${successMessage} failed:`, response);
             setActionError(errorMessage);
        }
    } finally {
        setIsPerformingAction(false);
    }
}, [activeChat, conversations, currentUserIdRef]);

  // --- Handlers cho các Hành động Group Settings ---
  const handleRemoveUser = useCallback(async (conversationId, userIdToRemove) => {
       const currentUserId = currentUserIdRef.current;
       if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;
       const membersList = activeChat.detailedMembers;
       const memberToRemove = membersList?.find(m => m.id === userIdToRemove && m.leftAt === null);
       if (!memberToRemove) {
            setActionError("User not found in group or already left.");
            return;
       }
       if (window.confirm(`Are you sure you want to remove ${memberToRemove.id?.fullName || memberToRemove.id || userIdToRemove} from the group?`)) {
            await performApiAction(
               () => removeMemberApi({ conversationId, memberId: userIdToRemove }),
               "Remove member"
            );
       }
   }, [activeChat, performApiAction, currentUserIdRef]);

   const handleChangeLeader = useCallback(async (conversationId, newLeaderId) => {
        const currentUserId = currentUserIdRef.current;
        if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;
        const membersList = activeChat.detailedMembers;
        const newLeaderMember = membersList?.find(m => m.id === newLeaderId && m.leftAt === null);
         if (!newLeaderMember) {
             setActionError("New leader must be a current member of the group.");
             return;
         }
        if (window.confirm(`Are you sure you want to make ${newLeaderMember.id?.fullName || newLeaderId} the new leader?`)) {
             await performApiAction(
                () => updateMemberRoleApi({ conversationId, memberId: newLeaderId }),
                "Change leader"
             );
        }
   }, [activeChat, performApiAction, currentUserIdRef]);

    const handleStepDownLeader = useCallback(async (conversationId, leaderId) => {
         const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || activeChat.leader !== currentUserId || leaderId !== currentUserId || !currentUserId) return;
         const membersList = activeChat.detailedMembers;
         const numberOfLeaders = membersList.filter(m => m.role === 'leader' && m.leftAt === null).length;
         if (window.confirm("Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left.")) {
              await performApiAction(
                   () => updateMemberRoleApi({ conversationId, memberId: leaderId, newRole: 'member' }),
                   "Step down as leader"
               );
         }
    }, [activeChat, currentUserIdRef, performApiAction]);


   const handleAddUserSearch = useCallback(async (searchTerm) => {
        if (!searchTerm.trim()) {
            setAddUserSearchResults([]);
            setActionError(null);
            return;
        }
       setIsPerformingAction(true);
       setActionError(null);
       setAddUserSearchResults([]);
       try {
           const results = await searchUsersApi(searchTerm.trim());
           if (results && Array.isArray(results)) {
               const existingMemberUserIds = new Set(activeChat?.detailedMembers?.map(m => m.id).filter(Boolean) || []);
               const filteredResults = results.filter(user => user._id && !existingMemberUserIds.has(String(user._id).trim()));
               setAddUserSearchResults(filteredResults);
           } else {
                setAddUserSearchResults([]);
           }
       } catch (err) {
           console.error("Search users API call failed:", err);
           setActionError(err.message || "An API error occurred during search.");
            setAddUserSearchResults([]);
       } finally {
           setIsPerformingAction(false);
       }
   }, [activeChat, performApiAction]);

   const handleAddUserConfirm = useCallback(async (conversationId, userIdToAdd) => {
       const currentUserId = currentUserIdRef.current;
       if (!activeChat || activeChat.id !== conversationId || !userIdToAdd || !currentUserId) {
           setActionError("Invalid request to add user.");
           return;
       }
        const userToAdd = addUserSearchResults.find(user => user._id === userIdToAdd);
        if (!userToAdd) {
             setActionError("User not found in search results.");
             return;
        }
        await performApiAction(
            () => addNewMemberApi({ conversationId, newMemberId: userIdToAdd, role: 'member' }),
            "Add member",
            (response) => {
                setAddUserSearchResults([]);
            }
        );
   }, [activeChat, performApiAction, addUserSearchResults, currentUserIdRef]);

    const handleLeaveGroup = useCallback(async (conversationId) => {
        const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;

         const isCurrentUserActiveMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
         const isCurrentUserLeaderAndOnlyLeader = activeChat.leader === currentUserId && activeChat.detailedMembers?.filter(m => m.role === 'leader' && m.leftAt === null).length <= 1;
         const totalActiveMembers = activeChat.detailedMembers?.filter(m => m.leftAt === null).length || 0;

         if (!isCurrentUserActiveMember || (isCurrentUserLeaderAndOnlyLeader && totalActiveMembers > 1)) {
              setActionError("You cannot leave this group as the only leader if there are other members.");
              return;
         }

         if (window.confirm("Are you sure you want to leave this group?")) {
              await performApiAction(
                () => leaveConversationApi({ conversationId }),
                "Leave group",
                 (response) => {
                     setConversations(prevConvs => prevConvs.filter(conv => conv.id !== conversationId));
                     setActiveChat(null);
                     setIsSettingsOpen(false);
                     setIsMobileChatActive(false);
                 }
              );
         }
    }, [activeChat, performApiAction, currentUserIdRef]);

    const handleDeleteGroup = useCallback(async (conversationId) => {
         const currentUserId = currentUserIdRef.current;
          if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || activeChat.leader !== currentUserId || !currentUserId) {
              console.warn("User is not authorized to delete this group.");
              setActionError("You must be the leader to delete the group.");
              return;
          }

          if (window.confirm("Are you sure you want to delete this group permanently? This action cannot be undone.")) {
               await performApiAction(
                 () => deleteGroupApi({ conversationId }),
                 "Delete group",
                  (response) => {
                      setConversations(prevConvs => prevConvs.filter(conv => conv.id !== conversationId));
                      setActiveChat(null);
                      setIsSettingsOpen(false);
                      setIsMobileChatActive(false);
                  }
               );
          }
    }, [activeChat, currentUserIdRef, performApiAction]);

     const handleDeleteConversationMember = useCallback(async (conversationId) => {
         const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !currentUserId) return;
           if (window.confirm("Are you sure you want to delete this conversation? (This will only delete it for you)")) {
               await performApiAction(
                 () => deleteConversationMemberApi({ conversationId }),
                 "Delete conversation",
                  (response) => {
                      setConversations(prevConvs => prevConvs.filter(conv => conv.id !== conversationId));
                      setActiveChat(null);
                      setIsSettingsOpen(false);
                      setIsMobileChatActive(false);
                  }
               );
          }
    }, [activeChat, performApiAction, currentUserIdRef]);

    const handleUpdateGroupName = useCallback(async (conversationId, newName) => {
         const currentUserId = currentUserIdRef.current;
          if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !newName.trim() || !currentUserId) {
              console.warn("Invalid request to update group name.");
              if (!newName.trim()) setActionError("Group name cannot be empty.");
              return;
          }
          const isMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
          if (!isMember) {
             setActionError("You are not an active member of this group.");
             return;
          }
         await performApiAction(
             () => updateConversationNameApi({ conversationId, newName }),
             "Update group name",
             () => setIsEditingName(false)
         );
    }, [activeChat, currentUserIdRef, performApiAction]);


    const handleDeleteMessage = useCallback(async (messageId) => {
         const currentUserId = currentUserIdRef.current;
         if (!messageId || !activeChat?.id || !currentUserId) return;
         const messageToDelete = messages.find(msg => msg.id === messageId);
          if (!messageToDelete || messageToDelete.senderId !== currentUserId) {
              console.warn("Cannot delete message: Not the sender.");
               setActionError("You can only delete your own messages.");
              return;
          }
          if (window.confirm("Are you sure you want to delete this message?")) {
              await performApiAction(
                  () => deleteMessageApi({ messageId }),
                  "Delete message",
                   (response) => {
                       const updatedMessage = response.data;
                       if (updatedMessage && updatedMessage._id) {
                           setMessages(prevMessages => prevMessages.map(msg =>
                               msg.id === updatedMessage._id ? {
                                   ...msg,
                                   isDeleted: updatedMessage.isDeleted || false,
                                   content: updatedMessage.content,
                               } : msg
                           ));
                       }
                   }
              );
          }
    }, [activeChat, performApiAction, messages, currentUserIdRef]);

     const handleEditMessage = useCallback(async (messageId, newText) => {
        const currentUserId = currentUserIdRef.current;
         if (!messageId || !newText.trim() || !activeChat?.id || !currentUserId) return;
         const messageToEdit = messages.find(msg => msg.id === messageId);
          if (!messageToEdit || messageToEdit.senderId !== currentUserId || messageToEdit.type !== 'text') {
              console.warn("Cannot edit message: Not the sender or not a text message.");
              setActionError("You can only edit your own text messages.");
              return;
          }
         if (window.confirm("Are you sure you want to edit this message?")) {
              await performApiAction(
                  () => editMessageApi({ messageId, newData: newText }),
                  "Edit message",
                   (response) => {
                       const updatedMessage = response.data;
                       if (updatedMessage && updatedMessage._id) {
                           setMessages(prevMessages => prevMessages.map(msg =>
                               msg.id === updatedMessage._id ? {
                                   ...msg,
                                   isEdited: updatedMessage.isEdited || false,
                                   content: updatedMessage.content,
                                   text: updatedMessage.type === 'text' && updatedMessage.content?.text?.data ? [updatedMessage.content.text.data] : msg.text,
                               } : msg
                           ));
                       }
                   }
              );
         }
     }, [activeChat, performApiAction, messages, currentUserIdRef]);


  // --- Render ---

  const showInitialLoading = isAuthLoading || (isAuthenticated && user?._id && isLoadingConversations && !activeChat && !error);
  const showAuthError = !isAuthLoading && !isAuthenticated;
  const showGeneralError = error && !isLoadingConversations && !isLoadingMessages && !isPerformingAction && isAuthenticated;


  if (showInitialLoading) {
      return (
           <div className="chat-page-container">
               <div className="loading-overlay">Loading conversations...</div>
           </div>
      );
  }

  if (showAuthError) {
      return (
           <div className="chat-page-container">
               <div className="error-message">Error: {error || "User not authenticated. Please login."}</div>
           </div>
      );
  }

  if (showGeneralError) {
       console.error("Rendering with general error:", error);
      return (
          <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>
               <div className="error-message">Error: {error}</div>
              <ConversationListPanel
                   groups={filteredGroups}
                   friends={filteredFriends}
                   onSearchChange={handleSearchChange}
                   onItemClick={handleConversationClick}
                   activeChat={activeChat}
              />
              <ChatWindow
                  activeContact={activeChat}
                  messages={messages} // messages state contains messages with trimmed senderId and status
                  onMobileBack={handleMobileBack}
                  isMobile={isMobileChatActive}
                  onSendTextMessage={handleSendTextMessage} // <<< Pass new text handler
                  onSendFile={handleSendFile} // <<< Pass new file handler
                  isLoadingMessages={isLoadingMessages}
                  onOpenSettings={activeChat?.isGroup ? handleOpenSettings : null}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  currentUserId={currentUserIdRef.current} // <<< Pass currentUserId (trimmed)
                  sendingMessage={sendingMessage} // Pass sending state
              />
                {isSettingsOpen && activeChat?.isGroup && activeChat.detailedMembers && (
                   <ChatSettingsOverlay
                        group={activeChat}
                        currentUserId={currentUserIdRef.current}
                        onClose={handleCloseSettings}
                        onRemoveUser={handleRemoveUser}
                        onChangeLeader={handleChangeLeader}
                        onStepDownLeader={handleStepDownLeader}
                        onAddUserSearch={handleAddUserSearch}
                        onAddUserConfirm={handleAddUserConfirm}
                        isPerformingAction={isPerformingAction}
                        actionError={actionError}
                        searchResults={addUserSearchResults}
                        onLeaveGroup={handleLeaveGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onUpdateGroupName={handleUpdateGroupName}
                   />
                )}
          </div>
      );
  }


   // Render bình thường
 return (
   <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>

     <ConversationListPanel
         groups={filteredGroups}
         friends={filteredFriends}
         onSearchChange={handleSearchChange}
         onItemClick={handleConversationClick}
         activeChat={activeChat}
     />

     <ChatWindow
          activeContact={activeChat}
          messages={messages} // messages state contains messages with trimmed senderId and status
          onMobileBack={handleMobileBack}
          isMobile={isMobileChatActive}
          onSendTextMessage={handleSendTextMessage} // <<< Pass new text handler
          onSendFile={handleSendFile} // <<< Pass new file handler
          isLoadingMessages={isLoadingMessages}
          onOpenSettings={activeChat?.isGroup ? handleOpenSettings : null}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          currentUserId={currentUserIdRef.current} // <<< Pass currentUserId (trimmed)
          sendingMessage={sendingMessage} // Pass sending state
     />

      {isSettingsOpen && activeChat?.isGroup && activeChat.detailedMembers && (
          <ChatSettingsOverlay
              group={activeChat}
              currentUserId={currentUserIdRef.current}
              onClose={handleCloseSettings}
              onRemoveUser={handleRemoveUser}
              onChangeLeader={handleChangeLeader}
              onStepDownLeader={handleStepDownLeader}
              onAddUserSearch={handleAddUserSearch}
              onAddUserConfirm={handleAddUserConfirm}
              isPerformingAction={isPerformingAction}
              actionError={actionError}
              searchResults={addUserSearchResults}
              onLeaveGroup={handleLeaveGroup}
              onDeleteGroup={handleDeleteGroup}
              onUpdateGroupName={handleUpdateGroupName}
          />
      )}

   </div>
 );
};

export default ChatPage;

// >>> Helper Functions (Defined ONCE outside the component) <<<
// Note: This helper is unlikely needed anymore if member details are always populated.
// If used, ensure any ID comparisons or storage also involve trimming.
const fetchUserDetailsFromId = async (userId) => {
   try {
        // Assuming userId passed to this helper is already trimmed
        const userDetails = await getUserDetailsApi(userId); // API might receive original or trimmed ID
        if (userDetails && userDetails._id) {
             return { ...userDetails, _id: String(userDetails._id).trim() };
        } else {
             console.error(`API returned invalid data for user ${userId}:`, userDetails);
            return { _id: userId, name: 'Unknown User', avatar: null }; // Return with potentially untrimmed ID or null
        }
   } catch (error) {
       console.error(`Failed to fetch user details for ${userId}:`, error);
       return { _id: userId, name: 'Unknown User', avatar: null };
   }
};