import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { formatReceivedMessage, updateConversationsListLatestMessage } from './chatService';

// Lấy URL từ biến môi trường
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

export const useSocket = ({
  isAuthenticated,
  userId,
  activeChatId,
  setMessages,
  setConversations,
  setActionError,
}) => {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false); // Theo dõi trạng thái kết nối

  // Hàm gửi tin nhắn
  const sendMessage = useCallback(
    ({ conversationId, data, type, replyToMessageId = null }) => {
      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      socketRef.current.emit('newMessage', {
        conversationId,
        type,
        data: {
          data,
          type,
        },
        replyToMessageId,
      });
      return true;
    },
    [setActionError]
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      console.warn('useSocket: Not authenticated or missing userId. Skipping socket initialization.');
      return;
    }

    // Khởi tạo socket
    socketRef.current = io(SERVER_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

      // Kiểm tra activeChatId trước khi cập nhật messages
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

      // Cập nhật danh sách conversations bất kể activeChatId
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
  }, [isAuthenticated, userId, activeChatId, setMessages, setConversations, setActionError]);

  // Tham gia phòng chat khi activeChatId thay đổi
  useEffect(() => {
    if (socketRef.current && activeChatId && isConnectedRef.current) {
      socketRef.current.emit('join', activeChatId);
      console.log(`Socket joined room ${activeChatId}`);
    }
  }, [activeChatId]);

  return { socket: socketRef.current, sendMessage, isConnected: isConnectedRef.current };
};