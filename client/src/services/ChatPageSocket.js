import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { formatReceivedMessage, updateConversationsListLatestMessage } from './chatService';

// Lấy URL từ biến môi trường
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const useSocket = ({
  isAuthenticated,
  userId,
  userInfo, // Thêm userInfo để truyền vào auth
  activeChatId,
  setMessages,
  setConversations,
  setActionError,
}) => {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);

  // Hàm gửi tin nhắn
  const sendMessage = useCallback(
    ({ conversationId, data, type, replyToMessageId = null }) => {
      console.log("Original data:", data);

      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      let finalData;
      if (type === "text") {
        finalData = {
          data: data,
          type: "text",
        };
      } else if (type === "image" || type === "file") {
        finalData = data;
      } else {
        console.error("Unsupported message type:", type);
        setActionError('Unsupported message type');
        return false;
      }

      const payload = {
        conversationId,
        type,
        data: finalData,
        replyToMessageId,
      };

      console.log("Payload to send:", payload);
      socketRef.current.emit('newMessage', payload);
      return true;
    },
    [setActionError]
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

    // Khởi tạo socket
    socketRef.current = io(SERVER_URL, {
      withCredentials: true, // Đảm bảo gửi cookie session
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userInfo }, // Truyền userInfo vào auth
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
      isConnectedRef.current = true;
      socketRef.current.emit('setup', { page: 1, limit: 30 });
    });

    socketRef.current.on('connected', () => {
      console.log('Socket.IO setup confirmed by server');
    });

    socketRef.current.on('unauthorized', () => {
      console.error('Unauthorized: Session invalid or missing');
      setActionError('Unauthorized: Please log in again');
      socketRef.current.disconnect();
      isConnectedRef.current = false;
    });

    socketRef.current.on('receiveMessage', (receivedMessage) => {
      console.log('Received real-time message:', receivedMessage);

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
        updateConversationsListLatestMessage(prevConvs, receivedMessage.conversationId, receivedMessage)
      );
    });

    socketRef.current.on('typing', (memberId) => {
      console.log(`${memberId} is typing`);
    });

    socketRef.current.on('stopTyping', (memberId) => {
      console.log(`${memberId} stopped typing`);
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
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        isConnectedRef.current = false;
        console.log('Socket.IO connection closed');
      }
    };
  }, [isAuthenticated, userId, userInfo, activeChatId, setMessages, setConversations, setActionError]);

  // Tham gia phòng chat khi activeChatId thay đổi
  useEffect(() => {
    if (socketRef.current && activeChatId && isConnectedRef.current) {
      socketRef.current.emit('join', activeChatId);
      console.log(`Socket joined room ${activeChatId}`);
    }
  }, [activeChatId]);

  return { socket: socketRef.current, sendMessage, isConnected: isConnectedRef.current };
};