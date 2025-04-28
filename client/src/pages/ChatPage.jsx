// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ConversationListPanel from '../components/Chat/ConversationListPanel';
import ChatWindow from '../components/Chat/ChatWindow';
import ChatSettingsOverlay from '../components/Chat/ChatSettingsOverlay';

import {
    createConversationApi,
    getMyRoomsApi,
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

import { searchUsersApi, getUserByEmailApi, getUserDetailsApi } from '../api/users';
import { infoApi } from '../api/auth';

import { mockUploadFileApi } from '../api/upload';

import {
    processRawRooms,
    processRawMessages,
    createOptimisticTextMessage,
    buildTextMessagePayload,
    createOptimisticFileMessage,
    buildFileMessagePayload,
    updateConversationsListLatestMessage,
    formatReceivedMessage,
    updateConversationsAfterMemberRemoved,
    updateActiveChatAfterMemberRemoved,
    updateConversationsAfterGroupNameChanged,
    updateActiveChatAfterGroupNameChanged,
    updateConversationsAfterLeaderChanged,
    updateActiveChatAfterLeaderChanged,
    filterAddUserSearchResults,
    updateConversationsAfterMemberAdded,
    updateActiveChatAfterMemberAdded,
    filterConversationFromList,
    updateMessagesOptimisticDelete,
    revertMessagesOptimisticDelete,
    updateMessagesOptimisticEdit,
    revertMessagesOptimisticEdit,
    updateMessagesEditSuccess,
    updateConversationsListAfterMessageAction,
} from '../services/chatService';

import '../components/Chat/Chat.scss';


const ChatPage = () => {
  // --- State ---
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [error, setError] = useState(null);

  const [isMobileChatActive, setIsMobileChatActive] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [addUserSearchResults, setAddUserSearchResults] = useState([]);

  const currentUserIdRef = useRef(null);

  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState('');

  // --- MOCK useAuth HOOK (or your real Auth Hook) ---
  const [mockAuth, setMockAuth] = useState({ user: null, isAuthenticated: false, isLoading: true });
  const { user, isAuthenticated, isLoading: isAuthLoading } = mockAuth;


   // Effect 1: Check Auth Status
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
   }, []);


// Callback to fetch initial conversations
const fetchInitialData = useCallback(async () => {
    const currentUserId = user?._id;

    if (!currentUserId) {
        console.warn("fetchInitialData: User ID is not set.");
        setIsLoadingConversations(false);
        setConversations([]);
        return;
    }

    console.log("Fetching initial rooms for user:", currentUserId);
    setIsLoadingConversations(true);
    setError(null);

    try {
      const rooms = await getMyRoomsApi();
      const conversationsData = processRawRooms(rooms, currentUserId);
      setConversations(conversationsData);
      console.log("Processed conversations:", conversationsData);

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


// EFFECT 2: Trigger fetchInitialData
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
           setMessageInput('');
           setEditingMessageId(null);
           setSendingMessage(false);
      }
  }, [isAuthLoading, isAuthenticated, user?._id, fetchInitialData]);


// EFFECT 3: Handle mobile nav toggle
   useEffect(() => {
       const toggleMobileNavVisibility = (hide) => { window.dispatchEvent(new CustomEvent('toggleMobileNav', { detail: { hideNav: hide } })); };
       toggleMobileNavVisibility(true);
       return () => toggleMobileNavVisibility(false);
   }, []);


