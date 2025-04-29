import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { formatReceivedMessage, updateConversationsListLatestMessage } from './chatService';

export const useSocket = ({
  isAuthenticated,
  userId,
  activeChatId,
  setMessages,
  setConversations,
  setActionError,
}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    // Initialize Socket.IO connection to admin namespace
    socketRef.current = io('http://localhost:8080/admin', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle connection
    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected to admin namespace');
      socketRef.current.emit('setup');
    });

    // Handle setup confirmation
    socketRef.current.on('connected', () => {
      console.log('Socket.IO setup confirmed by server');
    });

    // Handle incoming messages
    socketRef.current.on('message', (receivedMessage) => {
      console.log('Received real-time message:', receivedMessage);

      if (receivedMessage.conversationId === activeChatId) {
        setMessages((prevMessages) => {
          const isDuplicate = prevMessages.some(
            (msg) => msg.id === receivedMessage._id || msg.id === receivedMessage.tempId
          );
          if (isDuplicate) {
            // Update existing optimistic message
            return prevMessages.map((msg) =>
              msg.id === receivedMessage.tempId
                ? { ...formatReceivedMessage(receivedMessage, userId), sender: msg.sender }
                : msg
            );
          }
          // Add new message
          const formattedMessage = formatReceivedMessage(receivedMessage, userId);
          return [...prevMessages, formattedMessage];
        });

        // Update conversations list
        setConversations((prevConvs) =>
          updateConversationsListLatestMessage(prevConvs, receivedMessage.conversationId, receivedMessage)
        );
      }
    });

    // Handle socket errors
    socketRef.current.on('error', (error) => {
      console.error('Socket.IO error:', error);
      setActionError(error.message || 'Real-time connection error');
    });

    // Handle connection errors
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      setActionError('Failed to connect to real-time server');
    });

    // Handle disconnection
    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        console.log('Socket.IO connection closed');
      }
    };
  }, [isAuthenticated, userId, activeChatId, setMessages, setConversations, setActionError]);

  // Join conversation room when activeChatId changes
  useEffect(() => {
    if (socketRef.current && activeChatId) {
      socketRef.current.emit('join', activeChatId);
      console.log(`Socket joined room ${activeChatId}`);
    }
  }, [activeChatId]);

  return socketRef.current;
};