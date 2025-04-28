import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import { getMessagesByRoomIdApi } from '../api/conversations';
import { processRawMessages, formatReceivedMessage } from '../services/chatService';

// Ensure the hook is only called in a React context
if (typeof useState !== 'function' || typeof useEffect !== 'function' || typeof useRef !== 'function') {
  throw new Error(
    'useChatSocket: Hooks can only be called inside a React functional component or another hook.'
  );
}

const useSocketIO = (conversationId, userId) => {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [socketError, setSocketError] = useState(null);
  const socketRef = useRef(null);
  const messageQueueRef = useRef(new Map()); // Store tempId -> callback mappings

  // Log for debugging
  useEffect(() => {
    console.log('useChatSocket initialized with:', { conversationId, userId });
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!userId || !conversationId) {
      console.warn('useChatSocket: Missing userId or conversationId, skipping socket initialization.');
      setMessages([]);
      setIsSocketConnected(false);
      return;
    }

    console.log('Initializing Socket.IO connection for user:', userId, 'and conversation:', conversationId);

    // Assume token is stored or retrieved from auth context/storage
    const token = localStorage.getItem('authToken') || 'your-auth-token'; // Replace with actual token retrieval
    const socket = io('http://localhost:8080', {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Handle connection
    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
      setIsSocketConnected(true);
      setSocketError(null);
      socket.emit('joinConversation', { conversationId, userId });
    });

    // Handle connection errors
    socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      setIsSocketConnected(false);
      setSocketError('Failed to connect to chat server. Please try again later.');
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsSocketConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect(); // Try to reconnect manually
      }
    });

    // Handle incoming messages
    socket.on('receiveMessage', (message) => {
      console.log('Received message via Socket.IO:', message);
      if (message.conversationId === conversationId) {
        const formattedMessage = formatReceivedMessage(message, userId);
        setMessages((prevMessages) => {
          // Avoid duplicates
          if (prevMessages.some((msg) => msg.id === formattedMessage.id)) {
            return prevMessages;
          }
          // Update optimistic message if tempId matches
          if (message.tempId) {
            return prevMessages.map((msg) =>
              msg.id === message.tempId ? { ...formattedMessage, id: message._id } : msg
            );
          }
          return [...prevMessages, formattedMessage];
        });

        // Acknowledge message if it was sent by this client
        const tempId = message.tempId;
        if (tempId && messageQueueRef.current.has(tempId)) {
          const { resolve } = messageQueueRef.current.get(tempId);
          resolve(message);
          messageQueueRef.current.delete(tempId);
        }
      }
    });

    // Handle message send errors
    socket.on('messageError', (error) => {
      console.error('Socket.IO message error:', error);
      setSocketError(error.message || 'Failed to send message.');
    });

    // Cleanup on unmount or when conversationId/userId changes
    return () => {
      console.log('Cleaning up Socket.IO connection for conversation:', conversationId);
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
  }, [conversationId, userId]);

  // Fetch initial messages when conversation changes
  useEffect(() => {
    const fetchInitialMessages = async () => {
      if (!conversationId || !userId) {
        setMessages([]);
        return;
      }

      try {
        console.log('Fetching initial messages for conversation:', conversationId);
        const response = await getMessagesByRoomIdApi({ conversationId, limit: 100, skip: 0 });
        const formattedMessages = processRawMessages(response, userId);
        setMessages(formattedMessages);
        console.log('Initial messages loaded:', formattedMessages);
      } catch (err) {
        console.error('Error fetching initial messages:', err);
        setSocketError(err.message || 'Failed to load message history.');
        setMessages([]);
      }
    };

    fetchInitialMessages();
  }, [conversationId, userId]);

  // Send text message
  const sendTextMessage = useCallback(
    async (messagePayload, tempId) => {
      if (!socketRef.current || !isSocketConnected) {
        throw new Error('Socket is not connected.');
      }

      return new Promise((resolve, reject) => {
        console.log('Sending text message via Socket.IO:', messagePayload);
        messageQueueRef.current.set(tempId, { resolve, reject });
        socketRef.current.emit('sendMessage', { ...messagePayload, tempId }, (ack) => {
          if (ack && ack.success) {
            console.log('Message sent successfully, awaiting server confirmation:', tempId);
          } else {
            console.error('Message send failed:', ack?.error);
            messageQueueRef.current.delete(tempId);
            reject(new Error(ack?.error || 'Failed to send message.'));
          }
        });

        // Timeout if no acknowledgment
        setTimeout(() => {
          if (messageQueueRef.current.has(tempId)) {
            console.error('Message send timeout for tempId:', tempId);
            messageQueueRef.current.delete(tempId);
            reject(new Error('Message send timed out.'));
          }
        }, 10000);
      });
    },
    [isSocketConnected]
  );

  // Send file message (after HTTP upload)
  const sendFileMessage = useCallback(
    async (messagePayload, tempId) => {
      if (!socketRef.current || !isSocketConnected) {
        throw new Error('Socket is not connected.');
      }

      return new Promise((resolve, reject) => {
        console.log('Sending file message via Socket.IO:', messagePayload);
        messageQueueRef.current.set(tempId, { resolve, reject });
        socketRef.current.emit('sendMessage', { ...messagePayload, tempId }, (ack) => {
          if (ack && ack.success) {
            console.log('File message sent successfully, awaiting server confirmation:', tempId);
          } else {
            console.error('File message send failed:', ack?.error);
            messageQueueRef.current.delete(tempId);
            reject(new Error(ack?.error || 'Failed to send file message.'));
          }
        });

        // Timeout if no acknowledgment
        setTimeout(() => {
          if (messageQueueRef.current.has(tempId)) {
            console.error('File message send timeout for tempId:', tempId);
            messageQueueRef.current.delete(tempId);
            reject(new Error('File message send timed out.'));
          }
        }, 10000);
      });
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