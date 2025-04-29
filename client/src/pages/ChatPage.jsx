import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../services/ChatPageSocket';
import { getHandlers } from '../services/ChatPageHandlers';
import ChatPageLayout from '../components/Chat/ChatPageLayout';
import { getMyRoomsApi , getMessagesByRoomIdApi } from '../api/conversations';
import { infoApi } from '../api/auth';
import { processRawRooms, processRawMessages } from '../services/chatService';
import '../components/Chat/Chat.scss';

const ChatPage = () => {
  // --- State ---
  const [conversations, setConversations] = useState([]);
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
  const currentUserIdRef = useRef(null);

  // --- Mock Auth ---
  const [mockAuth, setMockAuth] = useState({ user: null, isAuthenticated: false, isLoading: true });
  const { user, isAuthenticated, isLoading: isAuthLoading } = mockAuth;

  // Debug auth state
  useEffect(() => {
    console.log('mockAuth state updated:', { user, isAuthenticated, isAuthLoading, currentUserId: currentUserIdRef.current });
  }, [user, isAuthenticated, isAuthLoading]);

  // --- Socket.IO ---
  const socket = useSocket({
    isAuthenticated,
    userId: user?._id,
    activeChatId: activeChat?.id,
    setMessages,
    setConversations,
    setActionError,
  });

  // --- Handlers ---
  const handlers = getHandlers({
    user,
    isAuthenticated,
    currentUserIdRef,
    activeChat,
    conversations,
    messages,
    messageInput,
    editingMessageId,
    sendingMessage,
    isPerformingAction,
    addUserSearchResults,
    isEditingName,
    editingGroupName,
    socket,
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
    setAddUserSearchResults,
    setIsEditingName,
    setEditingGroupName,
    setSearchTerm,
  });

  // --- Effect 1: Check Auth Status ---
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userInfoResponse = await infoApi();
        if (userInfoResponse && userInfoResponse.success && userInfoResponse.userInfo) {
          const userId = userInfoResponse.userInfo.id
            ? String(userInfoResponse.userInfo.id).trim()
            : null;
          if (!userId) {
            throw new Error('User ID is missing or invalid from API.');
          }
          const authenticatedUser = { _id: userId, ...userInfoResponse.userInfo };
          setMockAuth({ user: authenticatedUser, isAuthenticated: true, isLoading: false });
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

  // --- Callback to fetch initial conversations ---
  const fetchInitialData = useCallback(async () => {
    const currentUserId = user?._id;

    if (!currentUserId) {
      console.warn('fetchInitialData: User ID is not set.');
      setIsLoadingConversations(false);
      setConversations([]);
      return;
    }

    console.log('Fetching initial rooms for user:', currentUserId);
    setIsLoadingConversations(true);
    setError(null);

    try {
      const rooms = await getMyRoomsApi();
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
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  // --- Effect 2: Trigger fetchInitialData ---
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
      setConversations([]);
      setActiveChat(null);
      setMessages([]);
      setIsMobileChatActive(false);
      setMessageInput('');
      setEditingMessageId(null);
      setSendingMessage(false);
    }
  }, [isAuthLoading, isAuthenticated, user?._id, fetchInitialData]);

  // --- Effect 3: Handle mobile nav toggle ---
  useEffect(() => {
    const toggleMobileNavVisibility = (hide) => {
      window.dispatchEvent(new CustomEvent('toggleMobileNav', { detail: { hideNav: hide } }));
    };
    toggleMobileNavVisibility(true);
    return () => toggleMobileNavVisibility(false);
  }, []);

  // --- Effect 4: Load messages when activeChat changes ---
  useEffect(() => {
    const currentUserId = user?._id;

    const fetchMessages = async (userId) => {
      if (!activeChat?.id || !userId) {
        console.warn('fetchMessages: No active chat or user ID.');
        setMessages([]);
        setIsLoadingMessages(false);
        if (activeChat === null) {
          setIsMobileChatActive(false);
        }
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
          limit: 100,
          skip: 0,
        });
        console.log(messages);
        const formattedMessages = processRawMessages(messages, currentUserId);
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
    };
    if (activeChat && currentUserId) {
      fetchMessages(currentUserId);
    } else if (activeChat === null) {
      setMessages([]);
      setIsLoadingMessages(false);
      setIsMobileChatActive(false);
    }
  }, [activeChat, user?._id, setIsMobileChatActive, isAuthLoading, isAuthenticated]);

  // --- Render ---
  return (
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
      searchTerm={searchTerm}
      isMobileChatActive={isMobileChatActive}
      isSettingsOpen={isSettingsOpen}
      addUserSearchResults={addUserSearchResults}
      messageInput={messageInput}
      editingMessageId={editingMessageId}
      isEditingName={isEditingName}
      editingGroupName={editingGroupName}
      currentUserId={currentUserIdRef.current}
      handlers={handlers}
      setMessageInput={setMessageInput}
      setSearchTerm={setSearchTerm}
    />
  );
};

export default ChatPage;