// Load messages when activeChat changes
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
          setMessageInput('');
          setEditingMessageId(null);
          setSendingMessage(false);
         return;
       }

       console.log("Fetching messages for room:", activeChat.id, "for user:", userId);
       setIsLoadingMessages(true);
       setActionError(null);
        setMessageInput('');
        setEditingMessageId(null);
        setSendingMessage(false);


       const isMobileView = window.innerWidth <= 768;
       if(isMobileView) setIsMobileChatActive(true);

       try {
         const messages = await getMessagesByRoomIdApi({ conversationId: activeChat.id, limit: 100, skip: 0 });
         const formattedMessages = processRawMessages(messages, currentUserId);
         setMessages(formattedMessages);
         console.log("Formatted messages (oldest first):", formattedMessages);

       } catch (err) {
         console.error(`Error fetching messages for ${activeChat.id}:`, err);
          if (err.message.includes("HTTP error! status: 401")) {
               setError("Session expired. Please login again.");
          } else {
              setError(err.message || `Failed to load messages.`);
          }
         setMessages([]);
         setMessageInput('');
         setEditingMessageId(null);
         setSendingMessage(false);
       } finally {
         setIsLoadingMessages(false);
       }
     }
     if (activeChat && currentUserId) {
         fetchMessages(currentUserId);
     } else if (activeChat === null) {
        setMessages([]);
        setIsLoadingMessages(false);
        setIsMobileChatActive(false);
     }

   }, [activeChat, user?._id, setIsMobileChatActive, isAuthLoading, isAuthenticated]);


  // --- Handler for clicking a conversation ---
  const handleConversationClick = useCallback(async (type, id) => {
     if (!isAuthenticated || !user?._id) {
          console.warn("User not authenticated. Cannot select conversation.");
          setError("Please login to view conversations.");
          return;
     }
     setMessageInput('');
     setEditingMessageId(null);
     setSendingMessage(false);

     const clickedConv = conversations.find(c => c.id === id);
     if (clickedConv) {
          setActiveChat({
               ...clickedConv,
               id: clickedConv.id,
               detailedMembers: clickedConv.detailedMembers || [],
          });
         setIsSettingsOpen(false);
         setActionError(null);
         const isMobileView = window.innerWidth <= 768;
         if (isMobileView) {
             setIsMobileChatActive(true);
         }
     }
  }, [conversations, isAuthenticated, user]);


  // --- Handler for mobile back button ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null);
    setIsSettingsOpen(false);
    setIsMobileChatActive(false);
    setMessageInput('');
    setEditingMessageId(null);
    setSendingMessage(false);
    setActionError(null);
  }, []);


  // Handlers for Settings Overlay
  const handleOpenSettings = useCallback(() => {
      if (activeChat?.isGroup && activeChat.detailedMembers) {
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


    // --- Generic handler for settings API actions ---
    const performSettingsAction = useCallback(async (apiCall, successMessage, updateStateFunc = null) => {
        setIsPerformingAction(true);
        setActionError(null);
        try {
            const response = await apiCall();

            if (response && response.success === false) {
                 console.error(`${successMessage} failed: API indicated failure.`, response);
                 const errorMessage = response?.message || response?.error || "Action failed.";
                 setActionError(errorMessage);
            } else {
                console.log(`${successMessage} successful:`, response);
                setActionError(null);

                if(updateStateFunc) {
                    updateStateFunc(response);
                }
            }

        } catch (err) {
            console.error(`API call failed for ${successMessage}:`, err);
            setActionError(err.message || `An API error occurred during ${successMessage.toLowerCase()}.`);
        } finally {
            setIsPerformingAction(false);
        }
    }, [setIsPerformingAction, setActionError]);


  // --- Handlers for various actions using performSettingsAction ---
  const handleRemoveUser = useCallback(async (conversationId, userIdToRemove) => {
    const currentUserId = currentUserIdRef.current;
     if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId || !userIdToRemove) {
         console.warn("Invalid request to remove user.");
         setActionError("Cannot perform action on this chat.");
         return;
     }
    const membersList = activeChat.detailedMembers;
    const memberToRemove = membersList?.find(m => m.id === userIdToRemove && m.leftAt === null);
    if (!memberToRemove) {
         setActionError("User not found in group or already left.");
         return;
    }

    const isCurrentUserLeader = activeChat.leader === currentUserId;
    if (!isCurrentUserLeader) {
        setActionError("Only the leader can remove members.");
        return;
    }
    if (userIdToRemove === currentUserId) {
        setActionError("You cannot remove yourself. Use 'Leave Group'.");
        return;
    }
     if (memberToRemove.role === 'leader') {
          setActionError("Cannot remove another leader. Change their role first.");
          return;
     }

    if (window.confirm(`Are you sure you want to remove ${memberToRemove.fullName || userIdToRemove} from the group?`)) {
         await performSettingsAction(
            () => removeMemberApi({ conversationId, memberId: userIdToRemove }),
            "Remove member",
            (apiResponse) => {
                 setConversations(prevConvs => updateConversationsAfterMemberRemoved(prevConvs, conversationId, userIdToRemove, apiResponse));
                 setActiveChat(prevActive => updateActiveChatAfterMemberRemoved(prevActive, conversationId, userIdToRemove, apiResponse));
            }
         );
    } else {
        setActionError(null);
    }
}, [activeChat, performSettingsAction, currentUserIdRef, removeMemberApi]);


      const handleUpdateGroupName = useCallback(async (conversationId, newName) => {
        const currentUserId = currentUserIdRef.current;
        const trimmedName = newName.trim();
        if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !trimmedName || !currentUserId) {
            console.warn("Invalid request to update group name.");
            if (!trimmedName) setActionError("Group name cannot be empty.");
            return;
        }

         const isMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
         if (!isMember) {
             setActionError("You are not an active member of this group.");
             return;
         }

        await performSettingsAction(
            () => updateConversationNameApi({ conversationId, newName: trimmedName }),
            "Update group name",
            (apiResponse) => {
                 setConversations(prevConvs => updateConversationsAfterGroupNameChanged(prevConvs, conversationId, trimmedName));
                 setActiveChat(prevActive => updateActiveChatAfterGroupNameChanged(prevActive, conversationId, trimmedName));
                 setIsEditingName(false);
                 setEditingGroupName('');
            }
        );
    }, [activeChat, currentUserIdRef, performSettingsAction, updateConversationNameApi, setConversations, setActiveChat, setIsEditingName, setEditingGroupName, setActionError]);

    const handleChangeLeader = useCallback(async (conversationId, newLeaderId) => {
        const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId || !newLeaderId) {
             console.warn("Cannot change leader: Invalid state.");
             setActionError("Cannot perform action on this chat.");
             return;
         }
        const membersList = activeChat.detailedMembers;
        const newLeaderMember = membersList?.find(m => m.id === newLeaderId && m.leftAt === null);
         if (!newLeaderMember) {
             setActionError("New leader must be a current member of the group.");
             return;
         }

         const isCurrentUserLeader = activeChat.leader === currentUserId;
         if (!isCurrentUserLeader) {
             setActionError("Only the current leader can change leadership.");
             return;
         }


        if (window.confirm(`Are you sure you want to make ${newLeaderMember.fullName || newLeaderId} the new leader?`)) {
             await performSettingsAction(
                () => updateMemberRoleApi({ conversationId, memberId: newLeaderId, newRole: 'leader' }),
                "Change leader",
                (apiResponse) => {
                     const oldLeaderId = activeChat.leader;
                     setConversations(prevConvs => updateConversationsAfterLeaderChanged(prevConvs, conversationId, newLeaderId, oldLeaderId));
                     setActiveChat(prevActive => updateActiveChatAfterLeaderChanged(prevActive, conversationId, newLeaderId, oldLeaderId));
                }
             );
        } else {
             setActionError(null);
        }
   }, [activeChat, performSettingsAction, currentUserIdRef, updateMemberRoleApi, setConversations, setActiveChat, setActionError]);

   const handleStepDownLeader = useCallback(async (conversationId, leaderId) => {
    const currentUserId = currentUserIdRef.current;
    if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || activeChat.leader !== currentUserId || leaderId !== currentUserId || !currentUserId) return;

    const membersList = activeChat.detailedMembers;
    const totalActiveLeaders = membersList.filter(m => m.role === 'leader' && m.leftAt === null).length;
    const totalActiveMembers = membersList.filter(m => m.leftAt === null).length || 0;

    if (totalActiveLeaders <= 1 && totalActiveMembers > 1) {
        setActionError("You cannot step down as the only leader. Please assign a new leader first.");
        return;
    }

    if (window.confirm("Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left.")) {
        await performSettingsAction(
            async () => {
                await updateMemberRoleApi({ conversationId, memberId: leaderId, newRole: 'member' });
                return {}; // ⚡ Không cần trả gì cả
            },
            "Step down as leader",
            () => {
                const oldLeaderId = currentUserId;
                let newLeaderId = null;
                
                // Nếu chỉ còn 1 người thì tự assign
                const remainingLeaders = membersList
                    .filter(m => m.leftAt === null && m.id !== leaderId)
                    .map(m => m.id);

                if (remainingLeaders.length > 0) {
                    newLeaderId = remainingLeaders[0]; // assign đại cho người còn lại
                }

                setConversations(prevConvs => updateConversationsAfterLeaderChanged(prevConvs, conversationId, newLeaderId, oldLeaderId));
                setActiveChat(prevActive => updateActiveChatAfterLeaderChanged(prevActive, conversationId, newLeaderId, oldLeaderId));
            }
        );
    } else {
        setActionError(null);
    }
}, [activeChat, currentUserIdRef, performSettingsAction, updateMemberRoleApi, setActionError, setConversations, setActiveChat]);



