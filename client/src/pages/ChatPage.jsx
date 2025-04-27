// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationListPanel from '../components/Chat/ConversationListPanel';
import ChatWindow from '../components/Chat/ChatWindow';
import ChatSettingsOverlay from '../components/Chat/ChatSettingsOverlay';
// Remove MessageEditDialog import
// import MessageEditDialog from '../components/Chat/MessageEditDialog'; // <<< REMOVE THIS IMPORT

// <<< Import API functions >>>
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
    editMessageApi, // Make sure this is imported
    deleteMessageApi, // Make sure this is imported
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
  // sendingMessage state can now also cover file uploads and saving edits
  const [sendingMessage, setSendingMessage] = useState(false); // State for any action disabling the input area (send, upload, save edit)

  const [error, setError] = useState(null); // State lỗi chung

  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  // <<< State cho Overlay Cài đặt Group >>>
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false); // General action state (for settings, search, etc. - not input area actions)
  const [actionError, setActionError] = useState(null); // General action error
  // addUserSearchResults: mảng user objects từ search API { _id, ... }
  const [addUserSearchResults, setAddUserSearchResults] = useState([]);

  // currentUserIdRef: Lưu user ID đã trim
  const currentUserIdRef = useRef(null);

  // <<< STATE FOR INPUT AREA & EDITING MESSAGE >>>
  const [messageInput, setMessageInput] = useState(''); // <<< Lifted state for input
  const [editingMessageId, setEditingMessageId] = useState(null); // ID of message being edited
  const [isEditingName, setIsEditingName] = useState(false); // <-- Khai báo ở đây
  const [editingGroupName, setEditingGroupName] = useState('');


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
           setError(null); // Clear any previous auth error
      } else if (!isAuthLoading && !isAuthenticated) {
           console.warn("Auth complete but user not authenticated. Cannot fetch chat data.");
           setError("User not authenticated. Please login.");
           setIsLoadingConversations(false);
           setConversations([]);
           setActiveChat(null);
           setMessages([]);
           setIsMobileChatActive(false);
           // Reset input area states on auth failure
           setMessageInput('');
           setEditingMessageId(null);
           setSendingMessage(false);
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
         if(activeChat === null) { // Only set mobile inactive if no chat is selected
             setIsMobileChatActive(false);
         }
          // Reset input area states when no chat is active
          setMessageInput('');
          setEditingMessageId(null);
          setSendingMessage(false);
         return;
       }

       console.log("Fetching messages for room:", activeChat.id, "for user:", userId);
       setIsLoadingMessages(true);
       setActionError(null); // Clear action error when changing chat
        // Reset input area states when changing chat
        setMessageInput('');
        setEditingMessageId(null);
        setSendingMessage(false);


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
                   // text: msg.type === 'text' && msg.content?.text?.data ? [msg.content.text.data] : [`[${msg.type.toUpperCase()}]`], // Placeholder text prop (no longer needed with new rendering)
                   time: msg.datetime_created ? new Date(msg.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '',
                   createdAt: msg.datetime_created,
                   isEdited: msg.isEdited || false,
                   isDeleted: msg.isDeleted || false,
                   senderId: messageSenderId, // Store trimmed sender ID
                   senderName: msg.senderId?.fullName,
                   senderAvatar: msg.senderId?.avatar,
                   status: 'sent', // Messages from API are 'sent' by default
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
         // Reset input area states on fetch error
         setMessageInput('');
         setEditingMessageId(null);
         setSendingMessage(false);
       } finally {
         setIsLoadingMessages(false);
       }
     }
     if (activeChat && currentUserId) {
         fetchMessages(currentUserId); // Vẫn truyền user ID vào hàm fetch để log và potential future use
     } else if (activeChat === null) { // This condition is now handled at the start of the effect
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
     // Reset input area states when changing conversation
     setMessageInput('');
     setEditingMessageId(null);
     setSendingMessage(false); // Ensure sending state is false

     const clickedConv = conversations.find(c => c.id === id);
     if (clickedConv) {
          setActiveChat({
               ...clickedConv,
               id: clickedConv.id,
               detailedMembers: clickedConv.detailedMembers || [], // detailedMembers already has trimmed IDs
          });
         setIsSettingsOpen(false); // Close settings overlay if open
         setActionError(null); // Clear action error
     }
  }, [conversations, isAuthenticated, user]);


  // --- Callback để xử lý nút back mobile ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null);
    setIsSettingsOpen(false); // Close settings if open when going back
    setIsMobileChatActive(false); // Ensure mobile chat view is inactive
    // Reset input area states when going back
    setMessageInput('');
    setEditingMessageId(null);
    setSendingMessage(false);
    setActionError(null); // Clear action error
  }, []);


  // Handlers cho Overlay Cài đặt
  const handleOpenSettings = useCallback(() => {
      if (activeChat?.isGroup && activeChat.detailedMembers) { // Use detailedMembers
         setIsSettingsOpen(true);
         setActionError(null); // Clear action error when opening settings
         setAddUserSearchResults([]);
         // Consider if input area should be disabled while settings is open
      } else if (activeChat) {
           console.warn("Attempted to open settings for a non-group chat.");
      }
  }, [activeChat]);

  const handleCloseSettings = useCallback(() => {
      setIsSettingsOpen(false);
      setActionError(null); // Clear action error when closing settings
      setAddUserSearchResults([]);
      // Re-enable input area if it was disabled
  }, []);


  // --- Callback xử lý gửi tin nhắn text (New Message) ---
  const handleSendTextMessage = useCallback(async () => { // No need to pass text, use messageInput state
    const currentUserId = currentUserIdRef.current;
    const newMessageText = messageInput.trim(); // Use state here

    // Prevent sending if already sending, editing, or text is empty
    if (!activeChat?.id || !currentUserId || sendingMessage || editingMessageId !== null || !newMessageText) {
        console.warn("Cannot send text message: Invalid state (no chat, no user, sending, editing, or empty).");
        return;
    }

    setSendingMessage(true); // Disable input area
    setActionError(null); // Clear previous action error
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // --- Optimistic Update for Text ---
    // For optimistic update, senderId MUST be the current user ID to show it on the right
    const newMessageOptimistic = {
      id: tempId,
      sender: 'self', // Used only for CSS positioning, not API
      type: 'text',
      // Optimistic content structure matches fetched content structure for rendering
      content: { text: { type: 'text', data: newMessageText } },
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
      createdAt: new Date().toISOString(),
      status: 'sending', // Add a status field
      isEdited: false,
      isDeleted: false,
      senderId: currentUserId, // Trimmed sender ID - This is correct for optimistic!
    };
    setMessages(prevMessages => [...prevMessages, newMessageOptimistic]);
    setMessageInput(''); // Clear input immediately after sending optimistically

    try {
      const messagePayload = {
          conversationId: activeChat.id,
          type: 'text',
          data: { data: newMessageText, type: 'text' },
          replyToMessageId: null // TODO
      };

      const sentMessage = await sendMessageApi(messagePayload);
      console.log("Text message sent successfully:", sentMessage);

      if (sentMessage && sentMessage._id) {
           setMessages(prevMessages => prevMessages.map(msg => {
                if (msg.id === tempId) {
                    // Update optimistic message with real data from API response
                    let apiSenderId = null;
                   let apiSenderName = null;
                   let apiSenderAvatar = null;

                   // Check if senderId is populated (object with _id) or just an ID string
                   if (sentMessage.senderId) {
                       if (typeof sentMessage.senderId === 'object' && sentMessage.senderId._id) {
                            apiSenderId = String(sentMessage.senderId._id).trim();
                            apiSenderName = sentMessage.senderId.fullName;
                            apiSenderAvatar = sentMessage.senderId.avatar;
                       } else if (typeof sentMessage.senderId === 'string') {
                            apiSenderId = String(sentMessage.senderId).trim();
                            // If it's just a string ID, we might not have name/avatar in the message response
                            // Keep existing name/avatar from optimistic update or set null/default
                            // Let's keep the name/avatar from the optimistic update for self messages
                            if (apiSenderId === currentUserId) { // If the returned sender ID is the current user
                                 apiSenderName = msg.senderName; // Keep name/avatar from optimistic (which are likely null/placeholder for self)
                                 apiSenderAvatar = msg.senderAvatar;
                            } else { // If for some reason the returned sender ID is NOT the current user (e.g., system message)
                                 // We don't have the other user's name/avatar here, might need another fetch or use default
                                 apiSenderName = null; // Use null or default
                                 apiSenderAvatar = null; // Use null or default
                            }
                       }
                   }


                    return {
                        ...msg, // Keep optimistic fields like 'sender' for immediate display
                        id: sentMessage._id, // Real ID
                        content: sentMessage.content, // Real content (should match fetch structure)
                        type: sentMessage.type, // Real type
                        createdAt: sentMessage.datetime_created, // Real timestamp
                        time: new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(), // Formatted time
                        isEdited: sentMessage.isEdited || false,
                        isDeleted: sentMessage.isDeleted || false,
                       senderId: apiSenderId, // Use the processed sender ID
                       senderName: apiSenderName, // Use the processed sender name
                       senderAvatar: apiSenderAvatar, // Use the processed sender avatar
                        status: 'sent', // Update status
                    };
                }
                return msg;
           }));

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
           // Restore input text if send failed? Maybe not, UX is better if cleared.
           // setMessageInput(newMessageText);
      }

    } catch (err) {
      console.error("Failed to send text message:", err);
      setActionError(err.message || 'Failed to send text message.');
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg
      ));
      // setMessageInput(newMessageText); // Restore input on error?
    } finally {
      setSendingMessage(false); // Re-enable input area
       // Do NOT clear editingMessageId here, as this is only for *new* messages
    }
  }, [activeChat, sendingMessage, editingMessageId, messageInput, currentUserIdRef, conversations]);

  // --- Callback xử lý chọn & gửi file ---
  // This function will be called by ChatWindow when a file is selected via input
  const handleSendFile = useCallback(async (file) => {
      const currentUserId = currentUserIdRef.current;

      // Prevent sending file if editing or another action is in progress
      if (!activeChat?.id || !currentUserId || sendingMessage || editingMessageId !== null || !file) {
          console.warn("Cannot send file: Invalid state (no chat, no user, sending/editing in progress, or no file selected).");
          return;
      }

      setSendingMessage(true); // Disable input area
      setActionError(null); // Clear previous action error
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
        sender: 'self', // Used only for CSS positioning
        type: fileType,
        content: optimisticContent, // Use constructed optimistic content
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
        createdAt: new Date().toISOString(),
        status: 'uploading', // Add an 'uploading' status
        isEdited: false,
        isDeleted: false,
        senderId: currentUserId, // Trimmed sender ID
        senderName: user?.fullName || 'You', // Use user's name from auth context
        senderAvatar: user?.avatar || null, // Use user's avatar from auth context
      };
      setMessages(prevMessages => [...prevMessages, newFileMessageOptimistic]);
      // Do NOT clear messageInput here, it's not used for file messages


      let uploadedFileDetails = null; // { data: "URL", metadata: {...}, type: "image"|"file" }
      try {
          // --- Step 1: Upload File ---
          const uploadResponse = await mockUploadFileApi(file); // Call your upload API
          console.log("File upload response:", uploadResponse);

          if (!uploadResponse || !uploadResponse.success || !uploadResponse.data) {
              throw new Error(uploadResponse?.message || uploadResponse?.error || 'File upload failed.');
          }
          // uploadedFileDetails structure from mock: { data: "URL", metadata: {...}, type: "image"|"file" }
          uploadedFileDetails = uploadResponse.data; // This object contains { data: URL, metadata: {...}, type: '...' }

          // --- Step 2: Send Message with Uploaded File Details ---
          // <<< CORRECTED PAYLOAD FOR FILE/IMAGE >>>
          // Assuming API expects the 'data' field in the POST body to match the 'content' structure it stores.
          let apiPayloadData;
          if (fileType === 'image') {
               // API likely expects { image: [{ data: URL, metadata: {...}, type: 'image' }] }
              apiPayloadData = {
                  image: [{
                      data: uploadedFileDetails.data, // The URL string
                      metadata: uploadedFileDetails.metadata, // The metadata object
                      type: 'image' // Type within the image object
                  }]
              };
          } else { // fileType === 'file'
               // API likely expects { file: { data: URL, metadata: {...}, type: 'file' } }
               apiPayloadData = {
                   file: {
                       data: uploadedFileDetails.data, // The URL string
                       metadata: uploadedFileDetails.metadata, // The metadata object
                       type: 'file' // Type within the file object
                   }
               };
          }

          const messagePayload = {
              conversationId: activeChat.id,
              type: fileType, // 'image' or 'file' (outer type)
              data: apiPayloadData, // <<< Send the constructed content structure here
              replyToMessageId: null // TODO
          };
          // ----------------------------------------------------------
          console.log("File message send payload:", messagePayload); // Log payload before sending

          const sentMessage = await sendMessageApi(messagePayload); // Call your send message API
          console.log("File message sent successfully:", sentMessage);

          // --- Update optimistic message with real data ---
          if (sentMessage && sentMessage._id) {
              setMessages(prevMessages => prevMessages.map(msg => {
                   if (msg.id === tempId) {
                       // Update optimistic message with real data
                        let apiSenderId = null;
                        let apiSenderName = null;
                        let apiSenderAvatar = null;

                         // --- CORRECTED LOGIC TO GET SENDER INFO FROM API RESPONSE (same as text) ---
                         if (sentMessage.senderId) {
                            if (typeof sentMessage.senderId === 'object' && sentMessage.senderId._id) {
                                apiSenderId = String(sentMessage.senderId._id).trim();
                                apiSenderName = sentMessage.senderId.fullName;
                                apiSenderAvatar = sentMessage.senderId.avatar;
                            } else if (typeof sentMessage.senderId === 'string') {
                                apiSenderId = String(sentMessage.senderId).trim();
                                // For senderName/Avatar, if API only returns ID string, use auth context info for self messages
                                 if (apiSenderId === currentUserId) {
                                     apiSenderName = user?.fullName || 'You';
                                     apiSenderAvatar = user?.avatar || null;
                                 } else {
                                    console.warn(`API returned unexpected sender ID for file message ${sentMessage._id}`);
                                    apiSenderName = 'Unknown User'; // Fallback
                                    apiSenderAvatar = null; // Fallback
                                 }
                            }
                         }
                         // --- END CORRECTED LOGIC ---

                       return {
                           ...msg, // Keep optimistic fields like 'sender' (for CSS class)
                           id: sentMessage._id, // Real ID
                           content: sentMessage.content, // Real content (should match fetch structure)
                           type: sentMessage.type, // Real type
                           createdAt: sentMessage.datetime_created, // Real timestamp
                           time: new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(), // Formatted time
                           isEdited: sentMessage.isEdited || false,
                           isDeleted: sentMessage.isDeleted || false,
                           senderId: apiSenderId, // Use processed ID
                           senderName: apiSenderName, // Use processed name
                           senderAvatar: apiSenderAvatar, // Use processed avatar
                           status: 'sent', // Update status
                       };
                   }
                   return msg;
              }));

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
    // Added user to dependencies because we use user?.fullName/avatar
  }, [activeChat, sendingMessage, editingMessageId, currentUserIdRef, conversations, user]);

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
  const filteredGroups = filteredConversations.filter(c => c.isGroup); // Use isGroup flag
  const filteredFriends = filteredConversations.filter(c => !c.isGroup); // Use isGroup flag

  // --- API Action Helper for Settings ---
      // Refined performSettingsAction: Calls API, sets loading/error, executes custom updateStateFunc on success.
      const performSettingsAction = useCallback(async (apiCall, successMessage, updateStateFunc = null) => {
        setIsPerformingAction(true);
        setActionError(null); // Clear action error before performing new action
        try {
            const response = await apiCall();
    
            // Assume success if no error thrown by apiCall and response is not explicitly marked as failure.
            // If API uses { success: true/false }, check that. If it throws on error, check response structure here.
            // Let's assume success if response exists and doesn't have success === false.
            if (response && response.success === false) {
                // API returned a response indicating failure
                const errorMessage = response?.message || response?.error || "Action failed.";
                console.error(`${successMessage} failed: API indicated failure.`, response);
                setActionError(errorMessage);
            } else {
                // API call completed successfully (no error thrown, no success: false)
                console.log(`${successMessage} successful:`, response);
                setActionError(null); // Clear any previous error on success
    
                // Execute the custom update function if provided.
                // This function is responsible for all state updates related to this action (conversations, activeChat).
                if(updateStateFunc) {
                    updateStateFunc(response); // Pass the API response to the custom updater
                }
                // Note: If no updateStateFunc is provided, state related to conversations/activeChat is NOT updated by default here.
                // This means handlers MUST provide an updateStateFunc if they need UI to reflect changes.
            }
    
        } catch (err) {
            // API call failed completely (network error, HTTP error handled by fetch wrapper, unhandled exception)
            console.error(`API call failed for ${successMessage}:`, err);
            setActionError(err.message || `An API error occurred during ${successMessage.toLowerCase()}.`);
        } finally {
            setIsPerformingAction(false); // Reset loading state
        }
    }, [setIsPerformingAction, setActionError]); // Dependencies: Only state setters controlled by this hook


  // --- Handlers for various actions using performSettingsAction ---
  const handleRemoveUser = useCallback(async (conversationId, userIdToRemove) => {
    const currentUserId = currentUserIdRef.current;
     if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId || !userIdToRemove) {
         console.warn("Invalid request to remove user.");
         setActionError("Cannot perform action on this chat.");
         return;
     }
    const membersList = activeChat.detailedMembers; // Use detailedMembers from state
    const memberToRemove = membersList?.find(m => m.id === userIdToRemove && m.leftAt === null);
    if (!memberToRemove) {
         setActionError("User not found in group or already left.");
         return;
    }

    // Check if current user has permission (is leader)
    const isCurrentUserLeader = activeChat.leader === currentUserId;
    if (!isCurrentUserLeader) {
        setActionError("Only the leader can remove members.");
        return;
    }
    // Leader cannot remove themselves
    if (userIdToRemove === currentUserId) {
        setActionError("You cannot remove yourself. Use 'Leave Group'.");
        return;
    }
     // Leader cannot remove another leader (unless backend logic says otherwise)
     if (memberToRemove.role === 'leader') {
          setActionError("Cannot remove another leader. Change their role first.");
          return;
     }


    if (window.confirm(`Are you sure you want to remove ${memberToRemove.id?.fullName || userIdToRemove} from the group?`)) {
         await performSettingsAction(
            () => removeMemberApi({ conversationId, memberId: userIdToRemove }), // API call
            "Remove member", // Success message text
            // <<< Custom updateStateFunc for successful member removal >>>
            (apiResponse) => {
                 console.log("Custom updateStateFunc running for remove member success:", apiResponse);

                 // FIND the conversation in the current state
                 setConversations(prevConvs => prevConvs.map(conv => {
                     if (conv.id === conversationId) {
                          // Find the member in detailedMembers and mark them as left or remove them
                          // Assuming backend marks leftAt instead of removing from array
                         const updatedDetailedMembers = conv.detailedMembers.map(member => {
                             if (member.id === userIdToRemove) {
                                  // Simulate marking as left (get current time or from API response if available)
                                 return { ...member, leftAt: apiResponse?.leftAt || new Date().toISOString(), role: 'member' }; // Also demote on leaving/removal
                             }
                             return member;
                         }).filter(member => !member.leftAt); // Filter out left members for active list display

                         // Update the conversation object
                         return {
                             ...conv,
                             // Leader ID might change if leader is removed (backend handles this?)
                             // If API response includes the updated conversation object, use its leader/members list
                             // Otherwise, re-evaluate leader from updatedDetailedMembers
                             leader: apiResponse?.conversation?.leader !== undefined ? apiResponse.conversation.leader : conv.leader, // Assuming API returns updated conv or leader
                             detailedMembers: updatedDetailedMembers, // Use the updated member list
                             statusText: `${updatedDetailedMembers.length} members`, // Update member count text
                             // API response might contain updated last_updated timestamp.
                         };
                     }
                     return conv; // Return other conversations unchanged
                 }));

                  // Update active chat state if it's the current chat
                  setActiveChat(prevActive => {
                      if (!prevActive || prevActive.id !== conversationId) return prevActive;

                       const updatedDetailedMembers = prevActive.detailedMembers.map(member => {
                           if (member.id === userIdToRemove) {
                               return { ...member, leftAt: apiResponse?.leftAt || new Date().toISOString(), role: 'member' };
                           }
                           return member;
                       }).filter(member => !member.leftAt);

                      return {
                          ...prevActive,
                           leader: apiResponse?.conversation?.leader !== undefined ? apiResponse.conversation.leader : prevActive.leader,
                          detailedMembers: updatedDetailedMembers,
                           statusText: `${updatedDetailedMembers.length} members`,
                      };
                  });
            }
            // <<< End custom updateStateFunc >>>
         );
         // setActionError is cleared by performSettingsAction
    } else {
        // User cancelled
        setActionError(null); // Clear error if it was set before confirm
    }
}, [activeChat, performSettingsAction, currentUserIdRef, removeMemberApi, setConversations, setActiveChat, setActionError]); // Add dependencies

      const handleUpdateGroupName = useCallback(async (conversationId, newName) => {
        const currentUserId = currentUserIdRef.current;
        const trimmedName = newName.trim();
        if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !trimmedName || !currentUserId) {
            console.warn("Invalid request to update group name.");
            if (!trimmedName) setActionError("Group name cannot be empty.");
            return;
        }
        // Optional: Check if the current user has permissions (e.g., is leader or active member)
        const isMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
        if (!isMember) {
            setActionError("You are not an active member of this group.");
            return;
        }


        await performSettingsAction(
            () => updateConversationNameApi({ conversationId, newName: trimmedName }), // API call
            "Update group name", // Success message text
            // <<< Custom updateStateFunc for successful name change >>>
            (apiResponse) => { // apiResponse is the response from updateConversationNameApi (likely updated conv object or {success: true})
                console.log("Custom updateStateFunc running for name change success:", apiResponse);
                 // Use the name that was successfully sent/confirmed (trimmedName)
                setConversations(prevConvs => prevConvs.map(conv =>
                    conv.id === conversationId ? { ...conv, name: trimmedName } : conv // Update name in list
                ));
                setActiveChat(prevActive => {
                    if (!prevActive || prevActive.id !== conversationId) return prevActive;
                    return { ...prevActive, name: trimmedName }; // Update name in active chat
                });
                 // Close the editing UI
                // These states are managed in ChatSettingsOverlay, but ChatPage controls the handlers.
                // You might need a way for ChatPage to signal ChatSettingsOverlay to close edit mode.
                // A prop like `onNameUpdateSuccess` could be passed to Overlay and called here.
                // For now, if isEditingName state is in ChatPage, move it here.
                // ASSUMPTION: isEditingName and editingGroupName are in ChatPage.
                 setIsEditingName(false);
                 setEditingGroupName('');
                // Clear any error related to name editing (handled by setActionError in performSettingsAction finally/success)
            }
            // <<< End custom updateStateFunc >>>
        );
        // setActionError is cleared by performSettingsAction on success or when starting
    }, [activeChat, currentUserIdRef, performSettingsAction, updateConversationNameApi, setConversations, setActiveChat, setIsEditingName, setEditingGroupName, setActionError]); // Add dependencies

    const handleChangeLeader = useCallback(async (conversationId, newLeaderId) => {
        const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId || !newLeaderId) {
             console.warn("Cannot change leader: Invalid state.");
             setActionError("Cannot perform action on this chat.");
             return;
         }
        const membersList = activeChat.detailedMembers; // Use detailedMembers from state
        const newLeaderMember = membersList?.find(m => m.id === newLeaderId && m.leftAt === null);
         if (!newLeaderMember) {
             setActionError("New leader must be a current member of the group.");
             return;
         }

         // Check if the current user has permission (is the current leader based on state)
         const isCurrentUserLeader = activeChat.leader === currentUserId;
         if (!isCurrentUserLeader) {
             setActionError("Only the current leader can change leadership.");
             return;
         }


        if (window.confirm(`Are you sure you want to make ${newLeaderMember.id?.fullName || newLeaderId} the new leader?`)) {
             await performSettingsAction(
                () => updateMemberRoleApi({ conversationId, memberId: newLeaderId, newRole: 'leader' }), // API call
                "Change leader", // Success message text
                // <<< Custom updateStateFunc for successful leader change >>>
                // Assuming API response might be just {success: true} or updated conv object
                (apiResponse) => {
                     console.log("Custom updateStateFunc running for leader change success:", apiResponse);

                     // FIND the conversation in the current state
                     setConversations(prevConvs => prevConvs.map(conv => {
                         if (conv.id === conversationId) {
                             // Update the leader ID and member roles in detailedMembers
                             const updatedDetailedMembers = conv.detailedMembers.map(member => {
                                 if (member.id === newLeaderId) return { ...member, role: 'leader' }; // New leader
                                  if (member.id === currentUserId) return { ...member, role: 'member' }; // Old leader becomes member
                                  return member; // Other members unchanged
                             }).filter(member => !member.leftAt); // Filter out left members

                             // Update the conversation object
                             return {
                                 ...conv,
                                 leader: newLeaderId, // Set the new leader ID
                                 detailedMembers: updatedDetailedMembers, // Use the updated member list
                                  statusText: `${updatedDetailedMembers.length} members`, // Update member count text
                                 // API response might contain updated last_updated timestamp, you can use it here if needed.
                             };
                         }
                         return conv; // Return other conversations unchanged
                     }));

                      // Update active chat state if it's the current chat
                     setActiveChat(prevActive => {
                         if (!prevActive || prevActive.id !== conversationId) return prevActive;

                         // Update member roles in detailedMembers of active chat
                         const updatedDetailedMembers = prevActive.detailedMembers.map(member => {
                              if (member.id === newLeaderId) return { ...member, role: 'leader' };
                               if (member.id === currentUserId) return { ...member, role: 'member' };
                               return member;
                          }).filter(member => !member.leftAt); // Filter out left members

                         return {
                             ...prevActive,
                             leader: newLeaderId, // Set the new leader ID
                             detailedMembers: updatedDetailedMembers, // Use the updated member list
                              statusText: `${updatedDetailedMembers.length} members`, // Update member count text
                             // API response might contain updated last_updated timestamp.
                              // time: ... // Update formatted time if needed
                         };
                     });
                }
                // <<< End custom updateStateFunc >>>
             );
             // setActionError is cleared by performSettingsAction on success or when starting
        } else {
             // User cancelled
             setActionError(null); // Clear error if it was set before confirm
        }
   }, [activeChat, performSettingsAction, currentUserIdRef, updateMemberRoleApi, setConversations, setActiveChat, setActionError]); // Add dependencies

    const handleStepDownLeader = useCallback(async (conversationId, leaderId) => {
         const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || activeChat.leader !== currentUserId || leaderId !== currentUserId || !currentUserId) return;
         const membersList = activeChat.detailedMembers;
         const numberOfLeaders = membersList.filter(m => m.role === 'leader' && m.leftAt === null).length;
         if (window.confirm("Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left.")) {
              await performSettingsAction(
                   () => updateMemberRoleApi({ conversationId, memberId: leaderId, newRole: 'member' }),
                   "Step down as leader"
               );
         }
    }, [activeChat, currentUserIdRef, performSettingsAction]);


   const handleAddUserSearch = useCallback(async (searchTerm) => {
        if (!searchTerm.trim()) {
            setAddUserSearchResults([]);
            setActionError(null);
            return;
        }
       setIsPerformingAction(true); // Use performing action state for search
       setActionError(null);
       setAddUserSearchResults([]); // Clear previous results
       try {
           const results = await searchUsersApi(searchTerm.trim());
           if (results && Array.isArray(results)) {
               // Filter out users already in the group (check against detailedMembers)
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
           setIsPerformingAction(false); // Reset performing action state
       }
   }, [activeChat, performSettingsAction]);


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

     // Check if current user has permission (is leader)
     const isCurrentUserLeader = activeChat.leader === currentUserId;
     if (!isCurrentUserLeader) {
         setActionError("Only the leader can add members.");
         return;
     }

     // Check if user is already an active member (should be filtered by search, but double check)
      const isAlreadyMember = activeChat.detailedMembers?.some(m => m.id === userIdToAdd && m.leftAt === null);
      if (isAlreadyMember) {
           setActionError("User is already an active member of this group.");
           setAddUserSearchResults([]); // Clear results as action isn't needed
           setAddUserInput('');
           setSelectedUserToAdd(null);
           return;
      }


     // Clear search results and error message on confirm
     setAddUserSearchResults([]); // Clear immediately for better UX
     setAddUserInput(''); // Clear input immediately
     setSelectedUserToAdd(null); // Clear selection immediately
     setActionError(null); // Clear action error before API call


     await performSettingsAction(
        () => addNewMemberApi({ conversationId, newMemberId: userIdToAdd, role: 'member' }), // API call
        "Add member", // Success message text
         // <<< Custom updateStateFunc for successful member add >>>
         (apiResponse) => {
             console.log("Custom updateStateFunc running for add member success:", apiResponse);
             // Update core states (conversations, activeChat) based on API response or local userToAdd info.
             // This logic remains the same as previously refined.
             const updatedConvData = apiResponse?.conversation || apiResponse?.data || apiResponse;

             if (updatedConvData && updatedConvData._id) {
                  const membersWithDetails = updatedConvData.members?.map(m => ({
                     ...m,
                     id: (m.id && typeof m.id === 'object' && m.id._id) ? String(m.id._id).trim() : (typeof m.id === 'string' ? m.id.trim() : null)
                 })) || [];

                 setConversations(prevConvs => prevConvs.map(conv => {
                     if (conv.id === conversationId) {
                          return {
                              ...conv,
                              members: updatedConvData.members || conv.members,
                              detailedMembers: membersWithDetails,
                               statusText: `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members`,
                          };
                     }
                     return conv;
                 }));

                 setActiveChat(prevActive => {
                     if (!prevActive || prevActive.id !== conversationId) return prevActive;
                     const membersWithDetailsActive = updatedConvData.members?.map(m => ({
                         ...m,
                         id: (m.id && typeof m.id === 'object' && m.id._id) ? String(m.id._id).trim() : (typeof m.id === 'string' ? m.id.trim() : null)
                     })) || [];
                      return {
                         ...prevActive,
                         members: updatedConvData.members || prevActive.members,
                         detailedMembers: membersWithDetailsActive,
                         statusText: `${membersWithDetailsActive?.filter(m => m.leftAt === null)?.length || 0} members`,
                      };
                 });

             } else {
                  console.warn("Add member API success but response did not contain expected conversation data. Manually adding user info to state.", apiResponse);
                  // Fallback: Manually add the user to detailedMembers using the userToAdd info
                  const addedUserDetailed = {
                       id: userToAdd._id,
                       role: 'member',
                       leftAt: null,
                       addedAt: new Date().toISOString(),
                       fullName: userToAdd.fullName,
                       avatar: userToAdd.avatar,
                       email: userToAdd.email,
                   };
                   setConversations(prevConvs => prevConvs.map(conv => {
                        if (conv.id === conversationId) {
                            const updatedDetailedMembers = [...(conv.detailedMembers || []), addedUserDetailed];
                             return {
                                 ...conv,
                                 detailedMembers: updatedDetailedMembers,
                                 statusText: `${updatedDetailedMembers?.filter(m => m.leftAt === null)?.length || 0} members`,
                             };
                        }
                       return conv;
                   }));
                    setActiveChat(prevActive => {
                        if (!prevActive || prevActive.id !== conversationId) return prevActive;
                         const updatedDetailedMembers = [...(prevActive.detailedMembers || []), addedUserDetailed];
                        return {
                            ...prevActive,
                            detailedMembers: updatedDetailedMembers,
                            statusText: `${updatedDetailedMembers?.filter(m => m.leftAt === null)?.length || 0} members`,
                        };
                    });
             }
         }
         // <<< End custom updateStateFunc >>>
    );
     // setActionError is cleared by performSettingsAction
}, [activeChat, performSettingsAction, addUserSearchResults, currentUserIdRef, addNewMemberApi, setConversations, setActiveChat, setActionError, setAddUserSearchResults]);

    const handleLeaveGroup = useCallback(async (conversationId) => {
        const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;

         const isCurrentUserActiveMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
         const isCurrentUserLeaderAndOnlyLeader = activeChat.leader === currentUserId && activeChat.detailedMembers?.filter(m => m.role === 'leader' && m.leftAt === null).length <= 1;
         const totalActiveMembers = activeChat.detailedMembers?.filter(m => m.leftAt === null).length || 0;


         if (!isCurrentUserActiveMember) {
              setActionError("You are not an active member of this group.");
              return;
         }
         // If the current user is the only leader and there are other members, they cannot leave directly
         // They must first transfer leadership or the system must automatically assign a new one.
         // Based on previous logic, allow leaving even if only leader IF there's only 1 total member
         // (meaning leaving dissolves the group or leaves it empty - handled by backend).
         // If only leader and > 1 member, disallow leaving unless leadership is handled.
         if (isCurrentUserLeaderAndOnlyLeader && totalActiveMembers > 1) {
             setActionError("You cannot leave this group as the only leader. Please assign a new leader first.");
             return;
         }


         if (window.confirm("Are you sure you want to leave this group?")) {
              await performSettingsAction(
                () => leaveConversationApi({ conversationId }),
                "Leave group",
                 (response) => {
                     // On successful leave, remove conversation from list and clear active chat
                     setConversations(prevConvs => prevConvs.filter(conv => conv.id !== conversationId));
                     setActiveChat(null);
                     setIsSettingsOpen(false);
                     setIsMobileChatActive(false);
                     // Reset input area states on leaving group
                     setMessageInput('');
                     setEditingMessageId(null);
                     setSendingMessage(false);
                 }
              );
         }
    }, [activeChat, performSettingsAction, currentUserIdRef]);

    const handleDeleteGroup = useCallback(async (conversationId) => {
         const currentUserId = currentUserIdRef.current;
          // Only the leader can delete a group
          if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || activeChat.leader !== currentUserId || !currentUserId) {
              console.warn("User is not authorized to delete this group.");
              setActionError("You must be the leader to delete the group.");
              return;
          }

          if (window.confirm("Are you sure you want to delete this group permanently? This action cannot be undone.")) {
               await performSettingsAction(
                 () => deleteGroupApi({ conversationId }),
                 "Delete group",
                  (response) => {
                      // On successful delete, remove conversation from list and clear active chat
                      setConversations(prevConvs => prevConvs.filter(conv => conv.id !== conversationId));
                      setActiveChat(null);
                      setIsSettingsOpen(false);
                      setIsMobileChatActive(false);
                      // Reset input area states on deleting group
                      setMessageInput('');
                      setEditingMessageId(null);
                      setSendingMessage(false);
                  }
               );
          }
    }, [activeChat, currentUserIdRef, performSettingsAction]);

     const handleDeleteConversationMember = useCallback(async (conversationId) => {
         const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || activeChat.isGroup || !currentUserId) { // Only applicable to 1-on-1 chats
              console.warn("Delete conversation member action only for 1-on-1 chats.");
              return;
         }
           if (window.confirm("Are you sure you want to delete this conversation? (This will only delete it for you)")) {
               await performSettingsAction(
                 () => deleteConversationMemberApi({ conversationId }),
                 "Delete conversation",
                  (response) => {
                      // On successful delete, remove conversation from list and clear active chat
                      setConversations(prevConvs => prevConvs.filter(conv => conv.id !== conversationId));
                      setActiveChat(null);
                      setIsSettingsOpen(false);
                      setIsMobileChatActive(false);
                      // Reset input area states on deleting conversation
                      setMessageInput('');
                      setEditingMessageId(null);
                      setSendingMessage(false);
                  }
               );
          }
    }, [activeChat, performSettingsAction, currentUserIdRef]);


    const handleStartEditGroupName = useCallback(() => {
         if (activeChat?.isGroup && activeChat.name) {
             setEditingGroupName(activeChat.name);
             setIsEditingName(true);
             setActionError(null); // Clear error when starting edit
              // Should input area be disabled/hidden while editing group name? Probably.
              // setSendingMessage(true); // Or a specific state
         }
    }, [activeChat]);

     const handleCancelEditGroupName = useCallback(() => {
         setIsEditingName(false);
         setEditingGroupName(''); // Reset text
         setActionError(null); // Clear error
         // Re-enable input area
         // setSendingMessage(false); // Or reset specific state
     }, []);

        const handleSaveEditGroupName = useCallback(async () => {
         const currentUserId = currentUserIdRef.current;
         const conversationId = activeChat?.id;
         const newName = editingGroupName.trim(); // Lấy tên mới từ state

          if (!conversationId || !activeChat?.isGroup || !newName || !currentUserId) {
              if (!newName) setActionError("Group name cannot be empty.");
              console.warn("Invalid request to update group name.");
              return;
          }
          // Optional: Check if the current user has permissions to rename (e.g., is leader)
          // const isLeader = activeChat.leader === currentUserId;
          // if (!isLeader) { setActionError("Only the leader can rename the group."); return; }

           setActionError(null);
           setIsPerformingAction(true); // Disable buttons during save


         await performSettingsAction(
             () => updateConversationNameApi({ conversationId, newName }), // Truyền API call
             "Update group name", // Truyền thông báo thành công
             // <<< Truyền hàm callback xử lý cập nhật state khi API thành công >>>
             (apiResponse) => { // apiResponse ở đây là { success: true, message: ... }
                 console.log("Custom updateStateFunc running for name change success:", apiResponse);
                 // Cập nhật state conversations: Tìm conversation bằng ID và thay đổi tên
                 setConversations(prevConvs => prevConvs.map(conv =>
                     conv.id === conversationId ? { ...conv, name: newName } : conv // Sử dụng newName đã có ở scope ngoài
                 ));
                 // Cập nhật state activeChat: Thay đổi tên của activeChat
                 setActiveChat(prevActive => {
                     if (!prevActive || prevActive.id !== conversationId) return prevActive; // Đảm bảo đúng chat đang active
                     return { ...prevActive, name: newName }; // Sử dụng newName
                 });
                 // Đóng chế độ chỉnh sửa và xóa nội dung input
                 setIsEditingName(false);
                 setEditingGroupName('');
                 // Xóa lỗi nếu có lỗi trước đó
                 setActionError(null);
                 // Bạn có thể muốn hiển thị một thông báo thành công nhỏ ở đây nếu cần
                 // Ví dụ: alert(apiResponse.message || "Tên nhóm đã được cập nhật.");
             }
             // <<< Kết thúc hàm callback >>>
         );
         // setIsPerformingAction(false); // Được gọi trong finally của performSettingsAction
    }, [activeChat, currentUserIdRef, editingGroupName, performSettingsAction, setConversations, setActiveChat, setIsEditingName, setEditingGroupName, setActionError]); // Thêm các setters vào dependency array


    // --- Handle Delete Message (Existing Logic) ---
        // Handler to delete a message
        const handleDeleteMessage = useCallback(async (messageId) => {
            const currentUserId = currentUserIdRef.current;
    
            // --- 1. Validate Parameters and State ---
            if (!messageId || !activeChat?.id || !currentUserId) {
                 console.warn("Cannot delete message: Invalid parameters or no active chat/user.");
                 setActionError("Cannot perform action without active chat or user.");
                 return;
            }
    
            // Find the message in the current messages state
            const messageToDelete = messages.find(msg => msg.id === messageId);
    
            // Check if the message exists and if the current user is the sender
            if (!messageToDelete) {
                console.warn(`Cannot delete message ${messageId}: Message not found in state.`);
                setActionError("Message not found in current view.");
                return;
            }
             // SenderId is already trimmed in state
            if (messageToDelete.senderId !== currentUserId) {
                console.warn(`Cannot delete message ${messageId}: Not the sender.`);
                setActionError("You can only delete your own messages.");
                return;
            }
             // Prevent deleting messages that are still in transient states or being edited
             if (messageToDelete.status && ['uploading', 'sending', 'failed'].includes(messageToDelete.status)) {
                  console.warn(`Cannot delete message ${messageId}: Message status is '${messageToDelete.status}'.`);
                  setActionError("Cannot delete message while uploading or sending.");
                  return;
             }
             // Prevent deleting a message if it's the one currently being edited
             if (messageId === editingMessageId) {
                 console.warn(`Cannot delete message ${messageId}: Message is currently being edited.`);
                 setActionError("Cannot delete message while editing.");
                 return;
             }
    
    
            if (window.confirm("Are you sure you want to delete this message?")) {
                 // --- 2. Capture original state before optimistic update (for reverting on failure) ---
                 // We need a copy of the original message object's relevant state parts
                 const originalMessageState = messages.find(msg => msg.id === messageId); // Find again in case state changed slightly
                  if (!originalMessageState) { // Should not happen given checks above, but safety
                      console.error("Original message state not found for revert during delete optimistic update.");
                      // Decide if you should abort or proceed with just the optimistic update. Proceeding is safer.
                  }
                  // Create a copy for potential revert
                  const originalMessageStateCopy = originalMessageState ? { ...originalMessageState } : null;
    
    
                 // --- 3. Optimistic UI update: Mark message as deleted immediately ---
                 // This changes the state *before* the API call. MessageBubble should pick this up.
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === messageId ? {
                            ...msg,
                            isDeleted: true,
                            // Clear content for text/file previews, but keep structure if needed for revert
                            // For text: content should be { text: { data: '' } }
                            // For file: content should be { file: { data: null, metadata: {...} } }
                            // For image: content should be { image: [{ data: null, metadata: {...} }] } (or similar based on your structure)
                            content: msg.type === 'text' ? { text: { data: '' } } :
                                     (msg.type === 'file' && msg.content?.file) ? { file: { ...msg.content.file, data: null } } :
                                     (msg.type === 'image' && Array.isArray(msg.content?.image)) ? { image: msg.content.image.map(img => ({ ...img, data: null })) } : msg.content, // Fallback to original content if structure is unexpected
    
                            // Optional: Add a 'deleting' status visually
                            // status: 'deleting',
                        } : msg
                    )
                );
                setActionError(null); // Clear any previous action error before API call
    
    
                // --- 4. Call the API to delete the message on the server ---
                // setSendingMessage(true); // Delete might not need sendingMessage state if it doesn't block input
    
    
                try {
                    // Call the delete API
                    // Assuming API expects { messageId: "string" } in body
                    const response = await deleteMessageApi({ messageId });
    
                    // <<< ĐIỀU CHỈNH QUAN TRỌNG: Kiểm tra thành công/thất bại dựa trên định dạng API thực tế >>>
                    // Dựa trên kinh nghiệm và lỗi trước, API thành công có thể trả về { success: true }
                    // hoặc không trả về thuộc tính success khi thành công.
                    // API thất bại có thể trả về { success: false, ... } hoặc ném lỗi HTTP.
                    // Ta kiểm tra nếu response tồn tại VÀ có thuộc tính success == false.
                    // Nếu không phải trường hợp này, TA GIẢ ĐỊNH LÀ THÀNH CÔNG (vì try/catch sẽ bắt lỗi fetch/HTTP).
                     if (response && response.success === false) {
                         // --- 5. Handle API failure (API returned a response, but explicitly said success: false) ---
                         console.error(`Failed to delete message ${messageId} on server:`, response?.message || response?.error || "API reported failure.");
                         // Log full response if it's not just message/error
                          if (!response?.message && !response?.error) console.error("Full API error response:", response);
    
    
                         let detailedErrorMessage = response?.message || response?.error || "Failed to delete message on server.";
                         setActionError(detailedErrorMessage);
    
                         // Revert optimistic update on explicit failure
                          if (originalMessageStateCopy) { // Only revert if we captured the original state
                              setMessages(prevMessages =>
                                  prevMessages.map(msg =>
                                      msg.id === messageId ? { ...msg, content: originalMessageStateCopy.content, isDeleted: originalMessageStateCopy.isDeleted, status: originalMessageStateCopy.status, time: originalMessageStateCopy.time, createdAt: originalMessageStateCopy.createdAt } : msg
                                  )
                              );
                          } else {
                               console.warn("Could not revert optimistic delete for message:", messageId, "Original state was not captured.");
                               // Depending on UX, you might leave it deleted visually or try to refetch.
                          }
    
    
                     } else {
                         // <<< 6. SUCCESS SCENARIO >>>
                         // API call finished without throwing AND response did not indicate explicit failure.
                         // This is server-side success.
                         console.log(`Message ${messageId} deleted successfully on server.`, response);
                         // The optimistic update (step 3) already handled the UI change (marking as deleted).
                         // No further setMessages call is needed here for the message itself to mark it as deleted.
                         // We just need to ensure any status added during optimistic update is removed (e.g. 'deleting')
                         setMessages(prevMessages =>
                             prevMessages.map(msg =>
                                 msg.id === messageId ? { ...msg, status: msg.isDeleted ? msg.status : 'sent' } : msg // Reset status unless it's already 'failed' etc. Keep 'isDeleted' true from optimistic update.
                                 // OR simply remove status if you used a transient 'deleting' status
                                 // msg.id === messageId ? { ...msg, status: 'sent' } : msg // If you used 'deleting' status
                             )
                         );
    
    
                         // --- Optional: Update conversation list if the latest message was deleted ---
                         setConversations(prevConvs => {
                             const activeConvIndex = prevConvs.findIndex(conv => conv.id === activeChat?.id);
                             if (activeConvIndex === -1) return prevConvs; // Active chat not found in list
    
                             const activeConv = prevConvs[activeConvIndex];
                              // Check if the deleted message was the latest message in the active chat
                              // Note: Need to check activeConv.latestMessage BEFORE it's potentially updated by a new message arriving
                             if (activeConv.latestMessage === messageId) {
                                  // Find the previous message's preview and timestamp if possible
                                  // This requires looking in the 'messages' state, which is tricky here
                                  // A simpler approach is to set a generic "Message deleted" preview.
                                  const previousMessageIndex = messages.findIndex(msg => msg.id === messageId) - 1;
                                  const previousMessage = previousMessageIndex >= 0 ? messages[previousMessageIndex] : null;
    
                                   const updatedConversations = [...prevConvs];
                                   updatedConversations[activeConvIndex] = {
                                       ...activeConv,
                                       // Set lastMessage based on the previous message or a placeholder
                                       lastMessage: previousMessage ? (previousMessage.type === 'text' ? previousMessage.content?.text?.data || '' : `[${previousMessage.type.toUpperCase()}]`) : "[Message deleted]",
                                        // Set timestamp based on previous message or a recent time
                                       time: previousMessage ? previousMessage.time : new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
                                       latestMessageTimestamp: previousMessage ? previousMessage.createdAt : new Date().toISOString(),
                                       // Keep latestMessage ID as the ID of the *previous* message if found, or null
                                       latestMessage: previousMessage ? previousMessage.id : null,
                                   };
                                    // Re-sort the list
                                    updatedConversations.sort((a, b) => {
                                      const dateA = new Date(a.latestMessageTimestamp || 0);
                                      const dateB = new Date(b.latestMessageTimestamp || 0);
                                      return dateB.getTime() - dateA.getTime();
                                   });
    
                                  return updatedConversations;
                             }
                              // If not the latest message, return the list unchanged
                             return prevConvs;
                         });
                     }
    
                } catch (err) {
                    // --- 7. Handle API call error (network error, fetch rejected, unhandled exception in apiCall) ---
                    console.error(`Error calling delete message API for ${messageId}:`, err);
    
                    const detailedErrorMessage = err.message || 'An API error occurred while deleting message.';
                    setActionError(detailedErrorMessage);
    
                     // Revert optimistic update on API call error
                     if (originalMessageStateCopy) { // Only revert if we captured the original state
                         setMessages(prevMessages =>
                             prevMessages.map(msg =>
                                msg.id === messageId ? { ...msg, content: originalMessageStateCopy.content, isDeleted: originalMessageStateCopy.isDeleted, status: originalMessageStateCopy.status, time: originalMessageStateCopy.time, createdAt: originalMessageStateCopy.createdAt } : msg
                             )
                         );
                     } else {
                          console.warn("Could not revert optimistic delete for message:", messageId, "Original state was not captured on API error.");
                     }
                } finally {
                     // --- 8. Cleanup ---
                     // setSendingMessage(false); // Only if it was set true before try
                }
            }
        },  [activeChat?.id, messages, currentUserIdRef, deleteMessageApi, editingMessageId]); // Added editingMessageId to dependencies


    // --- Handle Edit Message (Initiate Edit - Called from MessageBubble) ---
    // Renamed from handleEditMessage to handleInitiateEditMessage for clarity
    const handleInitiateEditMessage = useCallback(async (messageId, currentText) => { // Receive current text as well
        const currentUserId = currentUserIdRef.current;
         if (!messageId || !activeChat?.id || !currentUserId) { console.warn("Cannot initiate edit message: Invalid parameters or no active chat/user."); return; }
         // Find the message in the current messages state
         const messageToEdit = messages.find(msg => msg.id === messageId);
          if (!messageToEdit) {
              console.warn(`Cannot initiate edit message ${messageId}: Message not found in state.`);
              setActionError("Message not found.");
              return;
          }
          // Check if the current user is the sender, it's a text message, and it's already sent
          if (messageToEdit.senderId !== currentUserId || messageToEdit.type !== 'text') {
              console.warn(`Cannot initiate edit message ${messageId}: Not the sender or not a text message.`);
              setActionError("You can only edit your own text messages.");
              return;
          }
           // Prevent editing messages that are not 'sent' status
           if (messageToEdit.status !== 'sent') {
               console.warn(`Cannot initiate edit message ${messageId}: Message status is '${messageToEdit.status}'.`);
               setActionError("Cannot edit messages that are not yet sent.");
               return;
           }
           // Prevent initiating edit if another action is in progress (sending, uploading, or another edit)
           if (sendingMessage || editingMessageId !== null) {
                console.warn(`Cannot initiate edit message ${messageId}: Another action is in progress.`);
                setActionError(editingMessageId !== null ? "Another message is currently being edited." : "Another action is in progress.");
                return;
           }


         // --- Set state to put input area in edit mode ---
         setActionError(null); // Clear any previous error
         setEditingMessageId(messageId);
         setMessageInput(currentText); // Set initial text from message content into the input
         // setSendingMessage remains false until Save is clicked
         console.log(`Initiating edit for message ${messageId} with text: "${currentText}"`);

    }, [activeChat?.id, messages, currentUserIdRef, sendingMessage, editingMessageId]); // Added sendingMessage, editingMessageId to dependencies


    // --- Handle Save Edited Message (Called from ChatWindow onSubmit) ---
    const handleSaveEditedMessage = useCallback(async () => {
        // Get the ID of the message being edited from state
        const messageId = editingMessageId;
        // Get the current user ID from ref
        const currentUserId = currentUserIdRef.current;
        // Get the new text from the input state
        const newText = messageInput;

        // --- 1. Validate Parameters and State ---
        if (!messageId || !activeChat?.id || !currentUserId) {
            console.warn("Cannot save edit: Invalid state (no message ID, no chat, or no user).");
             // Clear editing state immediately on invalid state
             setEditingMessageId(null);
             setMessageInput('');
             setActionError("Invalid request to save message.");
            return;
        }

        // Find the message in the current messages state to get original text and state
        const messageToEdit = messages.find(msg => msg.id === messageId);

        // Guard against message not found if state updated unexpectedly
         if (!messageToEdit) {
             console.warn(`Cannot save edit for message ${messageId}: Message not found in state.`);
             // Clear editing state immediately if message not found
             setEditingMessageId(null);
             setMessageInput('');
             setActionError("Message to edit not found in current view.");
             return;
         }

        // Get original text safely
        const originalText = messageToEdit?.content?.text?.data || '';
         const trimmedNewText = newText.trim();

        // If the text hasn't changed (after trimming), just cancel the edit mode
        if (trimmedNewText === originalText.trim()) {
             console.log("No change in message text, cancelling edit mode.");
             setActionError(null); // Clear any previous error related to starting edit
             setEditingMessageId(null); // Exit edit mode immediately
             setMessageInput(''); // Clear input immediately
             return;
        }

         // Prevent saving if already sending/saving
         if (sendingMessage) {
             console.warn("Cannot save edit: Already saving/sending another item.");
             setActionError("Save in progress. Please wait.");
             return;
         }

        // Basic validation: new text cannot be empty after trimming
        if (!trimmedNewText) {
             console.warn("Cannot save empty message.");
             setActionError("Edited message cannot be empty."); // Provide user feedback
             // Do NOT clear editing state here, let user fix or cancel
             return;
        }


         // --- 2. Capture original state before optimistic update (for reverting on failure) ---
         // We need a copy of the original message object's relevant state parts
         const originalMessageState = {
             content: messageToEdit.content, // Original content structure
             isEdited: messageToEdit.isEdited, // Original isEdited status (might be false)
             time: messageToEdit.time, // Original formatted time
             createdAt: messageToEdit.createdAt, // Original timestamp
             status: messageToEdit.status, // Original status (should be 'sent' for editing)
         };


         // --- 3. Optimistic UI update: Update message text and mark as edited immediately ---
         // This changes the state *before* the API call. MessageBubble should pick this up.
         // We also optimistically update time and createdAt IF we want the UI to reflect "just edited".
         // If you prefer the time/createdAt to only update when the API confirms, remove those lines here.
          setMessages(prevMessages =>
               prevMessages.map(msg =>
                   msg.id === messageId ? {
                       ...msg,
                       // Update content with new text
                       content: { ...msg.content, text: { ...(msg.content?.text), data: trimmedNewText } },
                       isEdited: true, // Optimistically mark as edited
                       // Optional: Optimistically update time/timestamp to show it was just edited
                       // time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
                       // createdAt: new Date().toISOString(),
                       // status: 'saving', // Optional visual status during API call
                   } : msg
               )
           );

        // <<< BƯỚC QUAN TRỌNG: Reset editing state NGAY LẬP TỨC sau optimistic update >>>
        // This triggers MessageBubble to exit 'editing-message' mode and display the new content from the updated 'messages' state.
        setEditingMessageId(null);
        setMessageInput('');
        // <<< KẾT THÚC BƯỚC QUAN TRỌNG >>>


        // --- 4. Call the API to save the edit on the server ---
         setSendingMessage(true); // Indicate that saving is in progress (disables input/buttons)
         setActionError(null); // Clear any previous action error before the API call


        try {
             // Call the edit API with message ID and new trimmed text
             // Assuming API expects { messageId: "string", "newData": "string" } in body
             const response = await editMessageApi({ messageId, newData: trimmedNewText });

             // <<< ĐIỀU CHỈNH QUAN TRỌNG: Kiểm tra thành công dựa trên định dạng API thực tế >>>
             // Dựa trên log của bạn, API thành công trả về object tin nhắn đã cập nhật.
             // Kiểm tra xem phản hồi có tồn tại và có vẻ như là một object tin nhắn hợp lệ không (ít nhất có _id khớp và isEdited).
             if (response && response._id === messageId && typeof response.isEdited === 'boolean') {
                 console.log(`Message ${messageId} edited successfully on server.`, response);

                 // --- 5. Update state with data from the successful API response ---
                 // This confirms/corrects the optimistic update with the definitive server data.
                 // It's crucial for properties like last_updated or if the server applies final formatting/sanitization.
                 setMessages(prevMessages =>
                      prevMessages.map(msg =>
                         msg.id === messageId ? {
                             ...msg,
                             // Update content with the *server's* version of content (most reliable)
                             content: response.content,
                             // Use server's isEdited status (should be true)
                             isEdited: response.isEdited,
                             // Use server's timestamp if available (e.g., last_updated for edits)
                             time: response.last_updated ? new Date(response.last_updated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : msg.time,
                             createdAt: response.last_updated || msg.createdAt, // Prefer last_updated if exists
                             status: 'sent', // Ensure status is 'sent' after server success
                             // Keep other properties from the existing state unless API response provides them
                             // senderId: response.senderId, // Should match currentUserId
                             // type: response.type, // Should be 'text'
                             // ... other properties from response if applicable ...
                         } : msg
                      )
                 );

                 // --- Optional: Update conversation list if latest message was edited ---
                 // This is more complex. You'd need to check if messageId is the active chat's latestMessage.
                 // If so, update the conversation's lastMessage text preview and time if needed.
                  setConversations(prevConvs => {
                      // Find the active chat in the conversations list
                      const activeConvIndex = prevConvs.findIndex(conv => conv.id === activeChat?.id);
                      if (activeConvIndex === -1) return prevConvs; // Active chat not found in list

                      const activeConv = prevConvs[activeConvIndex];
                       // Check if the edited message was the latest message
                       if (activeConv.latestMessage === messageId) {
                            const updatedConversations = [...prevConvs];
                            // Update the lastMessage preview and potentially the time
                            updatedConversations[activeConvIndex] = {
                                ...activeConv,
                                lastMessage: trimmedNewText, // Update preview with new text
                                time: response.last_updated ? new Date(response.last_updated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : activeConv.time,
                                latestMessageTimestamp: response.last_updated || activeConv.latestMessageTimestamp,
                            };
                            // Re-sort the list might be needed if time updated (less common for edits than new messages)
                            // If sorting by last message time, and edit updates time, resorting is correct.
                             updatedConversations.sort((a, b) => {
                                const dateA = new Date(a.latestMessageTimestamp || 0);
                                const dateB = new Date(b.latestMessageTimestamp || 0);
                                return dateB.getTime() - dateA.getTime();
                             });
                             return updatedConversations;
                       }
                       // If not the latest message, return the list unchanged
                      return prevConvs;
                  });


             } else {
                 // --- 6. Handle API failure (API returned a response, but not the expected success format) ---
                 console.error(`Failed to edit message ${messageId} on server. API response did not match expected success format:`, response);

                 // Try to extract a meaningful error message from the response, or use a fallback
                 let detailedErrorMessage = "Failed to edit message on server (unexpected response).";
                  // Add checks for other potential error structures from your API if known
                  if (response && response.message) detailedErrorMessage = response.message;
                  else if (response && response.error) detailedErrorMessage = response.error;


                 setActionError(detailedErrorMessage);

                 // Revert optimistic update on failure
                 setMessages(prevMessages =>
                    prevMessages.map(msg =>
                       // Use originalMessageState to restore the state before the optimistic update
                       msg.id === messageId && originalMessageState ? { ...msg, content: originalMessageState.content, isEdited: originalMessageState.isEdited, status: 'sent' } : msg
                    )
                 );
                  // Note: editingMessageId and messageInput were already cleared above,
                  // so the UI will be back to the empty input/non-editing mode.
             }

        } catch (err) {
             // --- 7. Handle API call error (network error, fetch rejected, unhandled exception in apiCall) ---
             console.error(`Error calling edit message API for ${messageId}:`, err);

             const detailedErrorMessage = err.message || 'An API error occurred while editing message.';
             setActionError(detailedErrorMessage);

              // Revert optimistic update on API call error
              // Use originalMessageState if message not found in current state for some reason during revert
              const messageBeforeRevert = messages.find(msg => msg.id === messageId) || originalMessageState;
               setMessages(prevMessages =>
                   prevMessages.map(msg =>
                       msg.id === messageId && messageBeforeRevert ? { ...msg, content: messageBeforeRevert.content, isEdited: messageBeforeRevert.isEdited, status: 'sent', time: messageBeforeRevert.time, createdAt: messageBeforeRevert.createdAt } : msg
                   )
               );
                // Note: editingMessageId and messageInput were already cleared above.
        } finally {
            // --- 8. Cleanup ---
            setSendingMessage(false); // Saving is complete, re-enable send/save button
            // editingMessageId and messageInput were already cleared after optimistic update
        }
    }, [activeChat?.id, editingMessageId, messageInput, messages, currentUserIdRef, sendingMessage, editMessageApi, setMessageInput, setActionError]); // Dependencies


    // --- Handle Cancel Edit (Called from ChatWindow) ---
    const handleCancelEdit = useCallback(() => {
        console.log(`Cancelling edit for message ${editingMessageId}.`);
        if (sendingMessage) { // Prevent cancelling if save is in progress
            console.warn("Cannot cancel edit: Save in progress.");
            setActionError("Save in progress. Please wait.");
            return;
        }
        // Reset editing state to exit edit mode
        setEditingMessageId(null);
        setMessageInput(''); // Clear the input text
        setActionError(null); // Clear any error related to starting/saving edit
        // Note: If you implemented an 'editing' status on the message, you'd reset it here.
   }, [editingMessageId, sendingMessage, setMessageInput]); // Added sendingMessage to dependencies


  // --- Render ---

  // Determine overall loading/error states
  const showInitialLoading = isAuthLoading || (isAuthenticated && user?._id && isLoadingConversations && !activeChat && !error);
  const showAuthError = !isAuthLoading && !isAuthenticated;
  // Show general error if there is one, AND we are NOT in a state where an action error is already being handled
  // This prevents showing two error messages at once.
  const showGeneralError = error && !isLoadingConversations && !isLoadingMessages && !isPerformingAction && !sendingMessage && !actionError && isAuthenticated;


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

  // If there's a general app error, display it prominently
  if (showGeneralError) {
       console.error("Rendering with general error:", error);
      return (
          <div className="chat-page-container">
              <div className="error-message">Error: {error}</div>
               {/* Optionally still show panels, maybe disabled or with reduced functionality */}
          </div>
      );
  }


   // Render normal UI when authenticated and no critical error
   return (
    <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>
 
      {/* Conversation List Panel (always visible except maybe on mobile when chat is active) */}
      <ConversationListPanel
          groups={filteredGroups} // Use filtered lists
          friends={filteredFriends} // Use filtered lists
          onSearchChange={handleSearchChange}
          onItemClick={handleConversationClick}
          activeChat={activeChat} // Pass active chat down for highlighting
          searchTerm={searchTerm} // Pass search term down if needed for highlighting matches
      />
 
      {/* Chat Window (visible when a chat is active) */}
      <ChatWindow
           activeContact={activeChat}
           messages={messages} // messages state contains messages with trimmed senderId and status
           onMobileBack={handleMobileBack}
           isMobile={isMobileChatActive}
           // Pass input state and setter down
           messageInput={messageInput} // <<< Pass input value
           setMessageInput={setMessageInput} // <<< Pass input setter
           // Pass handlers for sending/saving/cancelling
           onSendTextMessage={handleSendTextMessage} // For new messages (now reads from messageInput)
           onSendFile={handleSendFile} // For files (still receives file object)
           onSaveEditedMessage={handleSaveEditedMessage} // <<< New handler for saving edit (reads from messageInput)
           onCancelEdit={handleCancelEdit} // <<< New handler for cancelling edit
           isLoadingMessages={isLoadingMessages}
           onOpenSettings={activeChat?.isGroup ? handleOpenSettings : null}
           onDeleteMessage={handleDeleteMessage}
           // Pass the initiate edit handler (called from MessageBubble)
           onEditMessage={handleInitiateEditMessage} // <<< Use the handler that STARTS the edit
           currentUserId={currentUserIdRef.current} // Pass currentUserId (trimmed)
           sendingMessage={sendingMessage} // Pass sending state (disables input/buttons)
           editingMessageId={editingMessageId} // <<< Pass editingMessageId down (controls input area mode)
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
               isPerformingAction={isPerformingAction} // Pass performing action state for settings
               actionError={actionError} // Pass action error for settings/search
               searchResults={addUserSearchResults} // Pass search results
               onLeaveGroup={handleLeaveGroup}
               onDeleteGroup={handleDeleteGroup}
               onUpdateGroupName={handleUpdateGroupName} // Pass update name handler
               isEditingName={isEditingName} // Pass state for name edit input
               editingGroupName={editingGroupName} // Pass state for name edit input value
               onStartEditGroupName={handleStartEditGroupName} // Pass handler to start name edit
               onCancelEditGroupName={handleCancelEditGroupName} // Pass handler to cancel name edit
               onSaveEditGroupName={handleSaveEditGroupName} // Pass handler to save name edit
           />
       )}
    </div>
  );
 };
 
 export default ChatPage;