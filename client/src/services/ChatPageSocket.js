import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { 
  formatReceivedMessage, 
  updateConversationsListLatestMessage, 
  processRawRooms,
} from './chatService';
import { getUserDetailsApi } from "../api/users";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const useSocket = ({
  isAuthenticated,
  userId,
  userInfo,
  activeChatId,
  setMessages,
  setConversations,
  setActionError,
  conversations,
  rawConversations,
  setRawConversations,
  setActiveChat,
  setIsEditingName,
  setEditingGroupName,
  setAddUserSearchResults,
}) => {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const joinedRoomsRef = useRef(new Set());
  const pendingActionsRef = useRef({}); // Track pending actions for error handling

  // console.log("conversations:", conversations);

  // Hàm gửi tin nhắn
  const sendMessage = useCallback(
    ({ conversationId, data, type, replyToMessageId = null, tempId }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      let finalData;
      if (type === 'text') {
        finalData = { data, type: 'text' };
      } else if (type === 'image' || type === 'file') {
        finalData = data;
      } else {
        console.error('Unsupported message type:', type);
        setActionError('Unsupported message type');
        return false;
      }

      const payload = { conversationId, type, data: finalData, replyToMessageId, tempId };
      socketRef.current.emit('newMessage', payload);
      return true;
    },
    [setActionError]
  );

  // Hàm chỉnh sửa tin nhắn
  const editMessage = useCallback(
    ({ messageId, newData }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      if (typeof messageId !== 'string' || messageId.length < 1) {
        setActionError('Invalid message ID');
        return false;
      }

      if (typeof newData !== 'string' || newData.length < 1) {
        setActionError('Invalid message data');
        return false;
      }

      socketRef.current.emit('editMessage', { messageId, newData });
      return true;
    },
    [setActionError]
  );

  // Hàm xóa tin nhắn
  const deleteMessage = useCallback(
    ({ messageId }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      if (typeof messageId !== 'string' || messageId.length < 1) {
        setActionError('Invalid message ID');
        return false;
      }

      socketRef.current.emit('deleteMessage', { messageId });
      return true;
    },
    [setActionError]
  );

  // Hàm gửi sự kiện typing
  const sendTyping = useCallback(
    (roomId) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      socketRef.current.emit('typing', { roomId, memberId: userId });
      return true;
    },
    [userId, setActionError]
  );

  // Hàm gửi sự kiện stopTyping
  const sendStopTyping = useCallback(
    (roomId) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      socketRef.current.emit('stopTyping', { roomId, memberId: userId });
      return true;
    },
    [userId, setActionError]
  );

  // Fetch conversations
  const fetchConversations = useCallback(
    ({ page = 1, limit = 10 }) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !isConnectedRef.current) {
          reject(new Error('Socket is not connected. Please try again.'));
          return;
        }

        socketRef.current.emit(
          'fetchConversations',
          { userId, page, limit },
          (response) => {
            if (response.success) {
              setRawConversations(response.data); // Lưu dữ liệu thô
              const formattedConversations = processRawRooms(response.data, userId);
              setConversations(formattedConversations); // Cập nhật conversations
              resolve(formattedConversations);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      });
    },
    [userId, setConversations, setRawConversations]
  );

  // Create conversation
  const createConversation = useCallback(
    ({ members, name }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      const actionId = `createConversation-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      pendingActionsRef.current[actionId] = { type: 'createConversation' };
      socketRef.current.emit('createConversation', { members, name });
      return true;
    },
    [setActionError]
  );

  // Add new member
  const addNewMember = useCallback(
    ({ conversationId, newMemberId, role = 'member' }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      const actionId = `addNewMember-${conversationId}-${newMemberId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'addNewMember', conversationId, newMemberId };
      socketRef.current.emit('addNewMember', { conversationId, newMemberId, role });
      return true;
    },
    [setActionError]
  );

  // Remove member
  const removeMember = useCallback(
    ({ conversationId, memberId }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      const actionId = `removeMember-${conversationId}-${memberId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'removeMember', conversationId, memberId };
      socketRef.current.emit('removeMember', { conversationId, memberId });
      return true;
    },
    [setActionError]
  );

  // Leave conversation
  const leaveConversation = useCallback(
    ({ conversationId }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      const actionId = `leaveConversation-${conversationId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'leaveConversation', conversationId };
      socketRef.current.emit('leaveConversation', { conversationId });
      return true;
    },
    [setActionError]
  );

  // Delete conversation by leader
  const deleteConversationByLeader = useCallback(
    ({ conversationId }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      const actionId = `deleteConversationByLeader-${conversationId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'deleteConversationByLeader', conversationId };
      socketRef.current.emit('deleteConversationByLeader', { conversationId });
      return true;
    },
    [setActionError]
  );

  // Update conversation name
  const updateConversationName = useCallback(
    ({ conversationId, newName }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      const actionId = `updateConversationName-${conversationId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'updateConversationName', conversationId, newName };
      socketRef.current.emit('updateConversationName', { conversationId, newName });
      return true;
    },
    [setActionError]
  );

  // Update conversation avatar
  const updateConversationAvatar = useCallback(
    ({ conversationId, newAvatar }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      // Kiểm tra newAvatar trước khi gửi
      if (!newAvatar || newAvatar.length < 1) {
        setActionError('Invalid avatar URL. Please upload a valid image.');
        return false;
      }

      const actionId = `updateConversationAvatar-${conversationId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'updateConversationAvatar', conversationId };
      socketRef.current.emit('updateConversationAvatar', { conversationId, newAvatar });
      return true;
    },
    [setActionError]
  );

  const updateMemberRole = useCallback(
    ({ conversationId, memberId, newRole }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }
      if (!conversationId || !memberId || !newRole) {
        setActionError('Missing required parameters for updating member role.');
        return false;
      }
      const actionId = `updateMemberRole-${conversationId}-${memberId}-${Date.now()}`;
      pendingActionsRef.current[actionId] = { type: 'updateMemberRole', conversationId, memberId, newRole };
      socketRef.current.emit('updateMemberRole', { conversationId, memberId, newRole });
      return true;
    },
    [setActionError]
  );

  useEffect(() => {
    if (!isAuthenticated || !userId || !userInfo) {
      // console.warn(
      //   'useSocket: Not authenticated, missing userId, or missing userInfo. Skipping socket initialization.',
      //   {
      //     isAuthenticated,
      //     userId,
      //     userInfo,
      //   }
      // );
      return;
    }

    socketRef.current = io(SERVER_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userInfo },
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected:', socketRef.current.id);
      isConnectedRef.current = true;
      socketRef.current.emit('setup', { page: 1, limit: 30 });
      if (conversations?.length) {
        conversations.forEach((conv) => {
          const roomId = conv.id;
          if (!joinedRoomsRef.current.has(roomId)) {
            socketRef.current.emit('joinRoom', {roomId});
            joinedRoomsRef.current.add(roomId);
          }
          // console.log('Joined:', roomId);
        });
      }
    });

    socketRef.current.on('connected', () => {
      console.log('Received connected event from server');
    });

    // Handle unauthorized
    socketRef.current.on('unauthorized', () => {
      console.error('Unauthorized socket connection');
      setActionError('Unauthorized connection. Please log in again.');
      isConnectedRef.current = false;
    });

    // Handle errors from server
    socketRef.current.on('error', (error) => {
      console.error('Socket.IO error:', error);
      let errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred';
      setActionError(errorMessage);

      // Revert optimistic updates for pending actions
      Object.keys(pendingActionsRef.current).forEach((actionId) => {
        const action = pendingActionsRef.current[actionId];
        if (action.type === 'addNewMember') {
          setConversations((prevConvs) =>
            prevConvs.map((conv) =>
              conv.id === action.conversationId
                ? {
                    ...conv,
                    detailedMembers: conv.detailedMembers.filter(
                      (m) => m.id !== action.newMemberId
                    ),
                  }
                : conv
            )
          );
          setActiveChat((prev) =>
            prev && prev.id === action.conversationId
              ? {
                  ...prev,
                  detailedMembers: prev.detailedMembers.filter(
                    (m) => m.id !== action.newMemberId
                  ),
                }
              : prev
          );
          setAddUserSearchResults([]);
        } else if (action.type === 'updateConversationName') {
          setConversations((prevConvs) =>
            prevConvs.map((conv) =>
              conv.id === action.conversationId
                ? { ...conv, name: conv.name || '' }
                : conv
            )
          );
          setActiveChat((prev) =>
            prev && prev.id === action.conversationId
              ? { ...prev, name: prev.name || '' }
              : prev
          );
          setIsEditingName(false);
          setEditingGroupName('');
        } else if (action.type === 'removeMember') {
          setConversations((prevConvs) =>
            prevConvs.map((conv) =>
              conv.id === action.conversationId
                ? {
                    ...conv,
                    detailedMembers: conv.detailedMembers.map((m) =>
                      m.id === action.memberId ? { ...m, leftAt: null } : m
                    ),
                  }
                : conv
            )
          );
          setActiveChat((prev) =>
            prev && prev.id === action.conversationId
              ? {
                  ...prev,
                  detailedMembers: prev.detailedMembers.map((m) =>
                    m.id === action.memberId ? { ...m, leftAt: null } : m
                  ),
                }
              : prev
          );
        } else if (action.type === 'leaveConversation' || action.type === 'deleteConversationByLeader') {
          setConversations((prevConvs) => [
            ...prevConvs,
            ...(conversations.filter((conv) => conv.id === action.conversationId)),
          ]);
          setActiveChat((prev) => prev); // Restore activeChat if needed
        } else if (action.type === 'createConversation') {
          alert('Conversation already exists between these two users');
        }
        delete pendingActionsRef.current[actionId];
      });
    });

    socketRef.current.on('updatedMemberRole', ({ userId: memberId, conversationId, newRole }) => {
      setRawConversations((prevRaw) =>
        prevRaw.map((conv) =>
          conv._id === conversationId
            ? {
                ...conv,
                members: conv.members.map((m) =>
                  (typeof m.id === 'object' ? m.id._id : m.id) === memberId
                    ? { ...m, role: newRole }
                    : m
                ),
              }
            : conv
        )
      );
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                members: conv.members
                  ? conv.members.map((m) =>
                      (typeof m.id === 'object' ? m.id._id : m.id) === memberId
                        ? { ...m, role: newRole }
                        : m
                    )
                  : conv.members,
                detailedMembers: conv.detailedMembers
                  ? conv.detailedMembers.map((m) =>
                      m.id === memberId ? { ...m, role: newRole } : m
                    )
                  : conv.detailedMembers,
              }
            : conv
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === conversationId
          ? {
              ...prev,
              members: prev.members
                ? prev.members.map((m) =>
                    (typeof m.id === 'object' ? m.id._id : m.id) === memberId
                      ? { ...m, role: newRole }
                      : m
                  )
                : prev.members,
              detailedMembers: prev.detailedMembers
                ? prev.detailedMembers.map((m) =>
                    m.id === memberId ? { ...m, role: newRole } : m
                  )
                : prev.detailedMembers,
            }
          : prev
      );
    });

    // Xử lý tin nhắn mới (non-sender clients)
    socketRef.current.on('receiveMessage', async (receivedMessage) => {
      console.log('receiveMessage:', receivedMessage);
      const msg = receivedMessage.message;
      if (msg.conversationId && msg.conversationId === activeChatId) {
        let formattedMessage = formatReceivedMessage(msg, userId);

        // Nếu thiếu thông tin sender, fetch thêm bằng getUserDetailsApi
        if (
          (!formattedMessage.senderName || !formattedMessage.senderAvatar) &&
          msg.senderId && typeof msg.senderId === 'string'
        ) {
          try {
            const user = await getUserDetailsApi(msg.senderId);
            formattedMessage = {
              ...formattedMessage,
              senderName: user.fullName || user.email || 'Unknown User',
              senderAvatar: user.avatar || null,
              sender: user,
            };
          } catch (err) {
            // fallback giữ nguyên
          }
        }

        setMessages((prevMessages) => {
          const isDuplicate = prevMessages.some(
            (msgItem) => msgItem.id === msg._id || msgItem.id === receivedMessage.tempId
          );
          if (isDuplicate) {
            return prevMessages.map((msgItem) =>
              msgItem.id === receivedMessage.tempId
                ? { ...formattedMessage, sender: msgItem.sender }
                : msgItem
            );
          }
          return [...prevMessages, formattedMessage];
        });
      }
      setConversations((prevConvs) =>
        updateConversationsListLatestMessage(prevConvs, msg.conversationId, msg)
      );
    });

    // Xử lý tin nhắn được chỉnh sửa (non-sender clients)
    socketRef.current.on('editedMessage', (updatedMessage) => {
      console.log('editedMessage:', updatedMessage);
      if (updatedMessage.conversationId && updatedMessage.conversationId === activeChatId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === updatedMessage._id
              ? {
                  ...msg,
                  content: updatedMessage.content,
                  isEdited: true,
                  lastUpdated: updatedMessage.last_updated,
                }
              : msg
          )
        );
      }
      setConversations((prevConvs) =>
        updateConversationsListLatestMessage(prevConvs, updatedMessage.conversationId, updatedMessage)
      );
    });

    // Xử lý tin nhắn bị xóa (non-sender clients)
    socketRef.current.on('deletedMessage', (deletedMessage) => {
      console.log('deletedMessage:', deletedMessage);
      if (deletedMessage.conversationId && deletedMessage.conversationId === activeChatId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === deletedMessage._id
              ? { ...msg, isDeleted: true }
              : msg
          )
        );
      }
      setConversations((prevConvs) =>
        updateConversationsListLatestMessage(prevConvs, deletedMessage.conversationId, deletedMessage)
      );
    });

    // Xử lý sự kiện typing (non-sender clients)
    socketRef.current.on('typing', (memberId) => {
      console.log(`User ${memberId} is typing in room ${activeChatId}`);
    });

    // Xử lý sự kiện stopTyping (non-sender clients)
    socketRef.current.on('stopTyping', (memberId) => {
      console.log(`User ${memberId} stopped typing in room ${activeChatId}`);
    });

    socketRef.current.on('newConversation', (newConversation) => {
      console.log('newConversation:', newConversation);

      // Đưa qua processRawRooms để lấy conversation đã format
      const formattedConversation = processRawRooms([newConversation], userId)[0];

      setRawConversations((prevRaw) => {
        const existed = prevRaw.some((conv) => conv._id === newConversation._id);
        if (existed) {
          // Thay thế conversation cũ bằng cái mới
          return prevRaw.map((conv) =>
            conv._id === newConversation._id ? newConversation : conv
          );
        }
        return [newConversation, ...prevRaw];
      });

      setConversations((prevConvs) => {
        const existed = prevConvs.some((conv) => conv.id === newConversation._id);
        if (existed) {
          // Thay thế conversation cũ bằng cái mới đã format
          return prevConvs.map((conv) =>
            conv.id === newConversation._id ? formattedConversation : conv
          );
        }
        return [formattedConversation, ...prevConvs];
      });

      socketRef.current.emit('joinRoom', { roomId: newConversation._id.toString() });
      joinedRoomsRef.current.add(newConversation._id.toString());
    });

    socketRef.current.on('addedNewMember', (updatedConversation) => {
      console.log('addedNewMember:', updatedConversation);
      setRawConversations((prevRaw) =>
        prevRaw.map((conv) =>
          conv._id === updatedConversation._id ? updatedConversation : conv
        )
      );
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === updatedConversation._id
            ? processRawRooms([updatedConversation], userId)[0]
            : conv
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === updatedConversation._id
          ? processRawRooms([updatedConversation], userId)[0]
          : prev
      );
      setAddUserSearchResults([]);
    });

    socketRef.current.on('removedMember', (updatedConversation) => {
      console.log('removedMember:', updatedConversation);
      setRawConversations((prevRaw) =>
        prevRaw.map((conv) =>
          conv._id === updatedConversation._id ? updatedConversation : conv
        )
      );
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === updatedConversation._id
            ? processRawRooms([updatedConversation], userId)[0]
            : conv
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === updatedConversation._id
          ? processRawRooms([updatedConversation], userId)[0]
          : prev
      );
    });

    socketRef.current.on('leftConversation', (data) => {
      const { conversation, userId: leavingUserId } = data;
      const conversationId = conversation?._id || conversation?.id;
      console.log('leftConversation received:', data);
      console.log('Current userId:', userId);

      // Hàm kiểm tra member.id có phải là user rời nhóm không
      const isSameUser = (member, leavingUserId) => {
        if (typeof member.id === 'object' && member.id._id) {
          return member.id._id === leavingUserId;
        }
        return member.id === leavingUserId;
      };

      if (leavingUserId === userId) {
        // Nếu là chính mình rời nhóm, xóa khỏi danh sách
        setRawConversations((prevRaw) =>
          prevRaw.filter((conv) => conv._id !== conversationId)
        );
        setConversations((prevConvs) =>
          prevConvs.filter((conv) => conv.id !== conversationId)
        );
        setActiveChat((prev) => (prev && prev.id === conversationId ? null : prev));
      } else {
        // Thành viên khác rời nhóm, cập nhật lại danh sách thành viên bằng conversation mới nhất từ server
        setRawConversations((prevRaw) =>
          prevRaw.map((conv) =>
            conv._id === conversationId ? conversation : conv
          )
        );
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv.id === conversationId
              ? processRawRooms([conversation], userId)[0]
              : conv
          )
        );
        setActiveChat((prev) =>
          prev && prev.id === conversationId
            ? processRawRooms([conversation], userId)[0]
            : prev
        );
      }
    });

    socketRef.current.on('deletedConversationByLeader', (data) => {
      const conversation = data.conversation;
      const conversationId = conversation?._id || conversation?.id;
      console.log('deletedConversationByLeader:', conversation);

      setRawConversations((prevRaw) =>
        prevRaw.filter((conv) => conv._id !== conversationId)
      );
      setConversations((prevConvs) =>
        prevConvs.filter((conv) => conv.id !== conversationId)
      );
      setActiveChat((prev) => (prev && prev.id === conversationId ? null : prev));
    });

    socketRef.current.on('updatedConversationName', (updatedConversation) => {
      console.log('updatedConversationName:', updatedConversation);
      setRawConversations((prevRaw) =>
        prevRaw.map((conv) =>
          conv._id === updatedConversation._id ? updatedConversation : conv
        )
      );
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === updatedConversation._id
            ? processRawRooms([updatedConversation], userId)[0]
            : conv
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === updatedConversation._id
          ? processRawRooms([updatedConversation], userId)[0]
          : prev
      );
      setIsEditingName(false);
      setEditingGroupName('');
    });

    socketRef.current.on('updatedConversationAvatar', (updatedConversation) => {
      console.log('updatedConversationAvatar:', updatedConversation);
      setRawConversations((prevRaw) =>
        prevRaw.map((conv) =>
          conv._id === updatedConversation._id ? updatedConversation : conv
        )
      );
      setConversations((prevConvs) =>
        prevConvs.map((conv) =>
          conv.id === updatedConversation._id
            ? processRawRooms([updatedConversation], userId)[0]
            : conv
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === updatedConversation._id
          ? processRawRooms([updatedConversation], userId)[0]
          : prev
      );
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      setActionError('Failed to connect to real-time server');
      isConnectedRef.current = false;
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      isConnectedRef.current = false;
      joinedRoomsRef.current.clear();
      pendingActionsRef.current = {};
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('connected');
        socketRef.current.off('unauthorized');
        socketRef.current.off('error');
        socketRef.current.off('receiveMessage');
        socketRef.current.off('editedMessage');
        socketRef.current.off('deletedMessage');
        socketRef.current.off('typing');
        socketRef.current.off('stopTyping');
        socketRef.current.off('createdConversation');
        socketRef.current.off('addedNewMember');
        socketRef.current.off('removedMember');
        socketRef.current.off('leftConversation');
        socketRef.current.off('deletedConversationByLeader');
        socketRef.current.off('updatedConversationName');
        socketRef.current.off('updatedConversationAvatar');
        socketRef.current.off('connect_error');
        socketRef.current.off('disconnect');
        socketRef.current.disconnect();
        isConnectedRef.current = false;
        joinedRoomsRef.current.clear();
        pendingActionsRef.current = {};
      }
    };
  }, [
    isAuthenticated,
    userId,
    userInfo,
    activeChatId,
    setMessages,
    setConversations,
    setActionError,
    conversations,
    setActiveChat,
    setIsEditingName,
    setEditingGroupName,
    setAddUserSearchResults,
  ]);

  useEffect(() => {
    if (socketRef.current && isConnectedRef.current && conversations?.length) {
      conversations.forEach((conv) => {
        const roomId = conv.id;
        console.log('Joining room:', roomId);
        if (!joinedRoomsRef.current.has(roomId)) {
          socketRef.current.emit('joinRoom', {roomId});
          joinedRoomsRef.current.add(roomId);
        }
      });
    }
  }, [conversations]);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    sendStopTyping,
    fetchConversations,
    createConversation,
    addNewMember,
    removeMember,
    leaveConversation,
    deleteConversationByLeader,
    updateConversationName,
    updateConversationAvatar,
    updateMemberRole,
  };
};