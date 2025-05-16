import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { formatReceivedMessage, updateConversationsListLatestMessage } from './chatService';

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
}) => {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const joinedRoomsRef = useRef(new Set());

  // Hàm gửi tin nhắn
  const sendMessage = useCallback(
    ({ conversationId, data, type, replyToMessageId = null }) => {
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

      const payload = { conversationId, type, data: finalData, replyToMessageId };
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

  useEffect(() => {
    if (!isAuthenticated || !userId || !userInfo) {
      console.warn('useSocket: Not authenticated, missing userId, or missing userInfo. Skipping socket initialization.', {
        isAuthenticated,
        userId,
        userInfo,
      });
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
            socketRef.current.emit('joinRoom', roomId);
            joinedRoomsRef.current.add(roomId);
            console.log(`Joined room (defaultNamespace): ${roomId}`);
          }
        });
      }
    });

    socketRef.current.on('connected', () => {
      console.log('Received connected event from server');
    });

    socketRef.current.on('receiveMessage', (receivedMessage) => {
      console.log("receivedMessage: ", receivedMessage);
      if (receivedMessage.conversationId && receivedMessage.conversationId === activeChatId) {
        setMessages((prevMessages) => {
          const isDuplicate = prevMessages.some(
            (msg) => msg.id === receivedMessage._id || msg.id === receivedMessage.tempId
          );
          if (isDuplicate) {
            return prevMessages.map((msg) =>
              msg.id === receivedMessage.tempId
                ? { ...formatReceivedMessage(receivedMessage, userId), sender: msg.sender }
                : msg
            );
          }
          const formattedMessage = formatReceivedMessage(receivedMessage, userId);
          return [...prevMessages, formattedMessage];
        });
      }
      setConversations((prevConvs) =>
        updateConversationsListLatestMessage (prevConvs, receivedMessage.conversationId, receivedMessage)
      );
    });

    // Xử lý tin nhắn được chỉnh sửa
    socketRef.current.on('editedMessage', (updatedMessage) => {
      console.log("updated: ", updatedMessage);
      if (updatedMessage.conversationId && updatedMessage.conversationId === activeChatId) {
        setMessages((prevMessages) =>
          prevMessages.map(msg =>
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

    // Xử lý tin nhắn bị xóa
    socketRef.current.on('deletedMessage', (deletedMessage) => {
      console.log("deletedMessage: ", deletedMessage);
      if (deletedMessage.conversationId && deletedMessage.conversationId === activeChatId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => 
            msg.id == deletedMessage._id
              ? {
                  ...msg,
                  isDeleted: true,
                }
              : msg
          )
        );
      }
      // Cập nhật danh sách cuộc hội thoại nếu tin nhắn bị xóa là tin nhắn mới nhất
      setConversations((prevConvs) =>
        updateConversationsListLatestMessage(prevConvs, deletedMessage.conversationId, deletedMessage)
      );
    });

    // Xử lý sự kiện typing từ server
    socketRef.current.on('typing', (memberId) => {
      console.log(`User ${memberId} is typing in room ${activeChatId}`);
      // Bạn có thể cập nhật trạng thái UI, ví dụ: hiển thị "User is typing..."
      // Ví dụ: setTypingUsers((prev) => [...prev, memberId]);
    });

    // Xử lý sự kiện stopTyping từ server
    socketRef.current.on('stopTyping', (memberId) => {
      console.log(`User ${memberId} stopped typing in room ${activeChatId}`);
      // Bạn có thể cập nhật trạng thái UI, ví dụ: xóa "User is typing..."
      // Ví dụ: setTypingUsers((prev) => prev.filter((id) => id !== memberId));
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket.IO error:', error);
      setActionError(error.message || 'Real-time connection error');
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
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        isConnectedRef.current = false;
        joinedRoomsRef.current.clear();
      }
    };
  }, [isAuthenticated, userId, userInfo, activeChatId, setMessages, setConversations, setActionError]);

  useEffect(() => {
    if (socketRef.current && isConnectedRef.current && conversations?.length) {
      conversations.forEach((conv) => {
        const roomId = conv.id;
        if (!joinedRoomsRef.current.has(roomId)) {
          socketRef.current.emit('joinRoom', roomId);
          joinedRoomsRef.current.add(roomId);
          console.log(`Joined room (defaultNamespace, on conversations change): ${roomId}`);
        }
      });
    }
  }, [conversations]);

  return {
    socket: socketRef.current,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    sendStopTyping,
    isConnected: isConnectedRef.current,
  };
};