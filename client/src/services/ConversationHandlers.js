import { useCallback } from 'react';
import { getUserByEmailApi, getUserDetailsApi } from '../api/users';
import {
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
} from './chatService';
import { deleteConversationMemberApi } from '../api/conversations';

export const useConversationHandlers = ({
  user,
  isAuthenticated,
  currentUserIdRef,
  activeChat,
  conversations,
  addUserSearchResults,
  isEditingName,
  editingGroupName,
  isConnected,
  setConversations,
  setActiveChat,
  setActionError,
  setIsSettingsOpen,
  setIsMobileChatActive,
  setIsPerformingAction,
  setAddUserSearchResults,
  setIsEditingName,
  setEditingGroupName,
  createConversation,
  addNewMember,
  removeMember,
  leaveConversation,
  deleteConversationByLeader,
  updateConversationName,
  updateConversationAvatar,
  updateMemberRole,
}) => {
  // --- Generic handler for socket actions ---
  const performSettingsAction = useCallback(
    (socketCall, successMessage, optimisticUpdate = null) => {
      if (!isConnected) {
        setActionError('Socket is not connected. Please try again.');
        setIsPerformingAction(false);
        return;
      }
      setIsPerformingAction(true);
      setActionError(null);
      try {
        const success = socketCall();
        if (success) {
          console.log(`${successMessage} initiated`);
          setActionError(null);
          if (optimisticUpdate) {
            optimisticUpdate();
          }
        } else {
          throw new Error('Socket call failed to initiate');
        }
      } catch (err) {
        console.error(`Socket call failed for ${successMessage}:`, err);
        setActionError(
          err.message ||
            `An error occurred during ${successMessage.toLowerCase()}.`
        );
      } finally {
        setIsPerformingAction(false);
      }
    },
    [setIsPerformingAction, setActionError, isConnected]
  );

  // --- Handler for creating a new conversation ---
  const handleCreateConversation = useCallback(
    (members, name) => {
      const currentUserId = currentUserIdRef.current;
      if (!isAuthenticated || !currentUserId) {
        console.warn('User not authenticated. Cannot create conversation.');
        setActionError('Please login to create a conversation.');
        return;
      }
      if (!members || members.length === 0) {
        console.warn('No members provided to create conversation.');
        setActionError('Please select at least one user to create a conversation.');
        return;
      }
      performSettingsAction(
        () => createConversation({ members, name }),
        'Create conversation',
        // No optimistic update; handled by 'conversationCreated' event
      );
    },
    [
      isAuthenticated,
      currentUserIdRef,
      performSettingsAction,
      createConversation,
      setActionError,
    ]
  );

  // --- Handler for removing a user ---
  const handleRemoveUser = useCallback(
    (conversationId, userIdToRemove) => {
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
      const memberToRemove = activeChat.detailedMembers?.find(
        (m) => m.id === userIdToRemove && !m.leftAt
      );
      if (!memberToRemove) {
        setActionError('User not found in group or already left.');
        return;
      }
      const isCurrentUserLeader = activeChat.leaders.includes(currentUserId);
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
      if (
        !window.confirm(
          `Are you sure you want to remove ${
            memberToRemove.fullName || userIdToRemove
          } from the group?`
        )
      ) {
        setActionError(null);
        return;
      }
      performSettingsAction(
        () => removeMember({ conversationId, memberId: userIdToRemove }),
        'Remove member',
        () => {
          setConversations((prevConvs) =>
            updateConversationsAfterMemberRemoved(prevConvs, conversationId, userIdToRemove)
          );
          setActiveChat((prevActive) =>
            prevActive && prevActive.id === conversationId
              ? {
                  ...prevActive,
                  members: prevActive.members.filter(m => {
                    const id = typeof m.id === 'object' && m.id._id ? m.id._id : m.id;
                    return id !== userIdToRemove;
                  }),
                  detailedMembers: prevActive.detailedMembers
                    ? prevActive.detailedMembers.filter(m => m.id !== userIdToRemove)
                    : prevActive.detailedMembers,
                }
              : prevActive
          );
        }
      );
      alert('Member removed successfully!');
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      removeMember,
      setConversations,
      setActiveChat,
      setActionError,
    ]
  );

  // --- Handler for updating group name ---
  const handleUpdateGroupName = useCallback(
    (conversationId, newName) => {
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
        setActionError(trimmedName ? 'Cannot perform action on this chat.' : 'Group name cannot be empty.');
        return;
      }
      const isMember = activeChat.detailedMembers?.some(
        (m) => m.id === currentUserId && !m.leftAt
      );
      if (!isMember) {
        setActionError('You are not an active member of this group.');
        return;
      }
      performSettingsAction(
        () => updateConversationName({ conversationId, newName: trimmedName }),
        'Update group name',
        () => {
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
      alert('Group name changed successfully!');
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      updateConversationName,
      setConversations,
      setActiveChat,
      setIsEditingName,
      setEditingGroupName,
      setActionError,
    ]
  );

  const handleChangeLeader = useCallback(
    (conversationId, newLeaderId) => {
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
      const newLeaderMember = activeChat.detailedMembers?.find(
        (m) => m.id === newLeaderId && !m.leftAt
      );
      if (!newLeaderMember) {
        setActionError('New leader must be a current member of the group.');
        return;
      }
      const isCurrentUserLeader = activeChat.detailedMembers?.some(
        (m) => m.id === currentUserId && m.role === 'leader' && !m.leftAt
      );
      if (!isCurrentUserLeader) {
        setActionError('Only a leader can assign another leader.');
        return;
      }
      if (
        !window.confirm(
          `Are you sure you want to make ${
            newLeaderMember.fullName || newLeaderId
          } a leader?`
        )
      ) {
        setActionError(null);
        return;
      }
      performSettingsAction(
        () =>
          updateMemberRole({
            conversationId,
            memberId: newLeaderId,
            newRole: 'leader',
          }),
        'Add leader',
        () => {
          setConversations((prevConvs) =>
            prevConvs.map(conv =>
              conv.id === conversationId
                ? {
                    ...conv,
                    detailedMembers: conv.detailedMembers.map(m =>
                      m.id === newLeaderId ? { ...m, role: 'leader' } : m
                    ),
                  }
                : conv
            )
          );
          setActiveChat((prevActive) =>
            prevActive && prevActive.id === conversationId
              ? {
                  ...prevActive,
                  detailedMembers: prevActive.detailedMembers.map(m =>
                    m.id === newLeaderId ? { ...m, role: 'leader' } : m
                  ),
                }
              : prevActive
          );
        }
      );
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      updateMemberRole,
      setConversations,
      setActiveChat,
      setActionError,
    ]
  );

  // --- Handler for stepping down as leader ---
  const handleStepDownLeader = useCallback(
    (conversationId, leaderId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !activeChat.leaders.includes(currentUserId) ||
        leaderId !== currentUserId ||
        !currentUserId
      ) {
        setActionError('Invalid request to step down as leader.');
        return;
      }
      const membersList = activeChat.detailedMembers || [];
      const totalActiveLeaders = membersList.filter(
        (m) => m.role === 'leader' && !m.leftAt
      ).length;
      const totalActiveMembers = membersList.filter((m) => !m.leftAt).length;
      if (totalActiveLeaders <= 1 && totalActiveMembers > 1) {
        setActionError(
          'You cannot step down as the only leader. Please assign a new leader first.'
        );
        return;
      }
      if (
        !window.confirm(
          'Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left.'
        )
      ) {
        setActionError(null);
        return;
      }
      performSettingsAction(
        () =>
          addNewMember({
            conversationId,
            newMemberId: leaderId,
            role: 'member',
          }),
        'Step down as leader',
        () => {
          const oldLeaderId = currentUserId;
          const remainingMembers = membersList
            .filter((m) => !m.leftAt && m.id !== leaderId)
            .map((m) => m.id);
          const newLeaderId = remainingMembers.length > 0 ? remainingMembers[0] : null;
          setConversations((prevConvs) =>
            updateConversationsAfterLeaderChanged(
              prevConvs,
              conversationId,
              newLeaderId,
              oldLeaderId
            )
          );
          setActiveChat((prevActive) =>
            updateActiveChatAfterLeaderChanged(
              prevActive,
              conversationId,
              newLeaderId,
              oldLeaderId
            )
          );
        }
      );
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      addNewMember,
      setConversations,
      setActiveChat,
      setActionError,
    ]
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
        const filteredResults = filterAddUserSearchResults(
          userArray,
          activeChat?.detailedMembers
        );
        setAddUserSearchResults(filteredResults);
      } catch (err) {
        console.error('Search users API call failed:', err);
        setActionError(err.message || 'An error occurred during search.');
        setAddUserSearchResults([]);
      } finally {
        setIsPerformingAction(false);
      }
    },
    [
      activeChat?.detailedMembers,
      setIsPerformingAction,
      setActionError,
      setAddUserSearchResults,
    ]
  );

  // --- Handler for confirming adding a user ---
  const handleAddUserConfirm = useCallback(
    (conversationId, userIdToAdd, selectedUserObj = null) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !userIdToAdd ||
        !currentUserId
      ) {
        setActionError('Invalid request to add user.');
        return;
      }
      let userToAdd = addUserSearchResults.find(
        (user) => String(user._id).trim() === userIdToAdd
      );
      if (!userToAdd && selectedUserObj && String(selectedUserObj._id) === userIdToAdd) {
        userToAdd = selectedUserObj;
      }
      if (!userToAdd) {
        setActionError('User not found in search results.');
        return;
      }
      const isAlreadyMember = activeChat.detailedMembers?.some(
        (m) => m.id === userIdToAdd && !m.leftAt
      );
      if (isAlreadyMember) {
        setActionError('User is already an active member of this group.');
        setAddUserSearchResults([]);
        return;
      }
      performSettingsAction(
        () =>
          addNewMember({
            conversationId,
            newMemberId: userIdToAdd,
            role: 'member',
          }),
        'Add member',
        () => {
          setConversations((prevConvs) =>
            updateConversationsAfterMemberAdded(prevConvs, conversationId, {
              id: userIdToAdd,
              ...userToAdd,
              role: 'member',
              joinedAt: new Date().toISOString(),
            })
          );
          setActiveChat((prevActive) =>
            updateActiveChatAfterMemberAdded(
              prevActive,
              conversationId,
              null,
              {
                id: userIdToAdd,
                ...userToAdd,
                role: 'member',
                joinedAt: new Date().toISOString(),
              }
            )
          );
          setAddUserSearchResults([]);
        }
      );
      alert('Member added successfully!');
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      addNewMember,
      addUserSearchResults,
      setConversations,
      setActiveChat,
      setAddUserSearchResults,
      setActionError,
    ]
  );

  // --- Handler for leaving a group ---
  const handleLeaveGroup = useCallback(
    (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !currentUserId
      ) {
        setActionError('Invalid request to leave group.');
        return;
      }
      const isCurrentUserActiveMember = activeChat.detailedMembers?.some(
        (m) => m.id === currentUserId && !m.leftAt
      );
      const totalActiveLeaders = activeChat.detailedMembers?.filter(
        (m) => m.role === 'leader' && !m.leftAt
      ).length || 0;
      const totalActiveMembers = activeChat.detailedMembers?.filter((m) => !m.leftAt).length || 0;
      const isCurrentUserLeaderAndOnlyLeader =
        activeChat.leaders.includes(currentUserId) && totalActiveLeaders <= 1;
      if (!isCurrentUserActiveMember) {
        setActionError('You are not an active member of this group.');
        return;
      }
      // if (isCurrentUserLeaderAndOnlyLeader && totalActiveMembers > 1) {
      //   setActionError(
      //     'You cannot leave this group as the only leader. Please assign a new leader first.'
      //   );
      //   return;
      // }
      if (!window.confirm('Are you sure you want to leave this group?')) {
        setActionError(null);
        return;
      }
      performSettingsAction(
        () => leaveConversation({ conversationId }),
        'Leave group',
        () => {
          setConversations((prevConvs) =>
            prevConvs.filter((conv) => conv.id !== conversationId)
          );
          setActiveChat(null);
          setIsSettingsOpen(false);
          setIsMobileChatActive(false);
        }
      );
      alert('You have left the group successfully!');
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      leaveConversation,
      setConversations,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setActionError,
    ]
  );

  // --- Handler for deleting a group ---
  const handleDeleteGroup = useCallback(
    (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !activeChat.leaders.includes(currentUserId)
      ) {
        console.warn('User is not authorized to delete this group.');
        setActionError('You must be the leader to delete the group.');
        return;
      }
      if (
        !window.confirm(
          'Are you sure you want to delete this group permanently? This action cannot be undone.'
        )
      ) {
        setActionError(null);
        return;
      }
      performSettingsAction(
        () => deleteConversationByLeader({ conversationId }),
        'Delete group',
        () => {
          setConversations((prevConvs) =>
            prevConvs.filter((conv) => conv.id !== conversationId)
          );
          setActiveChat(null);
          setIsSettingsOpen(false);
          setIsMobileChatActive(false);
        }
      );
      alert('Group deleted successfully!');
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      deleteConversationByLeader,
      setConversations,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setActionError,
    ]
  );

  // --- Handler for deleting a conversation member ---
  const handleDeleteConversationMember = useCallback(
    async (conversationId) => {
      if (
        window.confirm(
          "Are you sure you want to delete this conversation? (This will only delete it for you)"
        )
      ) {
        performSettingsAction(
          () => deleteConversationMemberApi({ conversationId }),
          "Delete conversation",
          (response) => {
            setConversations((prevConvs) => filterConversationFromList(prevConvs, conversationId)
            );
            setActiveChat(null);
            setIsSettingsOpen(false);
            setIsMobileChatActive(false);
          }
        );
        alert("Conversation deleted successfully!");
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
      setActionError,
    ]
  );

  // --- Handler for starting group name edit ---
  const handleStartEditGroupName = useCallback(() => {
    if (activeChat?.isGroup) {
      setEditingGroupName(activeChat.name || '');
      setIsEditingName(true);
      setActionError(null);
    } else {
      console.warn('Attempted to edit name for a non-group chat.');
      setActionError('Cannot edit name for this chat.');
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
    () => {
      const conversationId = activeChat?.id;
      const newName = editingGroupName.trim();
      if (!conversationId || !activeChat?.isGroup || !newName) {
        console.warn('Invalid request to update group name.');
        setActionError(newName ? 'Cannot perform action on this chat.' : 'Group name cannot be empty.');
        return;
      }
      if (newName === activeChat.name) {
        setIsEditingName(false);
        setEditingGroupName('');
        setActionError(null);
        return;
      }
      performSettingsAction(
        () => updateConversationName({ conversationId, newName }),
        'Update group name',
        () => {
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
      alert('Group name changed successfully!');
    },
    [
      activeChat,
      editingGroupName,
      performSettingsAction,
      updateConversationName,
      setConversations,
      setActiveChat,
      setIsEditingName,
      setEditingGroupName,
      setActionError,
    ]
  );

  return {
    performSettingsAction,
    handleCreateConversation,
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
  };
};