import { useCallback } from 'react';
import {
  sendMessageApi,
  editMessageApi,
  deleteMessageApi,
  addNewMemberApi,
  removeMemberApi,
  updateMemberRoleApi,
  leaveConversationApi,
  deleteConversationMemberApi,
  deleteGroupApi,
  updateConversationNameApi,
} from '../api/conversations';
import { getUserByEmailApi, getUserDetailsApi } from '../api/users';
import { mockUploadFileApi } from '../api/upload';
import {
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
} from './chatService';

export const getHandlers = ({
  user,
  isAuthenticated,
  currentUserIdRef,
  activeChat,
  conversations,
  messages,
  messageInput,
  editingMessageId,
  sendingMessage,
  isPerformingAction,
  addUserSearchResults,
  isEditingName,
  editingGroupName,
  socket,
  setConversations,
  setActiveChat,
  setMessages,
  setMessageInput,
  setEditingMessageId,
  setSendingMessage,
  setActionError,
  setIsSettingsOpen,
  setIsMobileChatActive,
  setIsPerformingAction,
  setAddUserSearchResults,
  setIsEditingName,
  setEditingGroupName,
  setSearchTerm,
  optimisticMessagesRef,
}) => {
  // --- Generic handler for settings API actions ---
  const performSettingsAction = useCallback(
    async (apiCall, successMessage, updateStateFunc = null) => {
      setIsPerformingAction(true);
      setActionError(null);
      try {
        const response = await apiCall();

        if (response && response.success === false) {
          console.error(`${successMessage} failed: API indicated failure.`, response);
          const errorMessage = response?.message || response?.error || 'Action failed.';
          setActionError(errorMessage);
        } else {
          console.log(`${successMessage} successful:`, response);
          setActionError(null);

          if (updateStateFunc) {
            updateStateFunc(response);
          }
        }
      } catch (err) {
        console.error(`API call failed for ${successMessage}:`, err);
        setActionError(err.message || `An API error occurred during ${successMessage.toLowerCase()}.`);
      } finally {
        setIsPerformingAction(false);
      }
    },
    [setIsPerformingAction, setActionError]
  );

  // --- Handler for clicking a conversation ---
  const handleConversationClick = useCallback(
    async (type, id) => {
      console.log('handleConversationClick called:', { type, id, user, isAuthenticated: isAuthenticated, userId: user?._id });
      if (!isAuthenticated || !user?._id) {
        console.warn('User not authenticated. Cannot select conversation.', {
          user,
          isAuthenticated: isAuthenticated,
          userId: user?._id,
        });
        setActionError('Please login to view conversations.');
        return;
      }
      setMessageInput('');
      setEditingMessageId(null);
      setSendingMessage(false);

      const clickedConv = conversations.find((c) => c.id === id);
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
    },
    [conversations, user, setActiveChat, setIsSettingsOpen, setActionError, setIsMobileChatActive, setMessageInput, setEditingMessageId, setSendingMessage]
  );

  // --- Handler for mobile back button ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null);
    setIsSettingsOpen(false);
    setIsMobileChatActive(false);
    setMessageInput('');
    setEditingMessageId(null);
    setSendingMessage(false);
    setActionError(null);
  }, [setActiveChat, setIsSettingsOpen, setIsMobileChatActive, setMessageInput, setEditingMessageId, setSendingMessage, setActionError]);

  // --- Handlers for Settings Overlay ---
  const handleOpenSettings = useCallback(() => {
    if (activeChat?.isGroup && activeChat.detailedMembers) {
      setIsSettingsOpen(true);
      setActionError(null);
      setAddUserSearchResults([]);
    } else if (activeChat) {
      console.warn('Attempted to open settings for a non-group chat.');
    }
  }, [activeChat, setIsSettingsOpen, setActionError, setAddUserSearchResults]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
    setActionError(null);
    setAddUserSearchResults([]);
  }, [setIsSettingsOpen, setActionError, setAddUserSearchResults]);

  // --- Handler for removing a user ---
  const handleRemoveUser = useCallback(
    async (conversationId, userIdToRemove) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !currentUserId ||
        !userIdToRemove
      ) {
        console.warn('Invalid request to remove user.');
        setActionError('Cannot perform action on this chat.');
        return;
      }
      const membersList = activeChat.detailedMembers;
      const memberToRemove = membersList?.find((m) => m.id === userIdToRemove && m.leftAt === null);
      if (!memberToRemove) {
        setActionError('User not found in group or already left.');
        return;
      }

      const isCurrentUserLeader = activeChat.leader === currentUserId;
      if (!isCurrentUserLeader) {
        setActionError('Only the leader can remove members.');
        return;
      }
      if (userIdToRemove === currentUserId) {
        setActionError('You cannot remove yourself. Use "Leave Group".');
        return;
      }
      if (memberToRemove.role === 'leader') {
        setActionError('Cannot remove another leader. Change their role first.');
        return;
      }

      if (window.confirm(`Are you sure you want to remove ${memberToRemove.fullName || userIdToRemove} from the group?`)) {
        await performSettingsAction(
          () => removeMemberApi({ conversationId, memberId: userIdToRemove }),
          'Remove member',
          (apiResponse) => {
            setConversations((prevConvs) =>
              updateConversationsAfterMemberRemoved(prevConvs, conversationId, userIdToRemove, apiResponse)
            );
            setActiveChat((prevActive) =>
              updateActiveChatAfterMemberRemoved(prevActive, conversationId, userIdToRemove, apiResponse)
            );
          }
        );
      } else {
        setActionError(null);
      }
    },
    [activeChat, performSettingsAction, currentUserIdRef, setConversations, setActiveChat, setActionError]
  );

  // --- Handler for updating group name ---
  const handleUpdateGroupName = useCallback(
    async (conversationId, newName) => {
      const currentUserId = currentUserIdRef.current;
      const trimmedName = newName.trim();
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !trimmedName ||
        !currentUserId
      ) {
        console.warn('Invalid request to update group name.');
        if (!trimmedName) setActionError('Group name cannot be empty.');
        return;
      }

      const isMember = activeChat.detailedMembers?.some((m) => m.id === currentUserId && m.leftAt === null);
      if (!isMember) {
        setActionError('You are not an active member of this group.');
        return;
      }

      await performSettingsAction(
        () => updateConversationNameApi({ conversationId, newName: trimmedName }),
        'Update group name',
        (apiResponse) => {
          setConversations((prevConvs) =>
            updateConversationsAfterGroupNameChanged(prevConvs, conversationId, trimmedName)
          );
          setActiveChat((prevActive) =>
            updateActiveChatAfterGroupNameChanged(prevActive, conversationId, trimmedName)
          );
          setIsEditingName(false);
          setEditingGroupName('');
        }
      );
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      setConversations,
      setActiveChat,
      setIsEditingName,
      setEditingGroupName,
      setActionError,
    ]
  );

  // --- Handler for changing leader ---
  const handleChangeLeader = useCallback(
    async (conversationId, newLeaderId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !currentUserId ||
        !newLeaderId
      ) {
        console.warn('Cannot change leader: Invalid state.');
        setActionError('Cannot perform action on this chat.');
        return;
      }
      const membersList = activeChat.detailedMembers;
      const newLeaderMember = membersList?.find((m) => m.id === newLeaderId && m.leftAt === null);
      if (!newLeaderMember) {
        setActionError('New leader must be a current member of the group.');
        return;
      }

      const isCurrentUserLeader = activeChat.leader === currentUserId;
      if (!isCurrentUserLeader) {
        setActionError('Only the current leader can change leadership.');
        return;
      }

      if (window.confirm(`Are you sure you want to make ${newLeaderMember.fullName || newLeaderId} the new leader?`)) {
        await performSettingsAction(
          () => updateMemberRoleApi({ conversationId, memberId: newLeaderId, newRole: 'leader' }),
          'Change leader',
          (apiResponse) => {
            const oldLeaderId = activeChat.leader;
            setConversations((prevConvs) =>
              updateConversationsAfterLeaderChanged(prevConvs, conversationId, newLeaderId, oldLeaderId)
            );
            setActiveChat((prevActive) =>
              updateActiveChatAfterLeaderChanged(prevActive, conversationId, newLeaderId, oldLeaderId)
            );
          }
        );
      } else {
        setActionError(null);
      }
    },
    [activeChat, performSettingsAction, currentUserIdRef, setConversations, setActiveChat, setActionError]
  );

  // --- Handler for stepping down as leader ---
  const handleStepDownLeader = useCallback(
    async (conversationId, leaderId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        activeChat.leader !== currentUserId ||
        leaderId !== currentUserId ||
        !currentUserId
      )
        return;

      const membersList = activeChat.detailedMembers;
      const totalActiveLeaders = membersList.filter((m) => m.role === 'leader' && m.leftAt === null).length;
      const totalActiveMembers = membersList.filter((m) => m.leftAt === null).length || 0;

      if (totalActiveLeaders <= 1 && totalActiveMembers > 1) {
        setActionError('You cannot step down as the only leader. Please assign a new leader first.');
        return;
      }

      if (window.confirm('Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left.')) {
        await performSettingsAction(
          async () => {
            await updateMemberRoleApi({ conversationId, memberId: leaderId, newRole: 'member' });
            return {};
          },
          'Step down as leader',
          () => {
            const oldLeaderId = currentUserId;
            let newLeaderId = null;

            const remainingLeaders = membersList
              .filter((m) => m.leftAt === null && m.id !== leaderId)
              .map((m) => m.id);

            if (remainingLeaders.length > 0) {
              newLeaderId = remainingLeaders[0];
            }

            setConversations((prevConvs) =>
              updateConversationsAfterLeaderChanged(prevConvs, conversationId, newLeaderId, oldLeaderId)
            );
            setActiveChat((prevActive) =>
              updateActiveChatAfterLeaderChanged(prevActive, conversationId, newLeaderId, oldLeaderId)
            );
          }
        );
      } else {
        setActionError(null);
      }
    },
    [activeChat, currentUserIdRef, performSettingsAction, setConversations, setActiveChat, setActionError]
  );

  // --- Handler for searching users to add ---
  const handleAddUserSearch = useCallback(
    async (searchTerm) => {
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
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTerm);
        const isIdFormat = /^[a-fA-F0-9]{24}$/.test(trimmedTerm);

        if (!isEmailFormat && !isIdFormat) {
          throw new Error('Invalid search term: Must be a valid email or ObjectID.');
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
        console.error('Search users API call failed:', err);
        setActionError(err.message || 'An API error occurred during search.');
        setAddUserSearchResults([]);
      } finally {
        setIsPerformingAction(false);
      }
    },
    [activeChat?.detailedMembers, setIsPerformingAction, setActionError, setAddUserSearchResults]
  );

  // --- Handler for confirming adding a user ---
  const handleAddUserConfirm = useCallback(
    async (conversationId, userIdToAdd) => {
      const currentUserId = currentUserIdRef.current;
      if (!activeChat || activeChat.id !== conversationId || !userIdToAdd || !currentUserId) {
        setActionError('Invalid request to add user.');
        return;
      }
      const userToAdd = addUserSearchResults.find((user) => String(user._id).trim() === userIdToAdd);
      if (!userToAdd) {
        setActionError('User not found in search results.');
        return;
      }

      const isCurrentUserLeader = activeChat.leader === currentUserId;
      if (!isCurrentUserLeader) {
        setActionError('Only the leader can add members.');
        return;
      }

      const isAlreadyMember = activeChat.detailedMembers?.some(
        (m) => m.id === userIdToAdd && m.leftAt === null
      );
      if (isAlreadyMember) {
        setActionError('User is already an active member of this group.');
        setAddUserSearchResults([]);
        return;
      }

      setAddUserSearchResults([]);
      setActionError(null);

      await performSettingsAction(
        () => addNewMemberApi({ conversationId, newMemberId: userIdToAdd, role: 'member' }),
        'Add member',
        (apiResponse) => {
          setConversations((prevConvs) =>
            updateConversationsAfterMemberAdded(prevConvs, conversationId, apiResponse, userToAdd)
          );
          setActiveChat((prevActive) =>
            updateActiveChatAfterMemberAdded(prevActive, conversationId, apiResponse, userToAdd)
          );
        }
      );
    },
    [
      activeChat,
      performSettingsAction,
      addUserSearchResults,
      currentUserIdRef,
      setConversations,
      setActiveChat,
      setActionError,
      setAddUserSearchResults,
    ]
  );

  // --- Handler for leaving a group ---
  const handleLeaveGroup = useCallback(
    async (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (!activeChat || activeChat.id !== conversationId || !activeChat.isGroup || !currentUserId) return;

      const isCurrentUserActiveMember = activeChat.detailedMembers?.some(
        (m) => m.id === currentUserId && m.leftAt === null
      );
      const totalActiveLeaders = activeChat.detailedMembers?.filter(
        (m) => m.role === 'leader' && m.leftAt === null
      ).length || 0;
      const totalActiveMembers = activeChat.detailedMembers?.filter((m) => m.leftAt === null).length || 0;
      const isCurrentUserLeaderAndOnlyLeader = activeChat.leader === currentUserId && totalActiveLeaders <= 1;

      if (!isCurrentUserActiveMember) {
        setActionError('You are not an active member of this group.');
        return;
      }
      if (isCurrentUserLeaderAndOnlyLeader && totalActiveMembers > 1) {
        setActionError('You cannot leave this group as the only leader. Please assign a new leader first.');
        return;
      }

      if (window.confirm('Are you sure you want to leave this group?')) {
        await performSettingsAction(
          () => leaveConversationApi({ conversationId }),
          'Leave group',
          (response) => {
            setConversations((prevConvs) => filterConversationFromList(prevConvs, conversationId));
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
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      setConversations,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setMessageInput,
      setEditingMessageId,
      setSendingMessage,
      setActionError,
    ]
  );

  // --- Handler for deleting a group ---
  const handleDeleteGroup = useCallback(
    async (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        activeChat.leader !== currentUserId ||
        !currentUserId
      ) {
        console.warn('User is not authorized to delete this group.');
        setActionError('You must be the leader to delete the group.');
        return;
      }

      if (
        window.confirm('Are you sure you want to delete this group permanently? This action cannot be undone.')
      ) {
        await performSettingsAction(
          () => deleteGroupApi({ conversationId }),
          'Delete group',
          (response) => {
            setConversations((prevConvs) => filterConversationFromList(prevConvs, conversationId));
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
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      setConversations,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setMessageInput,
      setEditingMessageId,
      setSendingMessage,
      setActionError,
    ]
  );

  // --- Handler for deleting a conversation member ---
  const handleDeleteConversationMember = useCallback(
    async (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (!activeChat || activeChat.id !== conversationId || activeChat.isGroup || !currentUserId) {
        console.warn('Delete conversation action only for 1-on-1 chats and authenticated users.');
        return;
      }
      if (window.confirm('Are you sure you want to delete this conversation? (This will only delete it for you)')) {
        await performSettingsAction(
          () => deleteConversationMemberApi({ conversationId }),
          'Delete conversation',
          (response) => {
            setConversations((prevConvs) => filterConversationFromList(prevConvs, conversationId));
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
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      setConversations,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setMessageInput,
      setEditingMessageId,
      setSendingMessage,
      setActionError,
    ]
  );

  // --- Handler for starting group name edit ---
  const handleStartEditGroupName = useCallback(() => {
    if (activeChat?.isGroup && activeChat.name) {
      setEditingGroupName(activeChat.name);
      setIsEditingName(true);
      setActionError(null);
    } else {
      console.warn('Attempted to start editing name for a non-group chat or chat without a name.');
    }
  }, [activeChat, setEditingGroupName, setIsEditingName, setActionError]);

  // --- Handler for canceling group name edit ---
  const handleCancelEditGroupName = useCallback(() => {
    setIsEditingName(false);
    setEditingGroupName('');
    setActionError(null);
  }, [setIsEditingName, setEditingGroupName, setActionError]);

  // --- Handler for saving edited group name ---
  const handleSaveEditGroupName = useCallback(
    async () => {
      const currentUserId = currentUserIdRef.current;
      const conversationId = activeChat?.id;
      const newName = editingGroupName.trim();

      if (!conversationId || !activeChat?.isGroup || !newName || !currentUserId) {
        if (!newName) setActionError('Group name cannot be empty.');
        console.warn('Invalid request to update group name: missing info or empty name.');
        return;
      }

      if (newName === activeChat.name) {
        console.log('Group name is the same, cancelling save.');
        setIsEditingName(false);
        setEditingGroupName('');
        setActionError(null);
        return;
      }

      setActionError(null);
      setIsPerformingAction(true);

      await performSettingsAction(
        () => updateConversationNameApi({ conversationId, newName }),
        'Update group name',
        (apiResponse) => {
          setConversations((prevConvs) =>
            updateConversationsAfterGroupNameChanged(prevConvs, conversationId, newName)
          );
          setActiveChat((prevActive) =>
            updateActiveChatAfterGroupNameChanged(prevActive, conversationId, newName)
          );
          setIsEditingName(false);
          setEditingGroupName('');
        }
      );
    },
    [
      activeChat,
      currentUserIdRef,
      editingGroupName,
      performSettingsAction,
      setConversations,
      setActiveChat,
      setIsEditingName,
      setEditingGroupName,
      setActionError,
    ]
  );

  // --- Handler for sending text message ---
  const handleSendTextMessage = useCallback(
    async () => {
      const currentUserId = currentUserIdRef.current;
      const newMessageText = messageInput.trim();

      if (
        !activeChat?.id ||
        !currentUserId ||
        sendingMessage ||
        editingMessageId !== null ||
        !newMessageText
      ) {
        console.warn('Cannot send text message: Invalid state');
        return;
      }

      setSendingMessage(true);
      setActionError(null);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const newMessageOptimistic = createOptimisticTextMessage(tempId, newMessageText, currentUserId, user);
      setMessages((prevMessages) => [...prevMessages, newMessageOptimistic]);
      setMessageInput('');

      try {
        const messagePayload = buildTextMessagePayload(activeChat.id, newMessageText, tempId);

        // Emit message via Socket.IO
        if (socket) {
          socket.emit('message', messagePayload);
        }

        // Keep HTTP API call for consistency
        const sentMessage = await sendMessageApi(messagePayload);
        console.log('Text message sent successfully:', sentMessage);

        if (sentMessage && sentMessage._id) {
          const formattedSentMessage = formatReceivedMessage(sentMessage, currentUserId);

          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempId ? { ...formattedSentMessage, sender: 'self' } : msg
            )
          );

          setConversations((prevConversations) =>
            updateConversationsListLatestMessage(prevConversations, activeChat.id, sentMessage)
          );
        } else {
          throw new Error(sentMessage?.message || 'Failed to send text message.');
        }
      } catch (err) {
        console.error('Failed to send text message:', err);
        setActionError(err.message || 'Failed to send text message.');
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === tempId ? { ...newMessageOptimistic, status: 'failed' } : msg
          )
        );
      } finally {
        setSendingMessage(false);
      }
    },
    [
      activeChat,
      sendingMessage,
      editingMessageId,
      messageInput,
      currentUserIdRef,
      user,
      socket,
      setMessages,
      setMessageInput,
      setActionError,
      setConversations,
      setSendingMessage,
    ]
  );

  const handleUploadBeforeBegin = useCallback((files) => {
    const currentUserId = currentUserIdRef.current;

    if (!activeChat?.id || !currentUserId || sendingMessage || editingMessageId !== null || !files || files.length === 0) {
        console.warn('Cannot upload file(s): Invalid state or no files selected.');
        setActionError('Cannot send file(s) now.');
        return null; // Cancel the upload
    }

    setSendingMessage(true);
    setActionError(null);

    const newOptimisticMessages = files.map(file => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        let localPreviewUrl = null;
        if (fileType === 'image') {
            try {
                localPreviewUrl = URL.createObjectURL(file);
            } catch (e) {
                console.error('Error creating object URL for image preview:', e);
            }
        }

        const optimisticMsg = createOptimisticFileMessage(
            tempId,
            file, // Pass original file data
            currentUserId,
            user,
            localPreviewUrl
        );

        // Store original file data and tempId, keyed by a unique identifier for lookup later
        // Using file.name might be sufficient, or use tempId if filenames can be duplicated in a batch
        // Let's use file.name for simplicity, assuming unique names per batch for now,
        // or ensure your backend returns a key/name you can match.
        // If using file.name, make sure to handle potential duplicates.
        // A safer key might be a combination or a unique ID generated here.
         optimisticMessagesRef.current[file.name] = { tempId, localPreviewUrl, originalFile: file };


        return optimisticMsg;
    });

    // Add optimistic messages to state
    setMessages(prevMessages => [...prevMessages, ...newOptimisticMessages]);

    console.log("Upload begins for:", files.map(f => f.name).join(', '));

    // Return the files to continue with the upload
    return files;

}, [activeChat?.id, currentUserIdRef, sendingMessage, editingMessageId, setSendingMessage, setActionError, setMessages, user]);


const handleUploadComplete = useCallback(async (res) => {
    console.log("Files uploaded:", res);
    setActionError(null);

    const filesBeingProcessed = { ...optimisticMessagesRef.current }; // Clone before clearing
    optimisticMessagesRef.current = {}; // Clear ref immediately for next batch

    // Process each uploaded file result
    for (const uploadedFileDetails of res) {
         // Find corresponding optimistic data using the name/key returned by Uploadthing
        const originalFileName = uploadedFileDetails.name; // Assuming 'name' is returned
        const optimisticData = filesBeingProcessed[originalFileName];

        if (!optimisticData) {
             console.error("Could not find optimistic message data for uploaded file:", originalFileName, uploadedFileDetails);
             // This indicates a mismatch between files sent and results received
             continue;
        }

        const { tempId, localPreviewUrl, originalFile } = optimisticData;
        const fileType = originalFile.type.startsWith('image/') ? 'image' : 'file';

        try {
            // Build the final message payload
            const messagePayload = buildFileMessagePayload(activeChat.id, fileType, uploadedFileDetails, tempId);

            // Emit via Socket.IO
            if (socket) {
                socket.emit('message', messagePayload); // Adjust event name if necessary
            }

            // Send the message payload via HTTP API
            const sentMessage = await sendMessageApi(messagePayload);
            console.log('File message sent successfully via API:', sentMessage);

            if (sentMessage && sentMessage._id) {
                // Format and update message in state
                const formattedSentMessage = formatReceivedMessage(sentMessage, currentUserIdRef.current);

                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.id === tempId ? { ...formattedSentMessage, sender: 'self' } : msg
                    )
                );

                // Update conversations list
                setConversations((prevConversations) =>
                    updateConversationsListLatestMessage(prevConversations, activeChat.id, sentMessage)
                );

            } else {
                 // Handle API call failure after successful upload
                console.error('Failed to send message after successful upload:', sentMessage?.message);
                throw new Error(sentMessage?.message || 'Failed to send file message.'); // Throw to trigger catch
            }

        } catch (err) {
            console.error('Error sending file message after upload:', err);
             // Mark the specific optimistic message as failed
            setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                    msg.id === tempId ? { ...msg, status: 'failed' } : msg
                )
            );
            setActionError(err.message || `Failed to send file: ${originalFileName}`);
        } finally {
            // Clean up local URL for this specific file
             if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
             }
        }
    } // End loop

    // Reset overall sending state (consider if you have a batch counter for multiple files)
     setSendingMessage(false);

}, [activeChat?.id, currentUserIdRef, socket, sendMessageApi, setMessages, setConversations, setActionError, setSendingMessage, user, optimisticMessagesRef]);


