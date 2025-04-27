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
  const handleSendTextMessage = useCallback(async (newMessageText) => {
    const currentUserId = currentUserIdRef.current;

    if (!activeChat?.id || !currentUserId || sendingMessage || editingMessageId !== null || !newMessageText.trim()) {
        console.warn("Cannot send text message: Invalid state (no chat, no user, sending, editing, or empty).");
        return;
    }

    setSendingMessage(true); // Disable input area
    setActionError(null); // Clear previous action error
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // --- Optimistic Update for Text ---
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
      senderId: currentUserId, // Trimmed sender ID
    };
    setMessages(prevMessages => [...prevMessages, newMessageOptimistic]);
    setMessageInput(''); // Clear input immediately after sending optimistically

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
           setMessages(prevMessages => prevMessages.map(msg => {
                if (msg.id === tempId) {
                    // Update optimistic message with real data
                    return {
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
        msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg // Revert to optimistic structure but set status to failed
      ));
      // setMessageInput(newMessageText); // Restore input on error?
    } finally {
      setSendingMessage(false); // Re-enable input area
       // Do NOT clear editingMessageId here, as this is only for *new* messages
    }
  }, [activeChat, sendingMessage, editingMessageId, currentUserIdRef, conversations]);


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
          uploadedFileDetails = uploadResponse.data;

          // --- Step 2: Send Message with Uploaded File Details ---
          // Based on text message success and file error, the payload seems to be:
          // data: { data: "URL_STRING", type: "file"|"image" }
          const messagePayload = {
              conversationId: activeChat.id,
              type: fileType, // 'image' or 'file'
              data: { // This 'data' field is the content payload wrapper object
                  data: uploadedFileDetails.data, // <<< Use ONLY the URL string here
                  type: fileType // Type indicator within the content payload
                  // Metadata might need to be sent separately or is fetched by API from URL
              },
              replyToMessageId: null // TODO
          };
          console.log("File message send payload:", messagePayload); // Log payload before sending

          const sentMessage = await sendMessageApi(messagePayload); // Call your send message API
          console.log("File message sent successfully:", sentMessage);

          // --- Update optimistic message with real data ---
          if (sentMessage && sentMessage._id) {
              setMessages(prevMessages => prevMessages.map(msg => {
                   if (msg.id === tempId) {
                       // Update optimistic message with real data
                       return {
                           ...msg, // Keep optimistic fields like 'sender'
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
        setSendingMessage(false); // Re-enable input area
         // Do NOT clear editingMessageId here, this handler doesn't start/stop edits
      }
  }, [activeChat, sendingMessage, editingMessageId, currentUserIdRef, conversations]); // Added editingMessageId to dependencies


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
  // Renamed from performApiAction to clarify it's for non-input area actions
    const performSettingsAction = useCallback(async (apiCall, successMessage, updateStateFunc) => {
    setIsPerformingAction(true);
    setActionError(null); // Clear action error before performing new action
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
                        id: updatedConvData._id, // Ensure ID is correct
                        type: updatedConvData.isGroup ? 'group' : 'friend',
                        statusText: updatedConvData.isGroup ? `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members` : conv.statusText,
                        leader: leaderId,
                        members: updatedConvData.members || [], // Keep original members array if needed
                        detailedMembers: membersWithDetails, // Use detailed members with trimmed IDs
                    } : conv
                ));

                // Update active chat if it's the one being modified
                setActiveChat(prevActive => {
                    if (!prevActive || prevActive.id !== updatedConvData._id) return prevActive;
                     const leaderMemberActive = membersWithDetails?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
                     const leaderIdActive = leaderMemberActive ? leaderMemberActive.id : null;

                    return ({
                         ...prevActive,
                         ...updatedConvData,
                         id: updatedConvData._id, // Ensure ID is correct
                         type: updatedConvData.isGroup ? 'group' : 'friend',
                         statusText: updatedConvData.isGroup ? `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members` : prevActive.statusText,
                         leader: leaderIdActive,
                         detailedMembers: membersWithDetails,
                    });
                });

            } else if (response.message) {
                  console.log(response.message); // Log success message even if no data
            }

            if(updateStateFunc) updateStateFunc(response); // Custom state update logic

        } else {
             const errorMessage = response?.message || response?.error || "Action failed.";
             console.error(`${successMessage} failed:`, response);
             setActionError(errorMessage); // Set action-specific error
        }
    } catch (err) {
        console.error(`API call failed for ${successMessage}:`, err);
        setActionError(err.message || `An API error occurred during ${successMessage.toLowerCase()}.`);
    } finally {
        setIsPerformingAction(false);
    }
}, [activeChat, conversations, currentUserIdRef]);


  // --- Handlers for various actions using performSettingsAction ---
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
            await performSettingsAction(
               () => removeMemberApi({ conversationId, memberId: userIdToRemove }),
               "Remove member"
            );
       }
   }, [activeChat, performSettingsAction, currentUserIdRef]);

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
        await performSettingsAction(
            () => updateConversationNameApi({ conversationId, newName }),
            "Update group name",
            () => setIsEditingName(false)
        );
    }, [activeChat, currentUserIdRef, performSettingsAction]);

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
             await performSettingsAction(
                () => updateMemberRoleApi({ conversationId, memberId: newLeaderId }),
                "Change leader"
             );
        }
   }, [activeChat, performSettingsAction, currentUserIdRef]);

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
        // Clear search results and error message on confirm
        setAddUserSearchResults([]);
        setActionError(null);

        await performSettingsAction(
            () => addNewMemberApi({ conversationId, newMemberId: userIdToAdd, role: 'member' }),
            "Add member"
            // updateStateFunc handled by performSettingsAction updating activeChat/conversations
        );
   }, [activeChat, performSettingsAction, addUserSearchResults, currentUserIdRef]);


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


    // State and handlers for editing group name
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingGroupName, setEditingGroupName] = useState('');

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
         const newName = editingGroupName.trim();

          if (!conversationId || !activeChat?.isGroup || !newName || !currentUserId) {
              if (!newName) setActionError("Group name cannot be empty.");
              console.warn("Invalid request to update group name.");
              return;
          }
          // Optional: Check if the current user has permissions to rename (e.g., is leader)
          // const isLeader = activeChat.leader === currentUserId;
          // if (!isLeader) { setActionError("Only the leader can rename the group."); return; }

           // Clear error before attempting save
           setActionError(null);
           // Disable buttons during save
           setIsPerformingAction(true); // Use general action state

         await performSettingsAction(
             () => updateConversationNameApi({ conversationId, newName }),
             "Update group name",
             () => {
                  setIsEditingName(false); // Close input on success
                  setEditingGroupName(''); // Clear input
                  // Re-enable input area if it was disabled
                  // setSendingMessage(false);
             }
         );
         // setIsPerformingAction(false); // Moved to performSettingsAction finally block
    }, [activeChat, currentUserIdRef, editingGroupName, performSettingsAction]);


    // --- Handle Delete Message (Existing Logic) ---
    const handleDeleteMessage = useCallback(async (messageId) => {
        const currentUserId = currentUserIdRef.current;
        if (!messageId || !activeChat?.id || !currentUserId) { console.warn("Cannot delete message: Invalid parameters or no active chat/user."); return; }
        // Find the message in the current messages state
        const messageToDelete = messages.find(msg => msg.id === messageId);
        // Check if the message exists and if the current user is the sender
        if (!messageToDelete) {
            console.warn(`Cannot delete message ${messageId}: Message not found in state.`);
            setActionError("Message not found."); // Set action-specific error
            return;
        }
         // SenderId is already trimmed in state
        if (messageToDelete.senderId !== currentUserId) {
            console.warn(`Cannot delete message ${messageId}: Not the sender.`);
            setActionError("You can only delete your own messages."); // Set action-specific error
            return;
        }
         // Prevent deleting messages that are still uploading/sending/failed (adjust based on backend)
         if (messageToDelete.status && ['uploading', 'sending', 'failed'].includes(messageToDelete.status)) {
              console.warn(`Cannot delete message ${messageId}: Message status is '${messageToDelete.status}'.`);
              setActionError("Cannot delete message while uploading or sending."); // Set action-specific error
              return;
         }
         // Prevent deleting a message if it's the one currently being edited
         if (messageId === editingMessageId) {
             console.warn(`Cannot delete message ${messageId}: Message is currently being edited.`);
             setActionError("Cannot delete message while editing."); // Set action-specific error
             return;
         }


        if (window.confirm("Are you sure you want to delete this message?")) {
             // --- Optimistic UI update: Mark message as deleted immediately ---
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId ? { ...msg, isDeleted: true, content: { text: { data: '' } } } : msg // Clear content for deleted text msg preview
                )
            );
            setActionError(null); // Clear action error before API call

            try {
                // Call the delete API
                const response = await deleteMessageApi({ messageId }); // Assuming API expects messageId in body

                 if (!response || !response.success) {
                     console.error(`Failed to delete message ${messageId}:`, response?.message || response?.error);
                     setActionError(response?.message || response?.error || "Failed to delete message on server.");
                     // Revert optimistic update on failure (optional but good UX)
                      setMessages(prevMessages =>
                          prevMessages.map(msg =>
                              msg.id === messageId ? { ...msg, isDeleted: false, content: messageToDelete.content } : msg // Restore content and isDeleted status
                          )
                      );
                 } else {
                     console.log(`Message ${messageId} deleted successfully on server.`);
                     // No further state update needed if optimistic update was correct
                 }

            } catch (err) {
                console.error(`Error calling delete message API for ${messageId}:`, err);
                setActionError(err.message || 'An API error occurred while deleting message.');
                 // Revert optimistic update on API call error
                 setMessages(prevMessages =>
                     prevMessages.map(msg =>
                         msg.id === messageId ? { ...msg, isDeleted: false, content: messageToDelete.content } : msg // Restore content and isDeleted status
                     )
                 );
            }
        }
    }, [activeChat?.id, messages, currentUserIdRef, deleteMessageApi, editingMessageId]); // Added editingMessageId to dependencies


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
        // Use the ID stored in state
        const messageId = editingMessageId;
        const currentUserId = currentUserIdRef.current;
        const newText = messageInput; // Get text from the input state

        // Validate parameters and state
        if (!messageId || !activeChat?.id || !currentUserId || !newText.trim()) {
            console.warn("Cannot save edit: Invalid state (no message ID, no chat, no user, or empty text).");
             // Clear editing state and show error
             setEditingMessageId(null);
             setMessageInput(''); // Clear input on invalid save attempt
             setActionError("Invalid text provided for edit.");
            return;
        }

         // Prevent saving if already sending/saving
         if (sendingMessage) {
             console.warn("Cannot save edit: Already saving/sending.");
             setActionError("Save in progress. Please wait.");
             return;
         }


        // Find the message in the current messages state to get original text
        const messageToEdit = messages.find(msg => msg.id === messageId);
        const originalText = messageToEdit?.content?.text?.data || '';

        // If the text hasn't changed, just cancel the edit mode
        if (newText.trim() === originalText.trim()) {
             console.log("No change in message text, cancelling edit mode.");
             setActionError(null); // Clear any previous error
             setEditingMessageId(null); // Exit edit mode
             setMessageInput(''); // Clear input
             return;
        }


         setSendingMessage(true); // Indicate that saving is in progress (disables input/buttons)
         setActionError(null); // Clear any previous error


         // --- Optimistic UI update: Update message text immediately ---
         // Use the messageToEdit found earlier to get original state
          setMessages(prevMessages =>
               prevMessages.map(msg =>
                   msg.id === messageId ? {
                       ...msg,
                       content: { text: { type: 'text', data: newText.trim() } }, // Update content with new text
                        // isEdited might be set true optimistically here, or wait for API confirmation
                        isEdited: true, // Optimistically mark as edited
                       // status: 'saving', // Optional: Add a 'saving' status
                   } : msg
               )
           );


        try {
             // Call the edit API
             const response = await editMessageApi({ messageId, newData: newText.trim() });

             if (!response || !response.success) {
                 console.error(`Failed to edit message ${messageId} on server:`, response?.message || response?.error);
                 setActionError(response?.message || response?.error || "Failed to edit message.");
                 // Revert optimistic update on failure
                 setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === messageId ? { ...msg, content: messageToEdit.content, isEdited: messageToEdit.isEdited, status: 'sent' } : msg // Revert content, isEdited status, reset status
                    )
                 );
             } else {
                 console.log(`Message ${messageId} edited successfully on server.`, response.data);
                 // Update state based on API response if needed (e.g., if API confirms isEdited)
                 // If API response has the updated message, you could use it to update the state
                 // For now, we assume the optimistic update is correct and just ensure status is sent
                 setMessages(prevMessages =>
                     prevMessages.map(msg =>
                         msg.id === messageId ? { ...msg, isEdited: response.data?.isEdited || true, status: 'sent' } : msg // Ensure isEdited is true and status is sent
                     )
                  );
             }

        } catch (err) {
             console.error(`Error calling edit message API for ${messageId}:`, err);
             setActionError(err.message || 'An API error occurred while editing message.');
              // Revert optimistic update on API call error
              setMessages(prevMessages =>
                  prevMessages.map(msg =>
                      msg.id === messageId ? { ...msg, content: messageToEdit.content, isEdited: messageToEdit.isEdited, status: 'sent' } : msg // Revert content, isEdited status, reset status
                  )
              );
        } finally {
            setSendingMessage(false); // Saving is complete, re-enable input area
            setEditingMessageId(null); // Exit edit mode
            setMessageInput(''); // Clear input after saving
        }
    }, [activeChat?.id, editingMessageId, messageInput, messages, currentUserIdRef, sendingMessage, editMessageApi]); // Added messageInput, sendingMessage to dependencies


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
    }, [editingMessageId, sendingMessage]); // Added sendingMessage to dependencies


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
          onSendTextMessage={handleSendTextMessage} // For new messages
          onSendFile={handleSendFile} // For files
          onSaveEditedMessage={handleSaveEditedMessage} // <<< New handler for saving edit
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

      {/* Chat Settings Overlay (Conditionally rendered) */}
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

        {/* Remove the Message Edit Dialog rendering */}
        {/* {editingMessageId && (
            <MessageEditDialog
                messageId={editingMessageId}
                initialText={editingMessageText}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                isLoading={isSavingEdit}
            />
        )} */}

        {/* Optional: Global Action Error Display */}
        {/* Consider displaying actionError here if it's not specific to an overlay */}
        {/* {actionError && !isSettingsOpen && !editingMessageId && (
            <div className="action-error-message">{actionError}</div> // Add styling for this
        )} */}


   </div>
 );
};

export default ChatPage;

// >>> Helper Functions (Defined ONCE outside the component) <<<
// (No changes needed here)
/*
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
*/