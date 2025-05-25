import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../services/ChatPageSocket';
import { useHandlers } from '../services/ChatHandlers';
import { useConversationHandlers } from '../services/ConversationHandlers';
import ChatPageLayout from '../components/Chat/ChatPageLayout';
import { getMyRoomsApi, getMessagesByRoomIdApi } from '../api/conversations';
import { infoApi } from '../api/auth';
import { processRawRooms, processRawMessages } from '../services/chatService';
import { toast } from 'react-toastify';
import VideoCall from '../components/VideoCall/VideoCall';
import io from 'socket.io-client';
import '../components/Chat/Chat.scss';

const ChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [rawConversations, setRawConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileChatActive, setIsMobileChatActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [addUserSearchResults, setAddUserSearchResults] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [callInvite, setCallInvite] = useState(null);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [activeCallRoomId, setActiveCallRoomId] = useState(null);
  const [ongoingCallRoomId, setOngoingCallRoomId] = useState(null);
  const currentUserIdRef = useRef(null);
  const optimisticMessagesRef = useRef({});
  const videoSocketRef = useRef(null);
  const lastCallStartedRef = useRef({}); // Track last callStarted timestamp per roomId

  const [mockAuth, setMockAuth] = useState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const { user, isAuthenticated, isLoading: isAuthLoading } = mockAuth;

  useEffect(() => {
    console.log('mockAuth state updated:', {
      user,
      isAuthenticated,
      isAuthLoading,
      currentUserId: currentUserIdRef.current,
    });
  }, [user, isAuthenticated, isAuthLoading]);

  const {
    socket,
    isConnected,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    sendStopTyping,
    fetchConversations,
    createConversation,
    addNewMember,
    removeMember,
    leaveConversation,
    deleteConversationByLeader,
    updateConversationName,
    updateConversationAvatar,
    updateMemberRole,
  } = useSocket({
    isAuthenticated,
    userId: user?._id,
    userInfo: user,
    activeChatId: activeChat?.id,
    setMessages,
    setConversations,
    setActionError,
    conversations,
    rawConversations,
    setRawConversations,
    setActiveChat,
    setIsEditingName,
    setEditingGroupName,
    setAddUserSearchResults,
  });

  // Initialize video call socket
  useEffect(() => {
    if (isAuthenticated && user?._id) {
      videoSocketRef.current = io('/video', { withCredentials: true });
      console.log('Video socket connected');
      videoSocketRef.current.on('connect', () => {
        console.log('Video socket connected, id:', videoSocketRef.current.id);
      });
      videoSocketRef.current.on('reconnect', (attempt) => {
        console.log('Video socket reconnected, attempt:', attempt);
      });
      return () => {
        videoSocketRef.current?.disconnect();
        console.log('Video socket disconnected');
      };
    }
  }, [isAuthenticated, user]);

  // Join all conversation rooms on default namespace
  useEffect(() => {
    if (!socket || !isConnected || !user?.id || !conversations.length) {
      return;
    }

    socket.emit('setup', { page: 1, limit: 30 }, () => {
      console.log('Joined all conversation rooms for user:', user.id);
    });

    return () => {
      conversations.forEach((conv) => {
        socket.emit('leaveRoom', { roomId: conv.id });
      });
    };
  }, [socket, isConnected, user?.id, conversations]);

  // Video call handlers
  const handleStartVideoCall = async () => {
    if (!activeChat?.id) {
      toast.error('Please select a conversation to start a video call.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    const isUserInGroup = activeChat.isGroup
      ? activeChat.detailedMembers.some(member => member.id === user?.id)
      : true;
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    try {
      // Create WebRTC peer connection
      const peerConnection = new RTCPeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      videoSocketRef.current.emit('joinRoom', {
        conversationId: activeChat.id,
        sdp: peerConnection.localDescription,
      });
      console.log('Emitted joinRoom to start video call for room:', activeChat.id);
      setIsVideoCallOpen(true);
      setActiveCallRoomId(activeChat.id);
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('Failed to start video call.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
    }
  };

  const handleJoinCall = (roomId) => {
    if (!roomId) {
      console.warn('No room ID provided for joining call');
      toast.error('Không có phòng được chọn', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    const conversation = conversations.find(conv => conv.id === roomId);
    const isUserInGroup = conversation?.isGroup
      ? conversation.detailedMembers.some(member => member.id === user?.id)
      : true;
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    console.log('User joined call for room:', roomId);
    setIsVideoCallOpen(true);
    setActiveCallRoomId(roomId);
    setCallInvite(null); // Hide popup after joining
  };

  const handleDeclineCall = (roomId) => {
    if (!roomId) {
      console.warn('No room ID provided for declining call');
      toast.error('Không có phòng được chọn', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    console.log('User declined call for room:', roomId);
    setCallInvite(null);
    toast.info('Đã từ chối cuộc gọi', {
      position: 'top-right',
      autoClose: 3000,
      theme: 'dark',
    });
  };

  const handleLeaveRoom = () => {
    if (activeCallRoomId && socket && user?.id) {
      console.log('Emitting leaveRoom for user:', user.id, 'in room:', activeCallRoomId);
      socket.emit('leaveRoom', {
        conversationId: activeCallRoomId,
        userId: user.id,
      });
    }
    // setOngoingCallRoomId(null);
    setIsVideoCallOpen(false);
    setActiveCallRoomId(null);
    setCallInvite(null);
    toast.info('Bạn đã rời cuộc gọi', {
      position: 'top-right',
      autoClose: 3000,
      theme: 'dark',
    });
  };

  // Socket listeners for video call
  useEffect(() => {
    if (!socket || !user?.id || !user?.email) {
      console.warn('Socket not connected or user not authenticated');
      return;
    }

    const handleCallStarted = (data) => {
      console.log('[DEBUG] Received callStarted event:', data);
      const now = Date.now();
      const lastCall = lastCallStartedRef.current[data.roomId] || 0;
      // Ignore duplicate events within 2 seconds
      if (now - lastCall < 2000) {
        console.log('Ignoring duplicate callStarted for room:', data.roomId);
        return;
      }
      lastCallStartedRef.current[data.roomId] = now;

      // Ignore if the user is the caller
      if (data.email === user.email) {
        console.log('Ignoring callStarted from self:', data.email);
        return;
      }

      const conversation = conversations.find(conv => conv.id === data.roomId);
      const isUserInGroup = conversation?.isGroup
        ? conversation.detailedMembers.some(member => member.id === user.id)
        : true;
      if (!isVideoCallOpen && !callInvite && isUserInGroup) {
        setOngoingCallRoomId(data.roomId);
        setCallInvite(data);
        toast.info(`${data.username} đã bắt đầu một cuộc gọi video`, {
          position: 'top-right',
          autoClose: 5000,
          theme: 'dark',
        });
      } else {
        console.warn('callStarted ignored:', {
          receivedRoomId: data.roomId,
          isVideoCallOpen,
          hasCallInvite: !!callInvite,
          isUserInGroup,
        });
      }
    };

    const handleCallEnded = (data) => {
      console.log('[DEBUG] Received callEnded event:', data);
      // Kiểm tra xem roomId có khớp với ongoingCallRoomId không
      if (data.roomId === ongoingCallRoomId) {
        // Đặt lại các state tương ứng với callStarted
        setOngoingCallRoomId(null);
        setCallInvite(null);
        setIsVideoCallOpen(false); // Đảm bảo đóng giao diện video call
        setActiveCallRoomId(null); // Đặt lại activeCallRoomId để đồng bộ
      }
    };

    socket.on('callStarted', handleCallStarted);
    socket.on('callEnded', handleCallEnded);

    return () => {
      socket.off('callStarted', handleCallStarted);
      socket.off('callEnded', handleCallEnded);
    };
  }, [socket, user?.id, user?.email, isVideoCallOpen, callInvite, conversations]);

  // Handle video socket events
  useEffect(() => {
    if (!videoSocketRef.current || !user?.id) {
      return;
    }

    const videoSocket = videoSocketRef.current;

    videoSocket.on('answer', (data) => {
      console.log('Received answer SDP:', data);
      // Handle SDP answer in VideoCall component
    });

    videoSocket.on('error', (error) => {
      console.error('Video socket error:', error);
      toast.error(error || 'Video call error occurred.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
    });

    return () => {
      videoSocket.off('answer');
      videoSocket.off('error');
    };
  }, [user?.id]);

  // Get handlers from useConversationHandlers
  const conversationHandlers = useConversationHandlers({
    user,
    isAuthenticated,
    currentUserIdRef,
    activeChat,
    conversations,
    addUserSearchResults,
    isEditingName,
    editingGroupName,
    isConnected,
    setConversations,
    setMessages,
    setActiveChat,
    setActionError,
    setIsSettingsOpen,
    setIsMobileChatActive,
    setIsPerformingAction,
    setAddUserSearchResults,
    setIsEditingName,
    setEditingGroupName,
    createConversation,
    addNewMember,
    removeMember,
    leaveConversation,
    deleteConversationByLeader,
    updateConversationName,
    updateConversationAvatar,
    updateMemberRole,
  });

  // Get handlers from useHandlers
  const messageHandlers = useHandlers({
    user,
    isAuthenticated,
    currentUserIdRef,
    activeChat,
    conversations,
    messages,
    messageInput,
    editingMessageId,
    sendingMessage,
    socket,
    sendMessage,
    editMessage,
    deleteMessage,
    isConnected,
    setConversations,
    setActiveChat,
    setMessages,
    setMessageInput,
    setEditingMessageId,
    setSendingMessage,
    setActionError,
    setIsSettingsOpen,
    setIsMobileChatActive,
    setIsPerformingAction,
    setSearchTerm,
    optimisticMessagesRef,
  });

  // Merge handlers and add video call handler
  const handlers = {
    ...conversationHandlers,
    ...messageHandlers,
    handleStartVideoCall,
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userInfoResponse = await infoApi();
        if (
          userInfoResponse &&
          userInfoResponse.success &&
          userInfoResponse.userInfo
        ) {
          const userId = userInfoResponse.userInfo.id
            ? String(userInfoResponse.userInfo.id).trim()
            : null;
          if (!userId) {
            throw new Error('User ID is missing or invalid from API.');
          }
          const authenticatedUser = {
            id: userId,
            _id: userId,
            fullName: userInfoResponse.userInfo.fullName,
            email: userInfoResponse.userInfo.email,
            ...userInfoResponse.userInfo,
          };
          setMockAuth({
            user: authenticatedUser,
            isAuthenticated: true,
            isLoading: false,
          });
          currentUserIdRef.current = userId;
          console.log('Mock Auth check: User authenticated.', authenticatedUser);
        } else {
          setMockAuth({ user: null, isAuthenticated: false, isLoading: false });
          currentUserIdRef.current = null;
          console.log('Mock Auth check: User not authenticated.');
        }
      } catch (err) {
        console.error('Mock Auth check Error:', err);
        setMockAuth({ user: null, isAuthenticated: false, isLoading: false });
        currentUserIdRef.current = null;
        setError('Authentication failed. Please login again.');
      }
    };
    checkAuthStatus();
  }, []);

  const fetchInitialData = useCallback(async () => {
    const currentUserId = user?._id;
    if (!currentUserId) {
      console.warn('fetchInitialData: User ID is not set.');
      setIsLoadingConversations(false);
      setRawConversations([]);
      setConversations([]);
      return;
    }
    console.log('Fetching initial rooms for user:', currentUserId);
    setIsLoadingConversations(true);
    setError(null);
    try {
      const rooms = await getMyRoomsApi();
      setRawConversations(rooms);
      console.log('rooms: ', rooms);
      const conversationsData = processRawRooms(rooms, currentUserId);
      setConversations(conversationsData);
      console.log('Processed conversations:', conversationsData);
    } catch (err) {
      console.error('Error fetching initial chat data:', err);
      if (
        err.message.includes('HTTP error! status: 401') ||
        err.message.includes('not authenticated')
      ) {
        setError('Authentication failed. Please login again.');
      } else {
        setError(err.message || 'Failed to load conversations.');
      }
      setRawConversations([]);
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('Auth state check for initial fetch:', {
      isAuthLoading,
      isAuthenticated,
      userId: user?._id,
    });
    if (!isAuthLoading && isAuthenticated && user?._id) {
      console.log('Auth complete and user ID available. Triggering fetchInitialData...');
      fetchInitialData();
      setError(null);
    } else if (!isAuthLoading && !isAuthenticated) {
      console.warn('Auth complete but user not authenticated. Cannot fetch chat data.');
      setError('User not authenticated. Please login.');
      setIsLoadingConversations(false);
      setRawConversations([]);
      setConversations([]);
      setActiveChat(null);
      setMessages([]);
      setIsMobileChatActive(false);
      setMessageInput('');
      setEditingMessageId(null);
      setSendingMessage(false);
    }
  }, [isAuthLoading, isAuthenticated, user, fetchInitialData]);

  // Hide/show mobile nav
  useEffect(() => {
    const toggleMobileNavVisibility = (hide) => {
      window.dispatchEvent(
        new CustomEvent('toggleMobileNav', { detail: { hideNav: hide } })
      );
    };
    toggleMobileNavVisibility(true);
    return () => toggleMobileNavVisibility(false);
  }, []);

  // Fetch messages when activeChat changes
  const fetchMessages = useCallback(async (userId) => {
    if (!activeChat?.id || !userId) {
      console.warn('fetchMessages: No active chat or user ID.', { activeChat, userId });
      setMessages([]);
      setIsLoadingMessages(false);
      setIsMobileChatActive(false);
      setMessageInput('');
      setEditingMessageId(null);
      setSendingMessage(false);
      return;
    }
    console.log('Fetching messages for room:', activeChat.id, 'for user:', userId);
    setIsLoadingMessages(true);
    setActionError(null);
    setMessageInput('');
    setEditingMessageId(null);
    setSendingMessage(false);
    const isMobileView = window.innerWidth <= 768;
    if (isMobileView) setIsMobileChatActive(true);
    try {
      const messages = await getMessagesByRoomIdApi({
        conversationId: activeChat.id,
        limit: 30,
        skip: 0,
      });
      const formattedMessages = await processRawMessages(messages, userId);
      setMessages(formattedMessages);
      console.log('Formatted messages (oldest first):', formattedMessages);
    } catch (err) {
      console.error(`Error fetching messages for ${activeChat.id}:`, err);
      if (err.message.includes('HTTP error! status: 401')) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.message || `Failed to load messages.`);
      }
      setMessages([]);
      setMessageInput('');
      setEditingMessageId(null);
      setSendingMessage(false);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeChat, setIsMobileChatActive]);

  useEffect(() => {
    const currentUserId = user?._id;
    if (activeChat && currentUserId) {
      fetchMessages(currentUserId);
    } else if (activeChat === null) {
      setMessages([]);
      setIsLoadingMessages(false);
      setIsMobileChatActive(false);
    }
  }, [activeChat, user, fetchMessages]);

  const isCallOngoing =
    ongoingCallRoomId && activeChat?.id
      ? String(ongoingCallRoomId) === String(activeChat.id)
      : false;
  console.log('[DEBUG] isCallOngoing:', isCallOngoing, 'ongoingCallRoomId:', ongoingCallRoomId, 'activeChat?.id:', activeChat?.id);

  return (
    <div className="chat-page-container">
      <ChatPageLayout
        isAuthLoading={isAuthLoading}
        isAuthenticated={isAuthenticated}
        error={error}
        isLoadingConversations={isLoadingConversations}
        isLoadingMessages={isLoadingMessages}
        isPerformingAction={isPerformingAction}
        sendingMessage={sendingMessage}
        actionError={actionError}
        conversations={conversations}
        activeChat={activeChat}
        messages={messages}
        setMessages={setMessages}
        searchTerm={searchTerm}
        isMobileChatActive={isMobileChatActive}
        isSettingsOpen={isSettingsOpen}
        addUserSearchResults={addUserSearchResults}
        setAddUserSearchResults={setAddUserSearchResults}
        messageInput={messageInput}
        editingMessageId={editingMessageId}
        isEditingName={isEditingName}
        editingGroupName={editingGroupName}
        updateConversationAvatar={updateConversationAvatar}
        updateMemberRole={updateMemberRole}
        currentUserId={currentUserIdRef.current}
        handlers={handlers}
        setMessageInput={setMessageInput}
        setSearchTerm={setSearchTerm}
        onUploadBeforeBegin={handlers.handleUploadBeforeBegin}
        onClientUploadComplete={handlers.handleUploadComplete}
        onUploadError={handlers.handleUploadError}
        onUploadProgress={handlers.handleUploadProgress}
        userInfo={user}
        socket={socket}
        sendTyping={sendTyping}
        sendStopTyping={sendStopTyping}
        setConversations={setConversations}
        isCallOngoing={isCallOngoing}
        ongoingCallRoomId={ongoingCallRoomId}
      />
      {callInvite && (
        <div className="call-invite-popup">
          <div className="call-invite-content">
            <p>
              {callInvite.username} has started a video call in room {callInvite.roomId}. Join or decline?
            </p>
            <button onClick={() => handleJoinCall(callInvite.roomId)}>Join</button>
            <button onClick={() => handleDeclineCall(callInvite.roomId)}>Decline</button>
          </div>
        </div>
      )}
      {isVideoCallOpen && (
        <VideoCall
          roomId={activeCallRoomId}
          userId={user?.id}
          socket={videoSocketRef.current}
          onClose={handleLeaveRoom}
        />
      )}
    </div>
  );
};

export default ChatPage;