const handleUploadError = useCallback((error) => {
    console.error("Uploadthing Error:", error);

    // Mark all pending optimistic messages in the ref as failed
    Object.values(optimisticMessagesRef.current).forEach(data => {
        setMessages(prevMessages =>
            prevMessages.map(msg =>
                 msg.id === data.tempId ? { ...msg, status: 'failed' } : msg
             )
         );
        // Revoke local URL for failed ones
        if (data.localPreviewUrl) {
            URL.revokeObjectURL(data.localPreviewUrl);
        }
     });

    // Clear the ref
    optimisticMessagesRef.current = {};

    // Reset sending state
    setSendingMessage(false);

    setActionError(error.message || 'File upload failed.');

}, [setMessages, setActionError, setSendingMessage, optimisticMessagesRef]);

// --- End NEW Uploadthing Handlers ---

  // --- Handler for sending file ---
  // const handleSendFile = useCallback(
  //   async (file) => {
  //     const currentUserId = currentUserIdRef.current;

  //     if (
  //       !activeChat?.id ||
  //       !currentUserId ||
  //       sendingMessage ||
  //       editingMessageId !== null ||
  //       !file
  //     ) {
  //       console.warn('Cannot send file: Invalid state');
  //       return;
  //     }

  //     setSendingMessage(true);
  //     setActionError(null);
  //     const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  //     const fileType = file.type.startsWith('image/') ? 'image' : 'file';

  //     let localPreviewUrl = null;
  //     if (fileType === 'image') {
  //       try {
  //         localPreviewUrl = URL.createObjectURL(file);
  //       } catch (e) {
  //         console.error('Error creating object URL for image preview:', e);
  //       }
  //     }

  //     const newFileMessageOptimistic = createOptimisticFileMessage(
  //       tempId,
  //       file,
  //       currentUserId,
  //       user,
  //       localPreviewUrl
  //     );
  //     setMessages((prevMessages) => [...prevMessages, newFileMessageOptimistic]);

  //     let uploadedFileDetails = null;
  //     try {
  //       const formData = new FormData();
  //       formData.append('file', file);
  //       const uploadResponse = await mockUploadFileApi(formData);

  //       if (!uploadResponse || !uploadResponse.success || !uploadResponse.data) {
  //         throw new Error(uploadResponse?.message || 'File upload failed.');
  //       }
  //       uploadedFileDetails = uploadResponse.data;

  //       const messagePayload = buildFileMessagePayload(activeChat.id, fileType, uploadedFileDetails, tempId);

  //       // Emit file message via Socket.IO
  //       if (socket) {
  //         socket.emit('message', messagePayload);
  //       }

  //       // Keep HTTP API call
  //       const sentMessage = await sendMessageApi(messagePayload);
  //       console.log('File message sent successfully:', sentMessage);

  //       if (sentMessage && sentMessage._id) {
  //         const formattedSentMessage = formatReceivedMessage(sentMessage, currentUserId);

  //         setMessages((prevMessages) =>
  //           prevMessages.map((msg) =>
  //             msg.id === tempId ? { ...formattedSentMessage, sender: 'self' } : msg
  //           )
  //         );

  //         setConversations((prevConversations) =>
  //           updateConversationsListLatestMessage(prevConversations, activeChat.id, sentMessage)
  //         );

  //         if (localPreviewUrl) {
  //           URL.revokeObjectURL(localPreviewUrl);
  //         }
  //       } else {
  //         throw new Error(sentMessage?.message || 'Failed to send file message.');
  //       }
  //     } catch (err) {
  //       console.error('Failed to upload or send file:', err);
  //       setMessages((prevMessages) =>
  //         prevMessages.map((msg) =>
  //           msg.id === tempId ? { ...newFileMessageOptimistic, status: 'failed' } : msg
  //         )
  //       );
  //       setActionError(err.message || 'Failed to send file.');
  //       if (localPreviewUrl) {
  //         URL.revokeObjectURL(localPreviewUrl);
  //       }
  //     } finally {
  //       setSendingMessage(false);
  //     }
  //   },
  //   [
  //     activeChat,
  //     sendingMessage,
  //     editingMessageId,
  //     currentUserIdRef,
  //     user,
  //     socket,
  //     setMessages,
  //     setActionError,
  //     setConversations,
  //     setSendingMessage,
  //   ]
  // );

  // --- Handler for deleting a message ---
  const handleDeleteMessage = useCallback(
    async (messageId) => {
      const currentUserId = currentUserIdRef.current;

      if (!messageId || !activeChat?.id || !currentUserId) {
        console.warn('Cannot delete message: Invalid parameters or no active chat/user.');
        setActionError('Cannot perform action without active chat or user.');
        return;
      }

      const messageToDelete = messages.find((msg) => msg.id === messageId);

      if (!messageToDelete) {
        console.warn(`Cannot delete message ${messageId}: Message not found in state.`);
        setActionError('Message not found in current view.');
        return;
      }
      if (messageToDelete.senderId !== currentUserId) {
        console.warn(`Cannot delete message ${messageId}: Not the sender.`);
        setActionError('You can only delete your own messages.');
        return;
      }
      if (messageToDelete.status && ['uploading', 'sending', 'failed'].includes(messageToDelete.status)) {
        console.warn(`Cannot delete message ${messageId}: Message status is '${messageToDelete.status}'.`);
        setActionError('Cannot delete message while uploading or sending.');
        return;
      }
      if (messageId === editingMessageId) {
        console.warn(`Cannot delete message ${messageId}: Message is currently being edited.`);
        setActionError('Cannot delete message while editing.');
        return;
      }

      if (window.confirm('Are you sure you want to delete this message?')) {
        const originalMessageStateCopy = messageToDelete ? { ...messageToDelete } : null;

        setMessages((prevMessages) => updateMessagesOptimisticDelete(prevMessages, messageId));
        setActionError(null);

        try {
          const response = await deleteMessageApi({ messageId });

          if (response && response.success === false) {
            console.error(`Failed to delete message ${messageId} on server:`, response?.message || response?.error || 'API reported failure.');
            let detailedErrorMessage = response?.message || response?.error || 'Failed to delete message on server.';
            setActionError(detailedErrorMessage);

            if (originalMessageStateCopy) {
              setMessages((prevMessages) =>
                revertMessagesOptimisticDelete(prevMessages, originalMessageStateCopy)
              );
            } else {
              console.warn('Could not revert optimistic delete for message:', messageId, 'Original state was not captured.');
            }
          } else {
            console.log(`Message ${messageId} deleted successfully on server.`, response);

            setConversations((prevConvs) =>
              updateConversationsListAfterMessageAction(prevConvs, activeChat.id, messages.filter((msg) => msg.id !== messageId), messageId)
            );
          }
        } catch (err) {
          console.error(`Error calling delete message API for ${messageId}:`, err);

          const detailedErrorMessage = err.message || 'An API error occurred while deleting message.';
          setActionError(detailedErrorMessage);

          if (originalMessageStateCopy) {
            setMessages((prevMessages) =>
              revertMessagesOptimisticDelete(prevMessages, originalMessageStateCopy)
            );
          } else {
            console.warn('Could not revert optimistic delete for message:', messageId, 'Original state was not captured on API error.');
          }
        }
      } else {
        setActionError(null);
      }
    },
    [
      activeChat?.id,
      messages,
      currentUserIdRef,
      editingMessageId,
      setMessages,
      setActionError,
      setConversations,
    ]
  );

  // --- Handler for initiating message edit ---
  const handleInitiateEditMessage = useCallback(
    async (messageId, currentText) => {
      const currentUserId = currentUserIdRef.current;
      if (!messageId || !activeChat?.id || !currentUserId) {
        console.warn('Cannot initiate edit message: Invalid parameters or no active chat/user.');
        return;
      }

      const messageToEdit = messages.find((msg) => msg.id === messageId);
      if (!messageToEdit) {
        console.warn(`Cannot initiate edit message ${messageId}: Message not found in state.`);
        setActionError('Message not found.');
        return;
      }
      if (messageToEdit.senderId !== currentUserId || messageToEdit.type !== 'text') {
        console.warn(`Cannot initiate edit message ${messageId}: Not the sender or not a text message.`);
        setActionError('You can only edit your own text messages.');
        return;
      }
      if (messageToEdit.status !== 'sent') {
        console.warn(`Cannot initiate edit message ${messageId}: Message status is '${messageToEdit.status}'.`);
        setActionError('Cannot edit messages that are not yet sent.');
        return;
      }
      if (sendingMessage || editingMessageId !== null) {
        console.warn(`Cannot initiate edit message ${messageId}: Another action is in progress.`);
        setActionError(
          editingMessageId !== null ? 'Another message is currently being edited.' : 'Another action is in progress.'
        );
        return;
      }

      setActionError(null);
      setEditingMessageId(messageId);
      setMessageInput(currentText);
      console.log(`Initiating edit for message ${messageId} with text: "${currentText}"`);
    },
    [
      activeChat?.id,
      messages,
      currentUserIdRef,
      sendingMessage,
      editingMessageId,
      setActionError,
      setEditingMessageId,
      setMessageInput,
    ]
  );

  // --- Handler for saving edited message ---
  const handleSaveEditedMessage = useCallback(
    async () => {
      const messageId = editingMessageId;
      const currentUserId = currentUserIdRef.current;
      const newText = messageInput;

      if (!messageId || !activeChat?.id || !currentUserId) {
        console.warn('Cannot save edit: Invalid state (no message ID, no chat, or no user).');
        setEditingMessageId(null);
        setMessageInput('');
        setActionError('Invalid request to save message.');
        return;
      }

      const messageToEdit = messages.find((msg) => msg.id === messageId);

      if (!messageToEdit) {
        console.warn(`Cannot save edit for message ${messageId}: Message not found in state.`);
        setEditingMessageId(null);
        setMessageInput('');
        setActionError('Message to edit not found in current view.');
        return;
      }

      const originalText = messageToEdit?.content?.text?.data || '';
      const trimmedNewText = newText.trim();

      if (trimmedNewText === originalText.trim()) {
        console.log('No change in message text, cancelling save.');
        setActionError(null);
        setEditingMessageId(null);
        setMessageInput('');
        return;
      }

      if (sendingMessage) {
        console.warn('Cannot save edit: Already saving/sending another item.');
        setActionError('Save in progress. Please wait.');
        return;
      }

      if (!trimmedNewText) {
        console.warn('Cannot save empty message.');
        setActionError('Edited message cannot be empty.');
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

      setMessages((prevMessages) => updateMessagesOptimisticEdit(prevMessages, messageId, trimmedNewText));
      setEditingMessageId(null);
      setMessageInput('');

      setSendingMessage(true);
      setActionError(null);

      try {
        const response = await editMessageApi({ messageId, newData: trimmedNewText });

        if (response && response._id === messageId) {
          console.log(`Message ${messageId} edited successfully on server.`, response);

          setMessages((prevMessages) => updateMessagesEditSuccess(prevMessages, response));

          setConversations((prevConvs) =>
            updateConversationsListAfterMessageAction(prevConvs, activeChat.id, messages, messageId)
          );
        } else {
          console.error(
            `Failed to edit message ${messageId} on server. API response did not match expected success format:`,
            response
          );

          let detailedErrorMessage = 'Failed to edit message on server (unexpected response).';
          if (response && response.message) detailedErrorMessage = response.message;
          else if (response && response.error) detailedErrorMessage = response.error;

          setActionError(detailedErrorMessage);

          if (originalMessageState) {
            setMessages((prevMessages) => revertMessagesOptimisticEdit(prevMessages, originalMessageState));
          } else {
            console.warn('Could not revert optimistic edit for message:', messageId, 'Original state was not captured.');
          }
        }
      } catch (err) {
        console.error(`Error calling edit message API for ${messageId}:`, err);

        const detailedErrorMessage = err.message || 'An API error occurred while editing message.';
        setActionError(detailedErrorMessage);

        if (originalMessageState) {
          setMessages((prevMessages) => revertMessagesOptimisticEdit(prevMessages, originalMessageState));
        } else {
          console.warn('Could not revert optimistic edit for message:', messageId, 'Original state was not captured on API error.');
        }
      } finally {
        setSendingMessage(false);
      }
    },
    [
      activeChat?.id,
      editingMessageId,
      messageInput,
      messages,
      currentUserIdRef,
      sendingMessage,
      setMessages,
      setActionError,
      setConversations,
      setEditingMessageId,
      setMessageInput,
      setSendingMessage,
    ]
  );

  // --- Handler for canceling edit ---
  const handleCancelEdit = useCallback(() => {
    console.log(`Cancelling edit for message ${editingMessageId}.`);
    if (sendingMessage) {
      console.warn('Cannot cancel edit: Save in progress.');
      setActionError('Save in progress. Please wait.');
      return;
    }
    setEditingMessageId(null);
    setMessageInput('');
    setActionError(null);
  }, [editingMessageId, sendingMessage, setMessageInput, setEditingMessageId, setActionError]);

  // --- Handler for search change ---
  const handleSearchChange = useCallback(
    (event) => {
      const term = event.target.value.toLowerCase();
      setSearchTerm(term);
    },
    [setSearchTerm]
  );

  return {
    handleConversationClick,
    handleMobileBack,
    handleOpenSettings,
    handleCloseSettings,
    handleRemoveUser,
    handleUpdateGroupName,
    handleChangeLeader,
    handleStepDownLeader,
    handleAddUserSearch,
    handleAddUserConfirm,
    handleLeaveGroup,
    handleDeleteGroup,
    handleDeleteConversationMember,
    handleStartEditGroupName,
    handleCancelEditGroupName,
    handleSaveEditGroupName,
    handleSendTextMessage,
    // handleSendFile,
    handleUploadBeforeBegin,
    handleUploadComplete,
    handleUploadError,
    handleDeleteMessage,
    handleInitiateEditMessage,
    handleSaveEditedMessage,
    handleCancelEdit,
    handleSearchChange,
  };
};