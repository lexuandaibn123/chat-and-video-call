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
  const socketRef = useRef(null);
  const videoCallSocketRef = useRef(null);
  const isConnectedRef = useRef(false);
  const isVideoCallConnectedRef = useRef(false);
  const joinedRoomsRef = useRef(new Set());

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

    videoCallSocketRef.current = io(`${SERVER_URL}/video-call`, {
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

    socketRef.current.on('receiveMessage', (receivedMessage) => {
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

    socketRef.current.on('callStarted', (data) => {
      console.log('Received callStarted event:', data);
      if (data.roomId === activeChatId) {
        setCallInvite(data);
        alert(`${data.username} đã bắt đầu cuộc gọi video trong phòng ${data.roomId}. Tham gia hay từ chối?`);
      }
    });

    socketRef.current.on('callEnded', (data) => {
      console.log('Received callEnded event:', data);
      if (data.roomId === activeChatId) {
        setCallInvite(null);
        alert('Cuộc gọi đã kết thúc');
      }
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

    videoCallSocketRef.current.on('connect', () => {
      console.log('Video Call Socket.IO connected:', videoCallSocketRef.current.id);
      isVideoCallConnectedRef.current = true;
    });

    videoCallSocketRef.current.on('unauthorized', () => {
      console.error('Video Call Socket: Unauthorized');
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
      }
      if (videoCallSocketRef.current) {
        videoCallSocketRef.current.disconnect();
        isVideoCallConnectedRef.current = false;
      }
    };
  }, [isAuthenticated, userId, userInfo, activeChatId, setMessages, setConversations, setActionError, setCallInvite]);

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