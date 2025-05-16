import { useCallback, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Assuming useSocket is structured like this
const useConversationSocket = ({ userInfo, setConversations, setActionError }) => {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);

  // Existing setup code (simplified assumption)
  useEffect(() => {
    socketRef.current = io('SERVER_URL', { auth: { userInfo } });
    
    socketRef.current.on('connect', () => {
      isConnectedRef.current = true;
    });

    socketRef.current.on('disconnect', () => {
      isConnectedRef.current = false;
    });

    socketRef.current.on('error', (error) => {
      setActionError(error.message);
    });

    // Add listener for new conversation creation
    socketRef.current.on('conversationCreated', (newConversation) => {
      setConversations((prevConvs) => {
        // Prevent duplicates based on conversation ID
        if (prevConvs.some(conv => conv.id === newConversation._id)) {
          return prevConvs;
        }
        // Map _id to id for consistency with frontend state (if needed)
        const formattedConversation = { ...newConversation, id: newConversation._id };
        return [...prevConvs, formattedConversation];
      });
    });

    return () => {
      socketRef.current.off('conversationCreated');
      socketRef.current.disconnect();
    };
  }, [setConversations, setActionError]);

  // Add createConversation function
  const createConversation = useCallback(({ members, name }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('createConversation', { members, name }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // Return the socket and functions (existing ones + new)
  return {
    socket: socketRef.current,
    createConversation,
    isConnected: isConnectedRef.current,
    // Other existing functions like sendMessage, etc.
  };
};

export default useConversationSocket;