const handleAddUserSearch = useCallback(async (searchTerm) => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) {
        setAddUserSearchResults([]);
        setActionError(null);
        return;
    }

    setIsPerformingAction(true);
    setActionError(null);
    setAddUserSearchResults([]);

    try {
        let user = null;
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTerm); // Kiểm tra email
        const isIdFormat = /^[a-fA-F0-9]{24}$/.test(trimmedTerm); // Kiểm tra ObjectID (24 ký tự hex)

        if (!isEmailFormat && !isIdFormat) {
            throw new Error("Invalid search term: Must be a valid email or ObjectID.");
        }

        if (isEmailFormat) {
            user = await getUserByEmailApi(trimmedTerm);
        } else if (isIdFormat) {
            user = await getUserDetailsApi(trimmedTerm);
        }

        const userArray = user ? [user] : [];
        const filteredResults = filterAddUserSearchResults(userArray, activeChat?.detailedMembers);
        setAddUserSearchResults(filteredResults);

    } catch (err) {
        console.error("Search users API call failed:", err);
        setActionError(err.message || "An API error occurred during search.");
        setAddUserSearchResults([]);
    } finally {
        setIsPerformingAction(false);
    }
}, [activeChat?.detailedMembers, setIsPerformingAction, setActionError, setAddUserSearchResults, getUserByEmailApi, getUserDetailsApi]);


   const handleAddUserConfirm = useCallback(async (conversationId, userIdToAdd) => {
    const currentUserId = currentUserIdRef.current;
    if (!activeChat || activeChat.id !== conversationId || !userIdToAdd || !currentUserId) {
        setActionError("Invalid request to add user.");
        return;
    }
     const userToAdd = addUserSearchResults.find(user => String(user._id).trim() === userIdToAdd);
     if (!userToAdd) {
          setActionError("User not found in search results.");
          return;
     }

     const isCurrentUserLeader = activeChat.leader === currentUserId;
     if (!isCurrentUserLeader) {
         setActionError("Only the leader can add members.");
         return;
     }

     const isAlreadyMember = activeChat.detailedMembers?.some(m => m.id === userIdToAdd && m.leftAt === null);
      if (isAlreadyMember) {
           setActionError("User is already an active member of this group.");
           setAddUserSearchResults([]);
           return;
      }

     setAddUserSearchResults([]);
     setActionError(null);

     await performSettingsAction(
        () => addNewMemberApi({ conversationId, newMemberId: userIdToAdd, role: 'member' }),
        "Add member",
         (apiResponse) => {
             setConversations(prevConvs => updateConversationsAfterMemberAdded(prevConvs, conversationId, apiResponse, userToAdd));
             setActiveChat(prevActive => updateActiveChatAfterMemberAdded(prevActive, conversationId, apiResponse, userToAdd));
         }
    );
}, [activeChat, performSettingsAction, addUserSearchResults, currentUserIdRef, addNewMemberApi, setConversations, setActiveChat, setActionError, setAddUserSearchResults]);


    const handleLeaveGroup = useCallback(async (conversationId) => {
        const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;

         const isCurrentUserActiveMember = activeChat.detailedMembers?.some(m => m.id === currentUserId && m.leftAt === null);
         const totalActiveLeaders = activeChat.detailedMembers?.filter(m => m.role === 'leader' && m.leftAt === null).length || 0;
         const totalActiveMembers = activeChat.detailedMembers?.filter(m => m.leftAt === null).length || 0;
         const isCurrentUserLeaderAndOnlyLeader = activeChat.leader === currentUserId && totalActiveLeaders <= 1;

         if (!isCurrentUserActiveMember) {
              setActionError("You are not an active member of this group.");
              return;
         }
         if (isCurrentUserLeaderAndOnlyLeader && totalActiveMembers > 1) {
             setActionError("You cannot leave this group as the only leader. Please assign a new leader first.");
             return;
         }

         if (window.confirm("Are you sure you want to leave this group?")) {
              await performSettingsAction(
                () => leaveConversationApi({ conversationId }),
                "Leave group",
                 (response) => {
                     setConversations(prevConvs => filterConversationFromList(prevConvs, conversationId));
                     setActiveChat(null);
                     setIsSettingsOpen(false);
                     setIsMobileChatActive(false);
                     setMessageInput('');
                     setEditingMessageId(null);
                     setSendingMessage(false);
                 }
              );
         } else {
             setActionError(null);
         }
    }, [activeChat, performSettingsAction, currentUserIdRef, leaveConversationApi, setConversations, setActiveChat, setIsSettingsOpen, setIsMobileChatActive, setMessageInput, setEditingMessageId, setSendingMessage, setActionError]);


    const handleDeleteGroup = useCallback(async (conversationId) => {
         const currentUserId = currentUserIdRef.current;
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
                      setConversations(prevConvs => filterConversationFromList(prevConvs, conversationId));
                      setActiveChat(null);
                      setIsSettingsOpen(false);
                      setIsMobileChatActive(false);
                      setMessageInput('');
                      setEditingMessageId(null);
                      setSendingMessage(false);
                  }
               );
          } else {
              setActionError(null);
          }
    }, [activeChat, currentUserIdRef, performSettingsAction, deleteGroupApi, setConversations, setActiveChat, setIsSettingsOpen, setIsMobileChatActive, setMessageInput, setEditingMessageId, setSendingMessage, setActionError]);


     const handleDeleteConversationMember = useCallback(async (conversationId) => {
         const currentUserId = currentUserIdRef.current;
         if (!activeChat || activeChat.id !== conversationId || activeChat.isGroup || !currentUserId) {
              console.warn("Delete conversation action only for 1-on-1 chats and authenticated users.");
              return;
         }
           if (window.confirm("Are you sure you want to delete this conversation? (This will only delete it for you)")) {
               await performSettingsAction(
                 () => deleteConversationMemberApi({ conversationId }),
                 "Delete conversation",
                  (response) => {
                      setConversations(prevConvs => filterConversationFromList(prevConvs, conversationId));
                      setActiveChat(null);
                      setIsSettingsOpen(false);
                      setIsMobileChatActive(false);
                      setMessageInput('');
                      setEditingMessageId(null);
                      setSendingMessage(false);
                  }
               );
          } else {
              setActionError(null);
          }
    }, [activeChat, performSettingsAction, currentUserIdRef, deleteConversationMemberApi, setConversations, setActiveChat, setIsSettingsOpen, setIsMobileChatActive, setMessageInput, setEditingMessageId, setSendingMessage, setActionError]);


    const handleStartEditGroupName = useCallback(() => {
         if (activeChat?.isGroup && activeChat.name) {
             setEditingGroupName(activeChat.name);
             setIsEditingName(true);
             setActionError(null);
         } else {
             console.warn("Attempted to start editing name for a non-group chat or chat without a name.");
         }
    }, [activeChat]);

     const handleCancelEditGroupName = useCallback(() => {
         setIsEditingName(false);
         setEditingGroupName('');
         setActionError(null);
     }, []);

        const handleSaveEditGroupName = useCallback(async () => {
         const currentUserId = currentUserIdRef.current;
         const conversationId = activeChat?.id;
         const newName = editingGroupName.trim();

          if (!conversationId || !activeChat?.isGroup || !newName || !currentUserId) {
              if (!newName) setActionError("Group name cannot be empty.");
              console.warn("Invalid request to update group name: missing info or empty name.");
              return;
          }

           if (newName === activeChat.name) {
                console.log("Group name is the same, cancelling save.");
                setIsEditingName(false);
                setEditingGroupName('');
                setActionError(null);
                return;
           }

           setActionError(null);
           setIsPerformingAction(true);

         await performSettingsAction(
             () => updateConversationNameApi({ conversationId, newName }),
             "Update group name",
             (apiResponse) => {
                 setConversations(prevConvs => updateConversationsAfterGroupNameChanged(prevConvs, conversationId, newName));
                 setActiveChat(prevActive => updateActiveChatAfterGroupNameChanged(prevActive, conversationId, newName));
                 setIsEditingName(false);
                 setEditingGroupName('');
             }
         );
    }, [activeChat, currentUserIdRef, editingGroupName, performSettingsAction, setConversations, setActiveChat, setIsEditingName, setEditingGroupName, setActionError, updateConversationNameApi]);


    const handleSendTextMessage = useCallback(async () => {
        const currentUserId = currentUserIdRef.current;
        const newMessageText = messageInput.trim();

        if (!activeChat?.id || !currentUserId || sendingMessage || editingMessageId !== null || !newMessageText) {
            console.warn("Cannot send text message: Invalid state (no chat, no user, sending, editing, or empty).");
            return;
        }

        setSendingMessage(true);
        setActionError(null);
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        const newMessageOptimistic = createOptimisticTextMessage(tempId, newMessageText, currentUserId, user);
        setMessages(prevMessages => [...prevMessages, newMessageOptimistic]);
        setMessageInput('');

        try {
            const messagePayload = buildTextMessagePayload(activeChat.id, newMessageText, null);

            console.log("Text message send payload:", messagePayload);

            const sentMessage = await sendMessageApi(messagePayload);
            console.log("Text message sent successfully:", sentMessage);

            if (sentMessage && sentMessage._id) {
                const formattedSentMessage = formatReceivedMessage(sentMessage, currentUserId);

                setMessages(prevMessages => prevMessages.map(msg => {
                    if (msg.id === tempId) {
                        return { ...formattedSentMessage, sender: 'self' };
                    }
                    return msg;
                }));

                setConversations(prevConversations =>
                    updateConversationsListLatestMessage(prevConversations, activeChat.id, sentMessage)
                );

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
            setSendingMessage(false);
        }
    }, [activeChat, sendingMessage, editingMessageId, messageInput, currentUserIdRef, user, conversations, sendMessageApi, setMessages, setActionError, setConversations, setMessageInput]);


    // --- Handle File Sending ---
    const handleSendFile = useCallback(async (file) => {
        const currentUserId = currentUserIdRef.current;

        if (!activeChat?.id || !currentUserId || sendingMessage || editingMessageId !== null || !file) {
            console.warn("Cannot send file: Invalid state (no chat, no user, sending/editing in progress, or no file selected).");
            return;
        }

        setSendingMessage(true);
        setActionError(null);
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';

        let localPreviewUrl = null;
        if (fileType === 'image') {
            try {
                localPreviewUrl = URL.createObjectURL(file);
            } catch (e) {
                console.error("Error creating object URL for image preview:", e);
            }
        }

        const newFileMessageOptimistic = createOptimisticFileMessage(tempId, file, currentUserId, user, localPreviewUrl);
        setMessages(prevMessages => [...prevMessages, newFileMessageOptimistic]);

        let uploadedFileDetails = null;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const uploadResponse = await mockUploadFileApi(formData);

            console.log("File upload response:", uploadResponse);

            if (!uploadResponse || !uploadResponse.success || !uploadResponse.data) {
                throw new Error(uploadResponse?.message || uploadResponse?.error || 'File upload failed.');
            }
            uploadedFileDetails = uploadResponse.data;

            const messagePayload = buildFileMessagePayload(activeChat.id, fileType, uploadedFileDetails, null);
            console.log("File message send payload:", messagePayload);

            const sentMessage = await sendMessageApi(messagePayload);
            console.log("File message sent successfully:", sentMessage);

            if (sentMessage && sentMessage._id) {
                const formattedSentMessage = formatReceivedMessage(sentMessage, currentUserId);

                setMessages(prevMessages => prevMessages.map(msg => {
                    if (msg.id === tempId) {
                        return { ...formattedSentMessage, sender: 'self' };
                    }
                    return msg;
                }));

                setConversations(prevConversations => {
                    return updateConversationsListLatestMessage(prevConversations, activeChat.id, sentMessage);
                });

                if (localPreviewUrl) {
                    URL.revokeObjectURL(localPreviewUrl);
                }

            } else {
                console.error("Failed to send file message: API error response or missing data", sentMessage);
                setMessages(prevMessages => prevMessages.map(msg =>
                    msg.id === tempId ? { ...msg, status: 'failed' } : msg
                ));
                setActionError(sentMessage?.message || sentMessage?.error || "Failed to send file message.");
                if (localPreviewUrl) {
                    URL.revokeObjectURL(localPreviewUrl);
                }
            }

        } catch (err) {
            console.error("Failed to upload or send file:", err);
            setMessages(prevMessages => prevMessages.map(msg =>
                msg.id === tempId ? { ...newFileMessageOptimistic, status: 'failed' } : msg
            ));
            setActionError(err.message || 'Failed to send file.');
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
        } finally {
            setSendingMessage(false);
        }
    }, [activeChat, sendingMessage, editingMessageId, currentUserIdRef, conversations, user, mockUploadFileApi, sendMessageApi, setMessages, setActionError, setConversations]);

    // --- Handle Delete Message ---
        const handleDeleteMessage = useCallback(async (messageId) => {
            const currentUserId = currentUserIdRef.current;

            if (!messageId || !activeChat?.id || !currentUserId) {
                 console.warn("Cannot delete message: Invalid parameters or no active chat/user.");
                 setActionError("Cannot perform action without active chat or user.");
                 return;
            }

            const messageToDelete = messages.find(msg => msg.id === messageId);

            if (!messageToDelete) {
                console.warn(`Cannot delete message ${messageId}: Message not found in state.`);
                setActionError("Message not found in current view.");
                return;
            }
            if (messageToDelete.senderId !== currentUserId) {
                console.warn(`Cannot delete message ${messageId}: Not the sender.`);
                setActionError("You can only delete your own messages.");
                return;
            }
             if (messageToDelete.status && ['uploading', 'sending', 'failed'].includes(messageToDelete.status)) {
                  console.warn(`Cannot delete message ${messageId}: Message status is '${messageToDelete.status}'.`);
                  setActionError("Cannot delete message while uploading or sending.");
                  return;
             }
             if (messageId === editingMessageId) {
                 console.warn(`Cannot delete message ${messageId}: Message is currently being edited.`);
                 setActionError("Cannot delete message while editing.");
                 return;
             }

            if (window.confirm("Are you sure you want to delete this message?")) {
                 const originalMessageStateCopy = messageToDelete ? { ...messageToDelete } : null;

                setMessages(prevMessages => updateMessagesOptimisticDelete(prevMessages, messageId));
                setActionError(null);

                try {
                    const response = await deleteMessageApi({ messageId });

                     if (response && response.success === false) {
                         console.error(`Failed to delete message ${messageId} on server:`, response?.message || response?.error || "API reported failure.");

                         let detailedErrorMessage = response?.message || response?.error || "Failed to delete message on server.";
                         setActionError(detailedErrorMessage);

                          if (originalMessageStateCopy) {
                              setMessages(prevMessages => revertMessagesOptimisticDelete(prevMessages, originalMessageStateCopy));
                          } else {
                               console.warn("Could not revert optimistic delete for message:", messageId, "Original state was not captured.");
                          }

                     } else {
                         console.log(`Message ${messageId} deleted successfully on server.`, response);

                         setConversations(prevConvs =>
                             updateConversationsListAfterMessageAction(prevConvs, activeChat.id, messages.filter(msg => msg.id !== messageId), messageId)
                         );
                     }

                } catch (err) {
                    console.error(`Error calling delete message API for ${messageId}:`, err);

                    const detailedErrorMessage = err.message || 'An API error occurred while deleting message.';
                    setActionError(detailedErrorMessage);

                     if (originalMessageStateCopy) {
                         setMessages(prevMessages => revertMessagesOptimisticDelete(prevMessages, originalMessageStateCopy));
                     } else {
                          console.warn("Could not revert optimistic delete for message:", messageId, "Original state was not captured on API error.");
                     }
                } finally {
                }
            } else {
                 setActionError(null);
            }
        },  [activeChat?.id, messages, currentUserIdRef, deleteMessageApi, editingMessageId, setMessages, setActionError, setConversations]);


    // --- Handle Edit Message (Initiate Edit) ---
    const handleInitiateEditMessage = useCallback(async (messageId, currentText) => {
        const currentUserId = currentUserIdRef.current;
         if (!messageId || !activeChat?.id || !currentUserId) { console.warn("Cannot initiate edit message: Invalid parameters or no active chat/user."); return; }

         const messageToEdit = messages.find(msg => msg.id === messageId);
          if (!messageToEdit) {
              console.warn(`Cannot initiate edit message ${messageId}: Message not found in state.`);
              setActionError("Message not found.");
              return;
          }
          if (messageToEdit.senderId !== currentUserId || messageToEdit.type !== 'text') {
              console.warn(`Cannot initiate edit message ${messageId}: Not the sender or not a text message.`);
              setActionError("You can only edit your own text messages.");
              return;
          }
           if (messageToEdit.status !== 'sent') {
               console.warn(`Cannot initiate edit message ${messageId}: Message status is '${messageToEdit.status}'.`);
               setActionError("Cannot edit messages that are not yet sent.");
               return;
           }
           if (sendingMessage || editingMessageId !== null) {
                console.warn(`Cannot initiate edit message ${messageId}: Another action is in progress.`);
                setActionError(editingMessageId !== null ? "Another message is currently being edited." : "Another action is in progress.");
                return;
           }

         setActionError(null);
         setEditingMessageId(messageId);
         setMessageInput(currentText);
         console.log(`Initiating edit for message ${messageId} with text: "${currentText}"`);

    }, [activeChat?.id, messages, currentUserIdRef, sendingMessage, editingMessageId, setActionError, setEditingMessageId, setMessageInput]);


    // --- Handle Save Edited Message ---
    const handleSaveEditedMessage = useCallback(async () => {
        const messageId = editingMessageId;
        const currentUserId = currentUserIdRef.current;
        const newText = messageInput;

        if (!messageId || !activeChat?.id || !currentUserId) {
            console.warn("Cannot save edit: Invalid state (no message ID, no chat, or no user).");
             setEditingMessageId(null);
             setMessageInput('');
             setActionError("Invalid request to save message.");
            return;
        }

        const messageToEdit = messages.find(msg => msg.id === messageId);

         if (!messageToEdit) {
             console.warn(`Cannot save edit for message ${messageId}: Message not found in state.`);
             setEditingMessageId(null);
             setMessageInput('');
             setActionError("Message to edit not found in current view.");
             return;
         }

        const originalText = messageToEdit?.content?.text?.data || '';
         const trimmedNewText = newText.trim();

        if (trimmedNewText === originalText.trim()) {
             console.log("No change in message text, cancelling save.");
             setActionError(null);
             setEditingMessageId(null);
             setMessageInput('');
             return;
        }

         if (sendingMessage) {
             console.warn("Cannot save edit: Already saving/sending another item.");
             setActionError("Save in progress. Please wait.");
             return;
         }

        if (!trimmedNewText) {
             console.warn("Cannot save empty message.");
             setActionError("Edited message cannot be empty.");
             return;
        }

         const originalMessageState = {
             id: messageId,
             content: messageToEdit.content,
             isEdited: messageToEdit.isEdited,
             time: messageToEdit.time,
             createdAt: messageToEdit.createdAt,
             status: messageToEdit.status,
         };

         setMessages(prevMessages => updateMessagesOptimisticEdit(prevMessages, messageId, trimmedNewText));
        setEditingMessageId(null);
        setMessageInput('');

         setSendingMessage(true);
         setActionError(null);

        try {
             const response = await editMessageApi({ messageId, newData: trimmedNewText });

             if (response && response._id === messageId) {
                 console.log(`Message ${messageId} edited successfully on server.`, response);

                 setMessages(prevMessages => updateMessagesEditSuccess(prevMessages, response));

                  setConversations(prevConvs =>
                      updateConversationsListAfterMessageAction(prevConvs, activeChat.id, messages, messageId)
                  );

             } else {
                 console.error(`Failed to edit message ${messageId} on server. API response did not match expected success format:`, response);

                 let detailedErrorMessage = "Failed to edit message on server (unexpected response).";
                  if (response && response.message) detailedErrorMessage = response.message;
                  else if (response && response.error) detailedErrorMessage = response.error;

                 setActionError(detailedErrorMessage);

                 if (originalMessageState) {
                     setMessages(prevMessages => revertMessagesOptimisticEdit(prevMessages, originalMessageState));
                 } else {
                     console.warn("Could not revert optimistic edit for message:", messageId, "Original state was not captured.");
                 }
             }

        } catch (err) {
             console.error(`Error calling edit message API for ${messageId}:`, err);

             const detailedErrorMessage = err.message || 'An API error occurred while editing message.';
             setActionError(detailedErrorMessage);

             if (originalMessageState) {
                  setMessages(prevMessages => revertMessagesOptimisticEdit(prevMessages, originalMessageState));
             } else {
                 console.warn("Could not revert optimistic edit for message:", messageId, "Original state was not captured on API error.");
             }
        } finally {
            setSendingMessage(false);
        }
    }, [activeChat?.id, editingMessageId, messageInput, messages, currentUserIdRef, sendingMessage, editMessageApi, setMessages, setActionError, setConversations, setEditingMessageId, setMessageInput]);


    // --- Handle Cancel Edit ---
    const handleCancelEdit = useCallback(() => {
        console.log(`Cancelling edit for message ${editingMessageId}.`);
        if (sendingMessage) {
            console.warn("Cannot cancel edit: Save in progress.");
            setActionError("Save in progress. Please wait.");
            return;
        }
        setEditingMessageId(null);
        setMessageInput('');
        setActionError(null);
   }, [editingMessageId, sendingMessage, setMessageInput, setEditingMessageId, setActionError]);


  // --- Handle Search ---
  const handleSearchChange = useCallback((event) => {
     const term = event.target.value.toLowerCase();
     setSearchTerm(term);
  }, []);

  const filteredConversations = conversations.filter(conv => {
       const nameMatch = conv?.name && typeof conv.name === 'string' && conv.name.toLowerCase().includes(searchTerm);
       return nameMatch;
  });

  const filteredGroups = filteredConversations.filter(c => c.isGroup);
  const filteredFriends = filteredConversations.filter(c => !c.isGroup);

  // --- Render ---

  const showInitialLoading = isAuthLoading || (isAuthenticated && user?._id && isLoadingConversations && !activeChat && !error);
  const showAuthError = !isAuthLoading && !isAuthenticated;
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

  if (showGeneralError) {
       console.error("Rendering with general error:", error);
      return (
          <div className="chat-page-container">
              <div className="error-message">Error: {error}</div>
          </div>
      );
  }

   return (
    <div className={`chat-page-container ${isMobileChatActive ? 'chat-active-mobile' : ''}`}>

      <ConversationListPanel
          groups={filteredGroups}
          friends={filteredFriends}
          onSearchChange={handleSearchChange}
          onItemClick={handleConversationClick}
          activeChat={activeChat}
          searchTerm={searchTerm}
      />

      <ChatWindow
           activeContact={activeChat}
           messages={messages}
           onMobileBack={handleMobileBack}
           isMobile={isMobileChatActive}
           messageInput={messageInput}
           setMessageInput={setMessageInput}
           onSendTextMessage={handleSendTextMessage}
           onSendFile={handleSendFile}
           onSaveEditedMessage={handleSaveEditedMessage}
           onCancelEdit={handleCancelEdit}
           isLoadingMessages={isLoadingMessages}
           onOpenSettings={activeChat?.isGroup ? handleOpenSettings : null}
           onDeleteMessage={handleDeleteMessage}
           onEditMessage={handleInitiateEditMessage}
           currentUserId={currentUserIdRef.current}
           sendingMessage={sendingMessage}
           editingMessageId={editingMessageId}
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
               isEditingName={isEditingName}
               editingGroupName={editingGroupName}
               onStartEditGroupName={handleStartEditGroupName}
               onCancelEditGroupName={handleCancelEditGroupName}
               onSaveEditGroupName={handleSaveEditGroupName}
           />
       )}
    </div>
  );
 };

 export default ChatPage;