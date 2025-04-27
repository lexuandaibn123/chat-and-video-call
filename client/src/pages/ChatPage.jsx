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

import '../components/Chat/Chat.scss';

// Giả định useAuth hook: user object có _id
// import { useAuth } from '../context/AuthContext';


const ChatPage = () => {
  // --- State ---
  const [conversations, setConversations] = useState([]);
  // activeChat: thông tin chi tiết conversation, members đã populated
  // activeChat.detailedMembers: mảng members với user ID đã trim (.id)
  const [activeChat, setActiveChat] = useState(null);
  // messages: mảng messages với sender ID đã trim (.senderId)
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

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
                    // <<< TRIM USER ID NGAY KHI NHẬN TỪ INFO API >>>
                    const userId = userInfoResponse.userInfo.id ? String(userInfoResponse.userInfo.id).trim() : null;
                    const authenticatedUser = userId ? { _id: userId, ...userInfoResponse.userInfo } : null;

                    if (authenticatedUser) {
                         setMockAuth({ user: authenticatedUser, isAuthenticated: true, isLoading: false });
                         currentUserIdRef.current = authenticatedUser._id; // Cập nhật Ref với ID đã trim
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
    // User ID từ state (đã được trim từ EFFECT 1)
    const currentUserId = user?._id;

    if (!currentUserId) {
        console.warn("fetchInitialData: User ID is not set.");
        //setIsLoadingConversations(false); // Không set false ở đây nếu user không có ID
        // setError("User not authenticated. Cannot load conversations."); // Có thể set error ở đây
        return; // Dừng nếu user ID không có
    }

    console.log("Fetching initial rooms for user:", currentUserId);
    setIsLoadingConversations(true);
    setError(null);

    try {
      // API getMyRoomsApi (GET /conversation/get-conversations) trả về { success: true, data: [conversations] }
      // conversations trong data có members (populated user objects) và latestMessage (populated message object)
      const rooms = await getMyRoomsApi();

      if (rooms && Array.isArray(rooms)) {
         const conversationsData = rooms.map(room => {
           const roomId = room._id;
           const isGroup = room.isGroup;
           const latestMessage = room.latestMessage; // đã populated message object

           let conversationName = room.name;
           let conversationAvatar = room.avatar || null;
           let conversationType = isGroup ? 'group' : 'friend';

           // Xử lý members: đảm bảo member.id._id được trim
           const processedMembers = room.members?.map(m => ({
               ...m,
               // Ensure member.id._id is string and trimmed when processing for state
               // Handle cases where m.id might be null, object with no _id, or already a string
               id: (m.id && typeof m.id === 'object' && m.id._id) ? String(m.id._id).trim() : (typeof m.id === 'string' ? m.id.trim() : null)
           })) || [];


           const activeMembers = processedMembers?.filter(m => m.leftAt === null) || [];
           let conversationStatusText = isGroup ? `${activeMembers.length} members` : 'Offline';

           if (!isGroup && processedMembers && processedMembers.length === 2) {
               // So sánh ID đã trim
               const otherMember = processedMembers.find(member => member.id && member.id !== currentUserId); // Compare with trimmed ID
               if (otherMember && otherMember.id) { // otherMember.id is now the trimmed user ID string
                   // Use original populated data for name/avatar if available, otherwise fallback
                   const originalMemberData = room.members?.find(m => m.id?._id === otherMember.id); // Find in original array
                    conversationName = originalMemberData?.id?.fullName || originalMemberData?.id?.email || 'Unknown User';
                    conversationAvatar = originalMemberData?.id?.avatar || null;
               } else if (processedMembers.length === 1 && processedMembers[0].id === currentUserId) { // Compare with trimmed ID
                   // Self chat case
                   const originalMemberData = room.members?.find(m => m.id?._id === processedMembers[0].id);
                   conversationName = room.name || originalMemberData?.id?.fullName || 'Self Chat';
                   conversationAvatar = room.avatar || originalMemberData?.id?.avatar || null;
               } else {
                   conversationName = room.name || 'Unknown User';
                   conversationAvatar = room.avatar || null;
               }
           }

            // Lấy leader ID đã được trim
            const leaderMember = processedMembers?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
            const leaderId = leaderMember ? leaderMember.id : null; // Use trimmed id


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
             members: room.members || [], // Store original populated members
             leader: leaderId, // Store trimmed leaderId
             isGroup: isGroup,
             detailedMembers: processedMembers, // Store members with trimmed ID
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
      setConversations([]); // Clear conversations on error
    } finally {
      setIsLoadingConversations(false); // Tắt loading state
    }
  }, [user]); // Dependency: user state


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
     // User ID từ state (đã được trim từ EFFECT 1)
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
         // API getMessagesByRoomIdApi (POST /conversation/get-messages) trả về { success: true, data: [messages] }
         // message object có senderId là object user đầy đủ
         const messages = await getMessagesByRoomIdApi({ conversationId: activeChat.id, limit: 100, skip: 0 });

         if (messages && Array.isArray(messages)) {
            const formattedMessages = messages.map(msg => {
               let messageSenderId = null;
               // Check if senderId exists and try to get the ID, handling object and string types
               if (msg.senderId) {
                   if (typeof msg.senderId === 'object' && msg.senderId._id) {
                       // Populated senderId object
                       messageSenderId = String(msg.senderId._id).trim();
                   } else if (typeof msg.senderId === 'string') {
                       // Unpopulated senderId string (less common but possible depending on API consistency)
                       messageSenderId = String(msg.senderId).trim();
                   }
               }
               // If messageSenderId is still null/undefined, it remains null

               return ({
                   id: msg._id,
                   // KHÔNG TÍNH SENDER Ở ĐÂY
                   type: msg.type,
                   content: msg.content,
                   text: msg.type === 'text' && msg.content?.text?.data ? [msg.content.text.data] : [`[${msg.type.toUpperCase()}]`],
                   time: msg.datetime_created ? new Date(msg.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '',
                   createdAt: msg.datetime_created,
                   isEdited: msg.isEdited || false,
                   isDeleted: msg.isDeleted || false,
                   // <<< DÙNG messageSenderId ĐÃ XỬ LÝ VÀ TRIM >>>
                   senderId: messageSenderId,
                   // ------------------------------------------
                   senderName: msg.senderId?.fullName, // Use original populated data for name
                   senderAvatar: msg.senderId?.avatar, // Use original populated data for avatar
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

     // Dependencies: activeChat, user?._id, isMobileChatActive, isAuthLoading, isAuthenticated
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
               // detailedMembers đã được set với ID trim trong fetchInitialData
               detailedMembers: clickedConv.detailedMembers || [],
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
      // Kiểm tra activeChat.detailedMembers vì đây là mảng có ID đã trim
      if (activeChat?.isGroup && activeChat.detailedMembers) {
         setIsSettingsOpen(true);
         setActionError(null);
         setAddUserSearchResults([]);
      } else if (activeChat) {
           console.warn("Attempted to open settings for a non-group chat.");
      }
  }, [activeChat]); // Dependency: activeChat

  const handleCloseSettings = useCallback(() => {
      setIsSettingsOpen(false);
      setActionError(null);
      setAddUserSearchResults([]);
  }, []);


  // --- Callback xử lý gửi tin nhắn ---
  const handleSendMessage = useCallback(async (newMessageText) => {
    // User ID từ ref (đã được trim trong Auth Effect)
    const currentUserId = currentUserIdRef.current;

    if (!activeChat?.id || !currentUserId || sendingMessage || !newMessageText.trim()) {
        console.warn("Cannot send empty message or no active chat/user or message already sending.");
        return;
    }

    setSendingMessage(true);
    setActionError(null);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // --- Optimistic Update ---
    const newMessageOptimistic = {
      id: tempId,
      sender: 'self', // Vẫn dùng 'self' cho optimistic
      type: 'text',
      content: { text: { type: 'text', data: newMessageText } },
      text: [newMessageText],
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase(),
      createdAt: new Date().toISOString(),
      status: 'sending',
      isEdited: false,
      isDeleted: false,
      senderId: currentUserId, // <<< Lưu senderId đã trim vào tin nhắn optimistic
    };
    setMessages(prevMessages => [...prevMessages, newMessageOptimistic]); // Thêm vào cuối mảng (sau khi đã reverse)

    try {
      const messagePayload = {
          conversationId: activeChat.id,
          type: 'text',
          data: { type: 'text', data: newMessageText },
          replyToMessageId: null
      };
      const sentMessage = await sendMessageApi(messagePayload);
      console.log("Message sent successfully:", sentMessage);

      if (sentMessage && sentMessage._id) {
           setMessages(prevMessages => prevMessages.map(msg =>
             msg.id === tempId
               ? {
                   id: sentMessage._id,
                   type: sentMessage.type,
                   content: sentMessage.content,
                   text: sentMessage.type === 'text' && sentMessage.content?.text?.data ? [sentMessage.content.text.data] : [`[${sentMessage.type.toUpperCase()}]`],
                   time: sentMessage.datetime_created ? new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : newMessageOptimistic.time,
                   createdAt: sentMessage.datetime_created,
                   isEdited: sentMessage.isEdited || false,
                   isDeleted: sentMessage.isDeleted || false,
                   // <<< RE-CHECK AND TRIM senderId._id FROM API RESPONSE FOR OPTIMISTIC UPDATE >>>
                   senderId: sentMessage.senderId && typeof sentMessage.senderId === 'object' && sentMessage.senderId._id
                               ? String(sentMessage.senderId._id).trim()
                               : (typeof sentMessage.senderId === 'string' ? String(sentMessage.senderId).trim() : null),
                   // --------------------------------------------------------------------------
                   senderName: sentMessage.senderId?.fullName,
                   senderAvatar: sentMessage.senderId?.avatar,
                   status: 'sent',
                 }
               : msg
           ));

           setConversations(prevConversations => {
               const updatedConversations = prevConversations.map(conv =>
                   conv.id === activeChat.id
                       ? {
                           ...conv,
                           lastMessage: sentMessage.type === 'text' ? sentMessage.content?.text?.data || '' : `[${sentMessage.type.toUpperCase()}]`,
                           time: sentMessage.datetime_created ? new Date(sentMessage.datetime_created).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : conv.time,
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
           console.error("Failed to send message: API error response or missing data", sentMessage);
           setMessages(prevMessages => prevMessages.map(msg =>
             msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg
           ));
           setActionError(sentMessage?.message || sentMessage?.error || "Failed to send message.");
      }

    } catch (err) {
      console.error("Failed to send message:", err);
      setActionError(err.message || 'Failed to send message.');
      setMessages(prevMessages => prevMessages.map(msg =>
        msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg
      ));
    } finally {
      setSendingMessage(false);
    }
  }, [activeChat, sendingMessage, currentUserIdRef]);


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
                   // <<< TRIM member.id._id KHI XỬ LÝ MEMBERS TRONG performApiAction >>>
                   // Note: Here we process members for the detailedMembers state
                   // which is used by ChatSettingsOverlay for display and comparison.
                   // The original 'members' array in conversations state can still hold
                   // the original populated objects if needed elsewhere, but detailedMembers
                   // is the source of truth for SettingsOverlay comparisons.
                   let membersWithDetails = updatedConvData.members?.map(m => ({
                       ...m,
                       // Ensure member.id is string and trimmed when processing for state
                       id: (m.id && typeof m.id === 'object' && m.id._id) ? String(m.id._id).trim() : (typeof m.id === 'string' ? m.id.trim() : null)
                   })) || [];
                   // -----------------------------------------------------------------

                   // Lấy leader ID đã được trim
                    const leaderMember = membersWithDetails?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
                    const leaderId = leaderMember ? leaderMember.id : null; // Use trimmed id


                   setConversations(prevConvs => prevConvs.map(conv =>
                       conv.id === updatedConvData._id ? {
                           ...conv,
                           ...updatedConvData,
                           id: updatedConvData._id,
                           type: updatedConvData.isGroup ? 'group' : 'friend',
                           statusText: updatedConvData.isGroup ? `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members` : conv.statusText,
                           leader: leaderId, // Use trimmed leaderId
                           members: updatedConvData.members || [], // Store original populated members
                           detailedMembers: membersWithDetails, // Store processed members with trimmed ID
                       } : conv
                   ));

                   setActiveChat(prevActive => {
                       if (!prevActive || prevActive.id !== updatedConvData._id) return prevActive;
                        // Lấy leader ID đã được trim từ membersWithDetails (processedMembers)
                        const leaderMemberActive = membersWithDetails?.find(m => m.role === 'leader' && m.leftAt === null && m.id);
                        const leaderIdActive = leaderMemberActive ? leaderMemberActive.id : null;

                       return ({
                            ...prevActive,
                            ...updatedConvData,
                            id: updatedConvData._id,
                            type: updatedConvData.isGroup ? 'group' : 'friend',
                            statusText: updatedConvData.isGroup ? `${membersWithDetails?.filter(m => m.leftAt === null)?.length || 0} members` : prevActive.statusText,
                            leader: leaderIdActive, // Use trimmed leaderId
                            detailedMembers: membersWithDetails, // Use processed members with trimmed ID
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
       } catch (err) {
           console.error(`${successMessage} API call failed:`, err);
            if (err.message.includes("HTTP error! status: 401")) {
                 setActionError("Session expired. Please login again.");
            } else {
                 setActionError(err.message || "An API error occurred.");
            }
       } finally {
           setIsPerformingAction(false);
       }
       // Dependencies: activeChat, conversations state (using functional updates, identity of conversation objects matters), currentUserIdRef (for leader check)
       // We remove 'user' dependency as currentUserIdRef is used for leader check in handlers below.
       // The detailedMembers derived within performApiAction uses the *latest* response members anyway.
  }, [activeChat, conversations, currentUserIdRef]);


  // --- Handlers cho các Hành động Group Settings ---
  const handleRemoveUser = useCallback(async (conversationId, userIdToRemove) => {
       // currentUserIdRef.current already trimmed
       const currentUserId = currentUserIdRef.current;
       if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;
       // Lấy member ID từ detailedMembers (đã trim ID)
       const membersList = activeChat.detailedMembers; // Use detailedMembers
       // userIdToRemove should ideally be the trimmed ID string from the UI/search results
       const memberToRemove = membersList?.find(m => m.id === userIdToRemove && m.leftAt === null); // Compare trimmed IDs
       if (!memberToRemove) {
            setActionError("User not found in group or already left.");
            return;
       }
       if (window.confirm(`Are you sure you want to remove ${memberToRemove.id?.fullName || memberToRemove.id || userIdToRemove} from the group?`)) {
            // Pass the trimmed userIdToRemove to API if API expects trimmed, or original if API handles it
            await performApiAction(
               () => removeMemberApi({ conversationId, memberId: userIdToRemove }),
               "Remove member"
            );
       }
   }, [activeChat, performApiAction, currentUserIdRef]); // Keep currentUserIdRef dependency

   const handleChangeLeader = useCallback(async (conversationId, newLeaderId) => {
        // currentUserIdRef.current already trimmed
        const currentUserId = currentUserIdRef.current;
        if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;
        // Lấy member ID từ detailedMembers (đã trim ID)
        const membersList = activeChat.detailedMembers; // Use detailedMembers
        // newLeaderId should ideally be the trimmed ID string from the UI/selection
        const newLeaderMember = membersList?.find(m => m.id === newLeaderId && m.leftAt === null); // Compare trimmed IDs
         if (!newLeaderMember) {
             setActionError("New leader must be a current member of the group.");
             return;
         }
        if (window.confirm(`Are you sure you want to make ${newLeaderMember.id?.fullName || newLeaderId} the new leader?`)) {
             // Pass the trimmed newLeaderId to API if API expects trimmed, or original if API handles it
             await performApiAction(
                () => updateMemberRoleApi({ conversationId, memberId: newLeaderId }),
                "Change leader"
             );
        }
   }, [activeChat, performApiAction, currentUserIdRef]); // Keep currentUserIdRef dependency

    const handleStepDownLeader = useCallback(async (conversationId, leaderId) => {
         // currentUserIdRef.current already trimmed
         const currentUserId = currentUserIdRef.current;
         // Compare activeChat.leader (trimmed in performApiAction) with currentUserId (trimmed)
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || activeChat.leader !== currentUserId || leaderId !== currentUserId || !currentUserId) return;
         const membersList = activeChat.detailedMembers; // Use detailedMembers (with trimmed IDs)
         const numberOfLeaders = membersList.filter(m => m.role === 'leader' && m.leftAt === null).length;
         if (window.confirm("Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left.")) {
              // Pass leaderId (which is currentUserId, already trimmed)
              await performApiAction(
                   () => updateMemberRoleApi({ conversationId, memberId: leaderId, newRole: 'member' }),
                   "Step down as leader"
               );
         }
    }, [activeChat, currentUserIdRef, performApiAction]); // Keep currentUserIdRef dependency


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
           // API searchUsersApi trả về user objects { _id: string, ... }
           const results = await searchUsersApi(searchTerm.trim());
           if (results && Array.isArray(results)) {
               // Lấy existing member IDs từ detailedMembers (đã trim ID)
               const existingMemberUserIds = new Set(activeChat?.detailedMembers?.map(m => m.id).filter(Boolean) || []);
               // So sánh với user._id từ search result (trim user._id before comparison)
               // Store user objects with original _id string from API in searchResults state
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
   }, [activeChat, performApiAction]); // No currentUserIdRef needed here

   const handleAddUserConfirm = useCallback(async (conversationId, userIdToAdd) => {
       // currentUserIdRef.current already trimmed
       const currentUserId = currentUserIdRef.current;
       // userIdToAdd is the original _id string from searchResults
       if (!activeChat || activeChat.id !== conversationId || !userIdToAdd || !currentUserId) {
           setActionError("Invalid request to add user.");
           return;
       }
        // Check if user exists in search results (using original _id)
        const userToAdd = addUserSearchResults.find(user => user._id === userIdToAdd);
        if (!userToAdd) {
             setActionError("User not found in search results.");
             return;
        }
        // Pass the original userIdToAdd string to API (API handles trimming?)
        // If API expects trimmed, trim here: String(userIdToAdd).trim()
        await performApiAction(
            () => addNewMemberApi({ conversationId, newMemberId: userIdToAdd, role: 'member' }),
            "Add member",
            (response) => {
                setAddUserSearchResults([]);
            }
        );
   }, [activeChat, performApiAction, addUserSearchResults, currentUserIdRef]); // Keep currentUserIdRef dependency


    const handleLeaveGroup = useCallback(async (conversationId) => {
        // currentUserIdRef.current already trimmed
        const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;

         // Kiểm tra active member bằng detailedMembers (có ID đã trim)
         const isCurrentUserActiveMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
         // So sánh activeChat.leader (đã trim) với currentUserId (đã trim)
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
    }, [activeChat, performApiAction, currentUserIdRef]); // Keep currentUserIdRef dependency

    const handleDeleteGroup = useCallback(async (conversationId) => {
         // currentUserIdRef.current already trimmed
         const currentUserId = currentUserIdRef.current;
         // So sánh activeChat.leader (đã trim) với currentUserId (đã trim)
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
    }, [activeChat, currentUserIdRef, performApiAction]); // Keep currentUserIdRef dependency

     const handleDeleteConversationMember = useCallback(async (conversationId) => {
         // currentUserIdRef.current already trimmed
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
    }, [activeChat, performApiAction, currentUserIdRef]); // Keep currentUserIdRef dependency

    const handleUpdateGroupName = useCallback(async (conversationId, newName) => {
         // currentUserIdRef.current already trimmed
         const currentUserId = currentUserIdRef.current;
          if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !newName.trim() || !currentUserId) {
              console.warn("Invalid request to update group name.");
              if (!newName.trim()) setActionError("Group name cannot be empty.");
              return;
          }
           // Kiểm tra active member bằng detailedMembers (có ID đã trim)
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
    }, [activeChat, currentUserIdRef, performApiAction]); // Keep currentUserIdRef dependency


    const handleDeleteMessage = useCallback(async (messageId) => {
         // currentUserIdRef.current already trimmed
         const currentUserId = currentUserIdRef.current;
         if (!messageId || !activeChat?.id || !currentUserId) return;
         // messageToDelete.senderId (đã trim trong state messages)
         const messageToDelete = messages.find(msg => msg.id === messageId);
          // So sánh messageToDelete.senderId (đã trim trong state) với currentUserId (đã trim)
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
    }, [activeChat, performApiAction, messages, currentUserIdRef]); // Keep currentUserIdRef dependency

     const handleEditMessage = useCallback(async (messageId, newText) => {
        // currentUserIdRef.current already trimmed
        const currentUserId = currentUserIdRef.current;
         if (!messageId || !newText.trim() || !activeChat?.id || !currentUserId) return;
         // messageToEdit.senderId (đã trim trong state messages)
         const messageToEdit = messages.find(msg => msg.id === messageId);
          // So sánh messageToEdit.senderId (đã trim trong state) với currentUserId (đã trim)
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
     }, [activeChat, performApiAction, messages, currentUserIdRef]); // Keep currentUserIdRef dependency


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
                   messages={messages}
                   onMobileBack={handleMobileBack}
                   isMobile={isMobileChatActive}
                   onSendMessage={handleSendMessage}
                   isLoadingMessages={isLoadingMessages}
                   onOpenSettings={activeChat?.isGroup ? handleOpenSettings : null}
                   onDeleteMessage={handleDeleteMessage}
                   onEditMessage={handleEditMessage}
                   currentUserId={currentUserIdRef.current} // <<< Truyền currentUserId (đã trim)
                   sendingMessage={sendingMessage}
               />
                 {isSettingsOpen && activeChat?.isGroup && activeChat.detailedMembers && ( // Check detailedMembers (contains trimmed IDs)
                    <ChatSettingsOverlay
                         group={activeChat} // group object now contains detailedMembers with trimmed IDs and trimmed leader
                         currentUserId={currentUserIdRef.current} // <<< Truyền currentUserId (đã trim)
                         onClose={handleCloseSettings}
                         onRemoveUser={handleRemoveUser}
                         onChangeLeader={handleChangeLeader}
                         onStepDownLeader={handleStepDownLeader}
                         onAddUserSearch={handleAddUserSearch}
                         onAddUserConfirm={handleAddUserConfirm}
                         isPerformingAction={isPerformingAction}
                         actionError={actionError}
                         searchResults={addUserSearchResults} // searchResults still contain original _id strings
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
           messages={messages} // messages state contains messages with trimmed senderId
           onMobileBack={handleMobileBack}
           isMobile={isMobileChatActive}
           onSendMessage={handleSendMessage}
           isLoadingMessages={isLoadingMessages}
           onOpenSettings={activeChat?.isGroup ? handleOpenSettings : null}
           onDeleteMessage={handleDeleteMessage}
           onEditMessage={handleEditMessage}
           currentUserId={currentUserIdRef.current} // <<< Truyền currentUserId (đã trim)
           sendingMessage={sendingMessage}
      />

       {isSettingsOpen && activeChat?.isGroup && activeChat.detailedMembers && ( // Check detailedMembers (contains trimmed IDs)
           <ChatSettingsOverlay
               group={activeChat} // group object now contains detailedMembers with trimmed IDs and trimmed leader
               currentUserId={currentUserIdRef.current} // <<< Truyền currentUserId (đã trim)
               onClose={handleCloseSettings}
               onRemoveUser={handleRemoveUser}
               onChangeLeader={handleChangeLeader}
               onStepDownLeader={handleStepDownLeader}
               onAddUserSearch={handleAddUserSearch}
               onAddUserConfirm={handleAddUserConfirm}
               isPerformingAction={isPerformingAction}
               actionError={actionError}
               searchResults={addUserSearchResults} // searchResults still contain original _id strings
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
// Keep helpers if still needed, but they are less relevant for the core issue now.

// Note: This helper is unlikely needed anymore if member details are always populated.
// If used, ensure any ID comparisons or storage also involve trimming.
const fetchUserDetailsFromId = async (userId) => {
    try {
         // Assuming userId passed to this helper is already trimmed
         const userDetails = await getUserDetailsApi(userId); // API might receive original or trimmed ID
         if (userDetails && userDetails._id) {
             // <<< TRIM _id from API response before returning >>>
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