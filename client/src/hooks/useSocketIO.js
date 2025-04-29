import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { getMessagesByRoomIdApi } from '../api/conversations';
import { processRawMessages, formatReceivedMessage } from '../services/chatService';

const SOCKET_ADMIN_URL = `${import.meta.env.VITE_SERVER_URL}/admin`;

// Ensure the hook is only called in a React context
if (typeof useState !== 'function' || typeof useEffect !== 'function' || typeof useRef !== 'function') {
  throw new Error('useSocketIO: Hooks can only be called inside a React functional component or another hook.');
}

const useSocketIO = (conversationId, userId) => {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [socketError, setSocketError] = useState(null);
  const socketRef = useRef(null);
  const messageQueueRef = useRef(new Map());

  // Log initialization
  useEffect(() => {
    console.log('useSocketIO initialized with:', { conversationId, userId });
  }, [conversationId, userId]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!userId || !conversationId) {
      console.warn('useSocketIO: Missing userId or conversationId, skipping socket initialization.');
      setMessages([]);
      setIsSocketConnected(false);
      return;
    }

    console.log('Initializing Socket.IO connection for user:', userId, 'conversation:', conversationId);

    const token = localStorage.getItem('authToken') || 'your-auth-token';
    const socket = io(SOCKET_ADMIN_URL, {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
      setIsSocketConnected(true);
      setSocketError(null);
      socket.emit('joinConversation', { conversationId, userId });
      console.log('Joined conversation:', conversationId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setIsSocketConnected(false);
      setSocketError('Failed to connect to chat server. Please try again later.');
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('receiveMessage', (message) => {
      console.log('Received message via Socket.IO:', message);
      const formattedMessage = formatReceivedMessage(message, userId);
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === formattedMessage.id)) {
          return prev;
        }
        return [...prev, formattedMessage];
      });

      const tempId = message.tempId;
      if (tempId && messageQueueRef.current.has(tempId)) {
        console.log('Acknowledging message with tempId:', tempId, 'message:', message);
        const { resolve } = messageQueueRef.current.get(tempId);
        resolve(message);
        messageQueueRef.current.delete(tempId);
      }
    });

    socket.on('messageError', (error) => {
      console.error('Socket.IO message error:', error);
      setSocketError(error.message || 'Failed to send message.');
    });

    return () => {
      console.log('Cleaning up Socket.IO connection for user:', userId, 'conversation:', conversationId);
      if (socketRef.current) {
        socketRef.current.emit('leaveConversation', { conversationId, userId });
        socketRef.current.off('connect');
        socketRef.current.off('connect_error');
        socketRef.current.off('disconnect');
        socketRef.current.off('receiveMessage');
        socketRef.current.off('messageError');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsSocketConnected(false);
      setMessages([]);
      messageQueueRef.current.clear();
    };
  }, [userId, conversationId]);

  // Fetch initial messages
  useEffect(() => {
    if (!conversationId || !userId || !isSocketConnected) return;

    const fetchMessages = async () => {
      try {
        console.log('Fetching initial messages for conversation:', conversationId);
        const response = await getMessagesByRoomIdApi({ conversationId, limit: 100, skip: 0 });
        const formattedMessages = processRawMessages(response, userId);
        setMessages(formattedMessages);
      } catch (err) {
        console.error('Error fetching initial messages:', err);
        setSocketError(err.message || 'Failed to load message history.');
      }
    };

    fetchMessages();
  }, [conversationId, userId, isSocketConnected]);

  // Send text message with retry logic
  const sendTextMessage = useCallback(
    async (messagePayload, tempId, retryCount = 0) => {
      if (!socketRef.current || !isSocketConnected) {
        throw new Error('Socket is not connected.');
      }

      const maxRetries = 2;
      try {
        return await new Promise((resolve, reject) => {
          console.log(`Sending text message via Socket.IO (attempt ${retryCount + 1}):`, messagePayload);
          messageQueueRef.current.set(tempId, { resolve, reject });
          socketRef.current.emit('sendMessage', { ...messagePayload, tempId }, (ack) => {
            console.log('Received acknowledgment for tempId:', tempId, 'ack:', ack);
            if (ack && ack.success) {
              console.log('Message sent successfully, awaiting server confirmation:', tempId);
            } else {
              console.error('Message send failed:', ack?.error);
              messageQueueRef.current.delete(tempId);
              reject(new Error(ack?.error || 'Failed to send message.'));
            }
          });

          setTimeout(() => {
            if (messageQueueRef.current.has(tempId)) {
              console.error('Message send timeout for tempId:', tempId);
              messageQueueRef.current.delete(tempId);
              if (retryCount < maxRetries) {
                console.log(`Retrying send for tempId: ${tempId}, attempt ${retryCount + 1}`);
                sendTextMessage(messagePayload, tempId, retryCount + 1).then(resolve).catch(reject);
              } else {
                reject(new Error('Message send timed out after retries.'));
              }
            }
          }, 15000);
        });
      } catch (err) {
        throw err;
      }
    },
    [isSocketConnected]
  );

  // Send file message with retry logic
  const sendFileMessage = useCallback(
    async (messagePayload, tempId, retryCount = 0) => {
      if (!socketRef.current || !isSocketConnected) {
        throw new Error('Socket is not connected.');
      }

      const maxRetries = 2;
      try {
        return await new Promise((resolve, reject) => {
          console.log(`Sending file message via Socket.IO (attempt ${retryCount + 1}):`, messagePayload);
          messageQueueRef.current.set(tempId, { resolve, reject });
          socketRef.current.emit('sendMessage', { ...messagePayload, tempId }, (ack) => {
            console.log('Received acknowledgment for tempId:', tempId, 'ack:', ack);
            if (ack && ack.success) {
              console.log('File message sent successfully, awaiting server confirmation:', tempId);
            } else {
              console.error('File message send failed:', ack?.error);
              messageQueueRef.current.delete(tempId);
              reject(new Error(ack?.error || 'Failed to send file message.'));
            }
          });

          setTimeout(() => {
            if (messageQueueRef.current.has(tempId)) {
              console.error('File message send timeout for tempId:', tempId);
              messageQueueRef.current.delete(tempId);
              if (retryCount < maxRetries) {
                console.log(`Retrying send for tempId: ${tempId}, attempt ${retryCount + 1}`);
                sendFileMessage(messagePayload, tempId, retryCount + 1).then(resolve).catch(reject);
              } else {
                reject(new Error('File message send timed out after retries.'));
              }
            }
          }, 15000);
        });
      } catch (err) {
        throw err;
      }
    },
    [isSocketConnected]
  );

  return {
    isSocketConnected,
    messages,
    socketError,
    sendTextMessage,
    sendFileMessage,
  };
};

export default useSocketIO;