import { useCallback } from "react";
import { getUserByEmailApi, getUserDetailsApi } from "../api/users";
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
} from "./chatService";

export const useConversationHandlers = ({
  user,
  isAuthenticated,
  currentUserIdRef,
  activeChat,
  conversations,
  addUserSearchResults,
  isEditingName,
  editingGroupName,
  isConnected, // Từ useConversationSocket
  setConversations,
  setActiveChat,
  setActionError,
  setIsSettingsOpen,
  setIsMobileChatActive,
  setIsPerformingAction,
  setAddUserSearchResults,
  setIsEditingName,
  setEditingGroupName,
  // Các phương thức từ useConversationSocket
  createConversation,
  addNewMember,
  removeMember,
  leaveConversation,
  deleteConversationByLeader,
  updateConversationName,
  updateConversationAvatar,
}) => {
  // --- Generic handler for socket actions ---
  const performSettingsAction = useCallback(
    async (socketCall, successMessage, updateStateFunc = null) => {
      if (!isConnected) {
        setActionError("Socket is not connected. Please try again.");
        setIsPerformingAction(false);
        return;
      }
      setIsPerformingAction(true);
      setActionError(null);
      try {
        const response = await socketCall();

        if (response && response.success === false) {
          console.error(
            `${successMessage} failed: Socket indicated failure.`,
            response
          );
          const errorMessage =
            response?.message || response?.error || "Action failed.";
          setActionError(errorMessage);
        } else {
          console.log(`${successMessage} successful:`, response);
          setActionError(null);

          if (updateStateFunc) {
            updateStateFunc(response);
          }
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
    async (members, name) => {
      const currentUserId = currentUserIdRef.current;
      if (!isAuthenticated || !currentUserId) {
        console.warn("User not authenticated. Cannot create conversation.");
        setActionError("Please login to create a conversation.");
        return;
      }

      if (!members || members.length === 0) {
        console.warn("No members provided to create conversation.");
        setActionError(
          "Please select at least one user to create a conversation."
        );
        return;
      }

      await performSettingsAction(
        () => createConversation({ members, name }),
        "Create conversation",
        (response) => {
          // Không cần thêm conversation vào state vì useConversationSocket đã xử lý sự kiện 'conversationCreated'
          const newConversation = {
            id: response._id,
            name: name || response.name || "",
            isGroup: members.length > 1 || !!name,
            members: [...members, currentUserId],
            detailedMembers: response.detailedMembers || [],
            lastMessage: null,
            unread: 0,
            time: response.createdAt || new Date(),
          };
          setActiveChat(newConversation); // Auto-select the new conversation
          setIsMobileChatActive(window.innerWidth <= 768);
          setIsSettingsOpen(false);
        }
      );
    },
    [
      isAuthenticated,
      currentUserIdRef,
      performSettingsAction,
      createConversation,
      setActiveChat,
      setIsMobileChatActive,
      setIsSettingsOpen,
      setActionError,
    ]
  );

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
        console.warn("Invalid request to remove user.");
        setActionError("Cannot perform action on this chat.");
        return;
      }
      const membersList = activeChat.detailedMembers;
      const memberToRemove = membersList?.find(
        (m) => m.id === userIdToRemove && m.leftAt === null
      );
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
        setActionError('You cannot remove yourself. Use "Leave Group".');
        return;
      }
      if (memberToRemove.role === "leader") {
        setActionError(
          "Cannot remove another leader. Change their role first."
        );
        return;
      }

      if (
        window.confirm(
          `Are you sure you want to remove ${
            memberToRemove.fullName || userIdToRemove
          } from the group?`
        )
      ) {
        await performSettingsAction(
          () => removeMember({ conversationId, memberId: userIdToRemove }),
          "Remove member",
          (response) => {
            // Không cần cập nhật conversations vì useConversationSocket đã xử lý sự kiện 'removedMember'
            setActiveChat((prevActive) =>
              updateActiveChatAfterMemberRemoved(
                prevActive,
                conversationId,
                userIdToRemove,
                response
              )
            );
          }
        );
      } else {
        setActionError(null);
      }
    },
    [
      activeChat,
      performSettingsAction,
      currentUserIdRef,
      removeMember,
      setActiveChat,
      setActionError,
    ]
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
        console.warn("Invalid request to update group name.");
        if (!trimmedName) setActionError("Group name cannot be empty.");
        return;
      }

      const isMember = activeChat.detailedMembers?.some(
        (m) => m.id === currentUserId && m.leftAt === null
      );
      if (!isMember) {
        setActionError("You are not an active member of this group.");
        return;
      }

      await performSettingsAction(
        () => updateConversationName({ conversationId, newName: trimmedName }),
        "Update group name",
        (response) => {
          // Không cần cập nhật conversations vì useConversationSocket đã xử lý sự kiện 'updatedConversationName'
          setActiveChat((prevActive) =>
            updateActiveChatAfterGroupNameChanged(
              prevActive,
              conversationId,
              trimmedName
            )
          );
          setIsEditingName(false);
          setEditingGroupName("");
        }
      );
    },
    [
      activeChat,
      currentUserIdRef,
      performSettingsAction,
      updateConversationName,
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
        console.warn("Cannot change leader: Invalid state.");
        setActionError("Cannot perform action on this chat.");
        return;
      }
      const membersList = activeChat.detailedMembers;
      const newLeaderMember = membersList?.find(
        (m) => m.id === newLeaderId && m.leftAt === null
      );
      if (!newLeaderMember) {
        setActionError("New leader must be a current member of the group.");
        return;
      }

      const isCurrentUserLeader = activeChat.leader === currentUserId;
      if (!isCurrentUserLeader) {
        setActionError("Only the current leader can change leadership.");
        return;
      }

      if (
        window.confirm(
          `Are you sure you want to make ${
            newLeaderMember.fullName || newLeaderId
          } the new leader?`
        )
      ) {
        await performSettingsAction(
          () =>
            addNewMember({
              conversationId,
              newMemberId: newLeaderId,
              role: "leader",
            }), // Sử dụng addNewMember để cập nhật vai trò
          "Change leader",
          (response) => {
            const oldLeaderId = activeChat.leader;
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
      } else {
        setActionError(null);
      }
    },
    [
      activeChat,
      performSettingsAction,
      currentUserIdRef,
      addNewMember,
      setConversations,
      setActiveChat,
      setActionError,
    ]
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
      ) {
        setActionError("Invalid request to step down as leader.");
        return;
      }

      const membersList = activeChat.detailedMembers;
      const totalActiveLeaders = membersList.filter(
        (m) => m.role === "leader" && m.leftAt === null
      ).length;
      const totalActiveMembers =
        membersList.filter((m) => m.leftAt === null).length || 0;

      if (totalActiveLeaders <= 1 && totalActiveMembers > 1) {
        setActionError(
          "You cannot step down as the only leader. Please assign a new leader first."
        );
        return;
      }

      if (
        window.confirm(
          "Are you sure you want to step down as leader? A new leader will be assigned if you are the only one left."
        )
      ) {
        await performSettingsAction(
          async () => {
            await addNewMember({
              conversationId,
              newMemberId: leaderId,
              role: "member",
            }); // Cập nhật vai trò của leader hiện tại thành member
            return {};
          },
          "Step down as leader",
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
      } else {
        setActionError(null);
      }
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
      setAddUserSearchResults([]);

      try {
        let user = null;
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTerm);
        const isIdFormat = /^[a-fA-F0-9]{24}$/.test(trimmedTerm);

        if (!isEmailFormat && !isIdFormat) {
          throw new Error(
            "Invalid search term: Must be a valid email or ObjectID."
          );
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
        console.error("Search users API call failed:", err);
        setActionError(err.message || "An error occurred during search.");
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
    async (conversationId, userIdToAdd) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !userIdToAdd ||
        !currentUserId
      ) {
        setActionError("Invalid request to add user.");
        return;
      }
      const userToAdd = addUserSearchResults.find(
        (user) => String(user._id).trim() === userIdToAdd
      );
      if (!userToAdd) {
        setActionError("User not found in search results.");
        return;
      }

      const isAlreadyMember = activeChat.detailedMembers?.some(
        (m) => m.id === userIdToAdd && m.leftAt === null
      );
      if (isAlreadyMember) {
        setActionError("User is already an active member of this group.");
        setAddUserSearchResults([]);
        return;
      }

      setAddUserSearchResults([]);
      setActionError(null);

      await performSettingsAction(
        () =>
          addNewMember({
            conversationId,
            newMemberId: userIdToAdd,
            role: "member",
          }),
        "Add member",
        (response) => {
          // Không cần cập nhật conversations vì useConversationSocket đã xử lý sự kiện 'addedNewMember'
          setActiveChat((prevActive) =>
            updateActiveChatAfterMemberAdded(
              prevActive,
              conversationId,
              response,
              userToAdd
            )
          );
        }
      );
    },
    [
      activeChat,
      performSettingsAction,
      addNewMember,
      addUserSearchResults,
      currentUserIdRef,
      setActiveChat,
      setActionError,
      setAddUserSearchResults,
    ]
  );

  // --- Handler for leaving a group ---
  const handleLeaveGroup = useCallback(
    async (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        !activeChat.isGroup ||
        !currentUserId
      ) {
        setActionError("Invalid request to leave group.");
        return;
      }

      const isCurrentUserActiveMember = activeChat.detailedMembers?.some(
        (m) => m.id === currentUserId && m.leftAt === null
      );
      const totalActiveLeaders =
        activeChat.detailedMembers?.filter(
          (m) => m.role === "leader" && m.leftAt === null
        ).length || 0;
      const totalActiveMembers =
        activeChat.detailedMembers?.filter((m) => m.leftAt === null).length ||
        0;
      const isCurrentUserLeaderAndOnlyLeader =
        activeChat.leader === currentUserId && totalActiveLeaders <= 1;

      if (!isCurrentUserActiveMember) {
        setActionError("You are not an active member of this group.");
        return;
      }
      if (isCurrentUserLeaderAndOnlyLeader && totalActiveMembers > 1) {
        setActionError(
          "You cannot leave this group as the only leader. Please assign a new leader first."
        );
        return;
      }

      if (window.confirm("Are you sure you want to leave this group?")) {
        await performSettingsAction(
          () => leaveConversation({ conversationId }),
          "Leave group",
          (response) => {
            // Không cần lọc conversations vì useConversationSocket đã xử lý sự kiện 'leftConversation'
            setActiveChat(null);
            setIsSettingsOpen(false);
            setIsMobileChatActive(false);
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
      leaveConversation,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
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
        !currentUserId
      ) {
        console.warn("User is not authorized to delete this group.");
        setActionError("You must be the leader to delete the group.");
        return;
      }

      if (
        window.confirm(
          "Are you sure you want to delete this group permanently? This action cannot be undone."
        )
      ) {
        await performSettingsAction(
          () => deleteConversationByLeader({ conversationId }),
          "Delete group",
          (response) => {
            // Không cần lọc conversations vì useConversationSocket đã xử lý sự kiện 'deletedConversationByLeader'
            setActiveChat(null);
            setIsSettingsOpen(false);
            setIsMobileChatActive(false);
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
      deleteConversationByLeader,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setActionError,
    ]
  );

  // --- Handler for deleting a conversation member ---
  const handleDeleteConversationMember = useCallback(
    async (conversationId) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat ||
        activeChat.id !== conversationId ||
        activeChat.isGroup ||
        !currentUserId
      ) {
        console.warn(
          "Delete conversation action only for 1-on-1 chats and authenticated users."
        );
        setActionError("Invalid request to delete conversation.");
        return;
      }
      if (
        window.confirm(
          "Are you sure you want to delete this conversation? (This will only delete it for you)"
        )
      ) {
        await performSettingsAction(
          () => leaveConversation({ conversationId }), // Sử dụng leaveConversation cho 1-on-1 chat
          "Delete conversation",
          (response) => {
            // Không cần lọc conversations vì useConversationSocket đã xử lý
            setActiveChat(null);
            setIsSettingsOpen(false);
            setIsMobileChatActive(false);
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
      leaveConversation,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
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
      console.warn(
        "Attempted to start editing name for a non-group chat or chat without a name."
      );
    }
  }, [activeChat, setEditingGroupName, setIsEditingName, setActionError]);

  // --- Handler for canceling group name edit ---
  const handleCancelEditGroupName = useCallback(() => {
    setIsEditingName(false);
    setEditingGroupName("");
    setActionError(null);
  }, [setIsEditingName, setEditingGroupName, setActionError]);

  // --- Handler for saving edited group name ---
  const handleSaveEditGroupName = useCallback(
    async () => {
      const currentUserId = currentUserIdRef.current;
      const conversationId = activeChat?.id;
      const newName = editingGroupName.trim();

      if (!conversationId || !activeChat?.isGroup || !newName || !currentUserId) {
        if (!newName) setActionError("Group name cannot be empty.");
        console.warn(
          "Invalid request to update group name: missing info or empty name."
        );
        return;
      }

      if (newName === activeChat.name) {
        console.log("Group name is the same, cancelling save.");
        setIsEditingName(false);
        setEditingGroupName("");
        setActionError(null);
        return;
      }

      setActionError(null);
      setIsPerformingAction(true);

      await performSettingsAction(
        () => updateConversationName({ conversationId, newName }),
        "Update group name",
        (response) => {
          // Không cần cập nhật conversations vì useConversationSocket đã xử lý
          setActiveChat((prevActive) =>
            updateActiveChatAfterGroupNameChanged(
              prevActive,
              conversationId,
              newName
            )
          );
          setIsEditingName(false);
          setEditingGroupName("");
        }
      );
    },
    [
      activeChat,
      currentUserIdRef,
      editingGroupName,
      performSettingsAction,
      updateConversationName,
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