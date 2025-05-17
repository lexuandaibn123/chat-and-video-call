import { useCallback, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const useConversationSocket = ({ userId, userInfo, setConversations, setActionError }) => {
  const socketRef = useRef(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!userInfo) {
      console.warn('useSocket: missing userInfo. Skipping socket initialization.', {
        userInfo,
      });
      return;
    }
    socketRef.current = io(SERVER_URL, { auth: { userInfo } });

    socketRef.current.on('connect', () => {
      isConnectedRef.current = true;
    });

    socketRef.current.on('disconnect', () => {
      isConnectedRef.current = false;
    });

    socketRef.current.on('error', (error) => {
      setActionError(error.message || error);
    });

    // Handle new conversation creation
    socketRef.current.on('conversationCreated', (newConversation) => {
      setConversations((prevConvs) => {
        if (prevConvs.some(conv => conv.id === newConversation._id)) {
          return prevConvs;
        }
        const formattedConversation = { ...newConversation, id: newConversation._id };
        return [...prevConvs, formattedConversation];
      });
    });

    // Handle new member added
    socketRef.current.on('addedNewMember', (updatedConversation) => {
      setConversations((prevConvs) => {
        return prevConvs.map(conv =>
          conv.id === updatedConversation._id
            ? { ...updatedConversation, id: updatedConversation._id }
            : conv
        );
      });
    });

    // Handle member removed
    socketRef.current.on('removedMember', (updatedConversation) => {
      setConversations((prevConvs) => {
        return prevConvs.map(conv =>
          conv.id === updatedConversation._id
            ? { ...updatedConversation, id: updatedConversation._id }
            : conv
        );
      });
    });

    // Handle member left conversation
    socketRef.current.on('leftConversation', (message) => {
      // Optionally update UI or notify user
      setConversations((prevConvs) => {
        return prevConvs.filter(conv => !conv.isDeleted);
      });
    });

    // Handle conversation deleted by leader
    socketRef.current.on('deletedConversationByLeader', (message) => {
      setConversations((prevConvs) => {
        return prevConvs.filter(conv => !conv.isDeleted);
      });
    });

    // Handle conversation name updated
    socketRef.current.on('updatedConversationName', (updatedConversation) => {
      setConversations((prevConvs) => {
        return prevConvs.map(conv =>
          conv.id === updatedConversation._id
            ? { ...updatedConversation, id: updatedConversation._id }
            : conv
        );
      });
    });

    // Handle conversation avatar updated
    socketRef.current.on('updatedConversationAvatar', (updatedConversation) => {
      setConversations((prevConvs) => {
        return prevConvs.map(conv =>
          conv.id === updatedConversation._id
            ? { ...updatedConversation, id: updatedConversation._id }
            : conv
        );
      });
    });

    return () => {
      socketRef.current.off('conversationCreated');
      socketRef.current.off('addedNewMember');
      socketRef.current.off('removedMember');
      socketRef.current.off('leftConversation');
      socketRef.current.off('deletedConversationByLeader');
      socketRef.current.off('updatedConversationName');
      socketRef.current.off('updatedConversationAvatar');
      socketRef.current.off('error');
      socketRef.current.disconnect();
    };
  }, [setConversations, setActionError]);

  // Fetch conversations
  const fetchConversations = useCallback(({ page = 1, limit = 10 }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('fetchConversations', { userId: userId, page, limit }, (response) => {
        if (response.success) {
          const formattedConversations = response.data.map(conv => ({
            ...conv,
            id: conv._id
          }));
          setConversations(formattedConversations);
          resolve(formattedConversations);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, [userId]);

  // Create conversation
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

  // Add new member
  const addNewMember = useCallback(({ conversationId, newMemberId, role = 'member' }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('addNewMember', { conversationId, newMemberId, role }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // Remove member
  const removeMember = useCallback(({ conversationId, memberId }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('removeMember', { conversationId, memberId }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // Leave conversation
  const leaveConversation = useCallback(({ conversationId }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('leaveConversation', { conversationId }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // Delete conversation by leader
  const deleteConversationByLeader = useCallback(({ conversationId }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('deleteConversationByLeader', { conversationId }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // Update conversation name
  const updateConversationName = useCallback(({ conversationId, newName }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('updateConversationName', { conversationId, newName }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  // Update conversation avatar
  const updateConversationAvatar = useCallback(({ conversationId, newAvatar }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !isConnectedRef.current) {
        reject(new Error('Socket is not connected. Please try again.'));
        return;
      }

      socketRef.current.emit('updateConversationAvatar', { conversationId, newAvatar }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }, []);

  return {
    socket: socketRef.current,
    isConnected: isConnectedRef.current,
    fetchConversations,
    createConversation,
    addNewMember,
    removeMember,
    leaveConversation,
    deleteConversationByLeader,
    updateConversationName,
    updateConversationAvatar,
  };
};

export default useConversationSocket;