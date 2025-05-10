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
  const joinedRoomsRef = useRef(new Set()); // Theo dõi các room đã tham gia để tránh trùng lặp

  const sendMessage = useCallback(
    ({ conversationId, data, type, replyToMessageId = null }) => {
      console.log('Original data:', data);

      if (!socketRef.current || !isConnectedRef.current) {
        setActionError('Socket is not connected. Please try again.');
        return false;
      }

      let finalData;
      if (type === 'text') {
        finalData = {
          data: data,
          type: 'text',
        };
      } else if (type === 'image' || type === 'file') {
        finalData = data;
      } else {
        console.error('Unsupported message type:', type);
        setActionError('Unsupported message type');
        return false;
      }

      const payload = {
        conversationId,
        type,
        data: finalData,
        replyToMessageId,
      };

      console.log('Payload to send:', payload);
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
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userInfo },
    });

    // Xử lý kết nối
    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected:', socketRef.current.id);
      isConnectedRef.current = true;

      // Tham gia các room dựa trên conversations
      if (conversations?.length) {
        conversations.forEach((conv) => {
          const roomId = conv.id;
          if (!joinedRoomsRef.current.has(roomId)) {
            socketRef.current.emit('joinRoom', roomId);
            joinedRoomsRef.current.add(roomId);
            console.log(`Joined room: ${roomId}`);
          }
        });
      }

      // Emit setup (nếu cần thiết, tùy thuộc vào yêu cầu của bạn)
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
      joinedRoomsRef.current.clear(); // Xóa danh sách room đã tham gia khi ngắt kết nối
    });

    // Cleanup khi component unmount hoặc dependencies thay đổi
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        isConnectedRef.current = false;
        joinedRoomsRef.current.clear();
        console.log('Socket.IO connection closed');
      }
    };
  }, [isAuthenticated, userId, userInfo, setMessages, setConversations, setActionError]);

  // Xử lý khi conversations thay đổi: tham gia các room mới
  useEffect(() => {
    if (socketRef.current && isConnectedRef.current && conversations?.length) {
      conversations.forEach((conv) => {
        const roomId = conv.id;
        if (!joinedRoomsRef.current.has(roomId)) {
          socketRef.current.emit('joinRoom', roomId);
          joinedRoomsRef.current.add(roomId);
          console.log(`Joined room (on conversations change): ${roomId}`);
        }
      });
    }
  }, [conversations]);

  return { socket: socketRef.current, sendMessage, isConnected: isConnectedRef.current };
};