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
  setCallInvite,
}) => {
  const socketRef = useRef(null); // Socket chính (defaultNamespace)
  const videoCallSocketRef = useRef(null); // Socket cho namespace /video-call
  const isConnectedRef = useRef(false); // Trạng thái kết nối của socket chính
  const isVideoCallConnectedRef = useRef(false); // Trạng thái kết nối của socket /video-call
  const joinedRoomsRef = useRef(new Set()); // Theo dõi các room đã tham gia trên socket chính

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

    // Khởi tạo socket chính (defaultNamespace)
    socketRef.current = io(SERVER_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userInfo },
    });

    // Khởi tạo socket cho namespace /video-call
    videoCallSocketRef.current = io(`${SERVER_URL}/video-call`, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { userInfo },
    });

    // Xử lý kết nối socket chính
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
      joinedRoomsRef.current.clear();
    });

    // Xử lý kết nối socket /video-call
    videoCallSocketRef.current.on('connect', () => {
      console.log('Video Call Socket.IO connected:', videoCallSocketRef.current.id);
      isVideoCallConnectedRef.current = true;
      // Không gọi joinRoom ở đây, để VideoCall.jsx xử lý
    });

    videoCallSocketRef.current.on('callStarted', (data) => {
      console.log('Video Call Socket: Received callStarted event:', data);
      if (data.roomId === activeChatId) {
        setCallInvite(data);
      } else {
        console.warn('callStarted roomId does not match activeChatId:', {
          receivedRoomId: data.roomId,
          activeChatId,
        });
      }
    });

    videoCallSocketRef.current.on('callEnded', (data) => {
      console.log('Video Call Socket: Received callEnded event:', data);
      if (data.roomId === activeChatId) {
        setCallInvite(null);
        alert('Cuộc gọi đã kết thúc');
      }
    });

    videoCallSocketRef.current.on('userLeft', (data) => {
      console.log('Video Call Socket: Received userLeft event:', data);
      if (data.id && activeChatId) {
        console.log(`User ${data.id} left room ${activeChatId}`);
      }
    });

    videoCallSocketRef.current.on('unauthorized', () => {
      console.error('Video Call Socket: Unauthorized: Session invalid or missing');
      setActionError('Unauthorized: Please log in again');
      videoCallSocketRef.current.disconnect();
      isVideoCallConnectedRef.current = false;
    });

    videoCallSocketRef.current.on('error', (error) => {
      console.error('Video Call Socket.IO error:', error);
      setActionError(error.message || 'Video call connection error');
    });

    videoCallSocketRef.current.on('connect_error', (err) => {
      console.error('Video Call Socket.IO connection error:', err);
      setActionError('Failed to connect to video call server');
      isVideoCallConnectedRef.current = false;
    });

    videoCallSocketRef.current.on('disconnect', () => {
      console.log('Video Call Socket.IO disconnected');
      isVideoCallConnectedRef.current = false;
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        isConnectedRef.current = false;
        joinedRoomsRef.current.clear();
        console.log('Socket.IO connection closed');
      }
      if (videoCallSocketRef.current) {
        videoCallSocketRef.current.disconnect();
        isVideoCallConnectedRef.current = false;
        console.log('Video Call Socket.IO connection closed');
      }
    };
  }, [isAuthenticated, userId, userInfo, activeChatId, setMessages, setConversations, setActionError, setCallInvite]);

  // Tham gia room mới trên socket chính khi conversations thay đổi
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
    videoCallSocket: videoCallSocketRef.current,
    sendMessage,
    isConnected: isConnectedRef.current,
    isVideoCallConnected: isVideoCallConnectedRef.current,
  };
};