import { useCallback } from 'react';
import {
  createOptimisticTextMessage,
  buildTextMessagePayload,
  createOptimisticFileMessage,
  buildFileMessagePayload,
  updateConversationsListLatestMessage,
  formatReceivedMessage,
  updateMessagesOptimisticDelete,
  revertMessagesOptimisticDelete,
  updateMessagesOptimisticEdit,
  revertMessagesOptimisticEdit,
  updateMessagesEditSuccess,
  updateConversationsListAfterMessageAction,
} from './chatService';
import { formatTime } from '../utils/helpers';

export const useHandlers = ({
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
}) => {
  // --- Generic handler for socket actions ---
  const performSettingsAction = useCallback(
    async (socketCall, successMessage, updateStateFunc = null) => {
      if (!isConnected) {
        setActionError('Socket is not connected. Please try again.');
        setIsPerformingAction(false);
        return;
      }
      setIsPerformingAction(true);
      setActionError(null);
      try {
        await socketCall();
        console.log(`${successMessage} successful`);
        setActionError(null);
        if (updateStateFunc) {
          updateStateFunc();
        }
      } catch (err) {
        console.error(`Socket call failed for ${successMessage}:`, err);
        setActionError(
          err.message ||
            `An error occurred during ${successMessage.toLowerCase()}.`
        );
      } finally {
        setIsPerformingAction(false);
      }
    },
    [setIsPerformingAction, setActionError, isConnected]
  );

  // --- Handler for clicking a conversation ---
  const handleConversationClick = useCallback(
    async (type, id) => {
      console.log('handleConversationClick called:', { type, id, user, isAuthenticated });
      if (!isAuthenticated || !user?._id) {
        console.warn('User not authenticated. Cannot select conversation.', {
          user,
          isAuthenticated,
          userId: user?._id,
        });
        setActionError('Please login to view conversations.');
        return;
      }
      setMessageInput('');
      setEditingMessageId(null);
      setSendingMessage(false);

      const clickedConv = conversations.find((c) => c.id === id);
      if (clickedConv) {
        setActiveChat({
          ...clickedConv,
          id: clickedConv.id,
          detailedMembers: clickedConv.detailedMembers || [],
        });
        setIsSettingsOpen(false);
        const isMobileView = window.innerWidth <= 768;
        if (isMobileView) {
          setIsMobileChatActive(true);
        }
      }
    },
    [
      user,
      isAuthenticated,
      setMessageInput,
      setEditingMessageId,
      setSendingMessage,
      conversations,
      setActiveChat,
      setIsSettingsOpen,
      setIsMobileChatActive,
      setActionError,
    ]
  );

  // --- Handler for mobile back button ---
  const handleMobileBack = useCallback(() => {
    setActiveChat(null);
    setIsSettingsOpen(false);
    setIsMobileChatActive(false);
    setMessageInput('');
    setEditingMessageId(null);
    setSendingMessage(false);
  }, [
    setActiveChat,
    setIsSettingsOpen,
    setIsMobileChatActive,
    setMessageInput,
    setEditingMessageId,
    setSendingMessage,
  ]);

  // --- Handlers for Settings Overlay ---
  const handleOpenSettings = useCallback(() => {
    if (activeChat?.isGroup && activeChat.detailedMembers) {
      setIsSettingsOpen(true);
    } else if (activeChat) {
      console.warn('Attempted to open settings for a non-group chat.');
      setActionError('Settings are only available for group chats.');
    }
  }, [activeChat, setIsSettingsOpen, setActionError]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, [setIsSettingsOpen]);

  // --- Handler for sending text message ---
  const handleSendTextMessage = useCallback(async () => {
    const currentUserId = currentUserIdRef.current;
    const newMessageText = messageInput.trim();

    if (
      !activeChat?.id ||
      !currentUserId ||
      sendingMessage ||
      editingMessageId !== null ||
      !newMessageText ||
      !isConnected
    ) {
      console.warn('Cannot send text message: Invalid state or socket not connected');
      setActionError(
        !isConnected
          ? 'Socket is not connected.'
          : 'Cannot send message: Invalid state or empty message.'
      );
      return;
    }

    setSendingMessage(true);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const newMessageOptimistic = createOptimisticTextMessage(
      tempId,
      newMessageText,
      currentUserId,
      user
    );
    setMessages((prevMessages) => [...prevMessages, newMessageOptimistic]);
    setMessageInput('');

    try {
      const messagePayload = {
        conversationId: activeChat.id,
        data: newMessageText,
        type: 'text',
        replyToMessageId: null,
        tempId: tempId
      };
      const sent = sendMessage(messagePayload);
      if (!sent) {
        throw new Error('Socket is not connected.');
      }
      console.log('Message sent via Socket.IO:', messagePayload);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        )
      );
    } catch (err) {
      console.error('Failed to send text message:', err);
      setActionError(err.message || 'Failed to send text message.');
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
    } finally {
      setSendingMessage(false);
    }
  }, [
    activeChat,
    sendingMessage,
    editingMessageId,
    messageInput,
    currentUserIdRef,
    user,
    sendMessage,
    isConnected,
    setMessages,
    setMessageInput,
    setSendingMessage,
    setActionError,
  ]);

  // --- Handler for uploading files ---
  const handleUploadBeforeBegin = useCallback(
    (files) => {
      const currentUserId = currentUserIdRef.current;
      if (
        !activeChat?.id ||
        !currentUserId ||
        sendingMessage ||
        editingMessageId !== null ||
        !files ||
        files.length === 0
      ) {
        console.warn('Cannot upload file(s): Invalid state or no files selected.');
        setActionError('Cannot send file(s) now.');
        return null;
      }

      setSendingMessage(true);
      const newOptimisticMessages = files.map((file) => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        let localPreviewUrl = null;
        if (fileType === 'image') {
          try {
            localPreviewUrl = URL.createObjectURL(file);
          } catch (e) {
            console.error('Error creating object URL for image preview:', e);
          }
        }
        const optimisticMsg = createOptimisticFileMessage(
          tempId,
          file,
          currentUserId,
          user,
          localPreviewUrl
        );
        optimisticMessagesRef.current[file.name] = {
          tempId,
          localPreviewUrl,
          originalFile: file,
        };
        return optimisticMsg;
      });
      setMessages((prevMessages) => [...prevMessages, ...newOptimisticMessages]);
      console.log('Upload begins for:', files.map((f) => f.name).join(', '));
      return files;
    },
    [
      activeChat?.id,
      currentUserIdRef,
      sendingMessage,
      editingMessageId,
      setSendingMessage,
      setMessages,
      user,
      setActionError,
      optimisticMessagesRef,
    ]
  );

  const handleUploadComplete = useCallback(
    async (res) => {
      console.log('Files uploaded:', res);
      const filesBeingProcessed = { ...optimisticMessagesRef.current };
      optimisticMessagesRef.current = {};

      for (const uploadedFileDetails of res) {
        const originalFileName = uploadedFileDetails.name;
        const optimisticData = filesBeingProcessed[originalFileName];
        if (!optimisticData) {
          console.error('Could not find optimistic message data for uploaded file:', originalFileName, uploadedFileDetails);
          continue;
        }
        const { tempId, localPreviewUrl, originalFile } = optimisticData;
        const fileType = originalFile.type.startsWith('image/') ? 'image' : 'file';

        try {
          const messagePayload = buildFileMessagePayload(
            activeChat.id,
            fileType,
            uploadedFileDetails,
            null,
            tempId
          );
          const sent = sendMessage(messagePayload);
          if (!sent) {
            throw new Error('Socket is not connected.');
          }
          console.log('File message sent via Socket.IO:', messagePayload);
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempId ? { ...msg, status: 'sent' } : msg
            )
          );
        } catch (err) {
          console.error('Error sending file message after upload:', err);
          setActionError(err.message || `Failed to send file: ${originalFileName}`);
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempId ? { ...msg, status: 'failed' } : msg
            )
          );
        } finally {
          if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
          }
        }
      }
      setSendingMessage(false);
    },
    [
      activeChat?.id,
      sendMessage,
      setMessages,
      setSendingMessage,
      setActionError,
      optimisticMessagesRef,
    ]
  );

  const handleUploadError = useCallback(
    (error) => {
      console.error('Uploadthing Error:', error);
      Object.values(optimisticMessagesRef.current).forEach((data) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.tempId ? { ...msg, status: 'failed' } : msg
          )
        );
        if (data.localPreviewUrl) {
          URL.revokeObjectURL(data.localPreviewUrl);
        }
      });
      optimisticMessagesRef.current = {};
      setSendingMessage(false);
      setActionError(error.message || 'File upload failed.');
    },
    [setMessages, setSendingMessage, setActionError, optimisticMessagesRef]
  );

  const handleUploadProgress = useCallback((progress) => {
    console.log('Upload progress:', progress);
  }, []);

  // --- Handler for deleting a message ---
  const handleDeleteMessage = useCallback(
    async (messageId) => {
      const currentUserId = currentUserIdRef.current;
      if (!messageId || !activeChat?.id || !currentUserId) {
        console.warn('Cannot delete message: Invalid parameters or no active chat/user.');
        setActionError('Cannot perform action without active chat or user.');
        return;
      }
      const messageToDelete = messages.find((msg) => msg.id === messageId);
      if (!messageToDelete) {
        console.warn(`Cannot delete message ${messageId}: Message not found in state.`);
        setActionError('Message not found in current view.');
        return;
      }
      if (messageToDelete.senderId !== currentUserId) {
        console.warn(`Cannot delete message ${messageId}: Not the sender.`);
        setActionError('You can only delete your own messages.');
        return;
      }
      if (
        messageToDelete.status &&
        ['uploading', 'sending', 'failed'].includes(messageToDelete.status)
      ) {
        console.warn(`Cannot delete message ${messageId}: Message status is '${messageToDelete.status}'.`);
        setActionError('Cannot delete message while uploading or sending.');
        return;
      }
      if (messageId === editingMessageId) {
        console.warn(`Cannot delete message ${messageId}: Message is currently being edited.`);
        setActionError('Cannot delete message while editing.');
        return;
      }
      if (!window.confirm('Are you sure you want to delete this message?')) {
        return;
      }
      const originalMessageStateCopy = { ...messageToDelete };
      setMessages((prevMessages) =>
        updateMessagesOptimisticDelete(prevMessages, messageId)
      );
      try {
        const success = await deleteMessage({ messageId });
        if (!success) {
          console.error(`Failed to delete message ${messageId} via socket.`);
          setActionError('Failed to delete message via socket.');
          setMessages((prevMessages) =>
            revertMessagesOptimisticDelete(prevMessages, originalMessageStateCopy)
          );
        } else {
          console.log(`Message ${messageId} deleted successfully via socket.`);
          setConversations((prevConvs) =>
            updateConversationsListAfterMessageAction(
              prevConvs,
              activeChat.id,
              messages.filter((msg) => msg.id !== messageId),
              messageId
            )
          );
        }
      } catch (err) {
        console.error(`Error deleting message ${messageId} via socket:`, err);
        setActionError(err.message || 'An error occurred while deleting message.');
        setMessages((prevMessages) =>
          revertMessagesOptimisticDelete(prevMessages, originalMessageStateCopy)
        );
      }
    },
    [
      activeChat?.id,
      messages,
      currentUserIdRef,
      editingMessageId,
      setMessages,
      setConversations,
      deleteMessage,
      setActionError,
    ]
  );

  // --- Handler for initiating message edit ---
  const handleInitiateEditMessage = useCallback(
    async (messageId, currentText) => {
      const currentUserId = currentUserIdRef.current;
      if (!messageId || !activeChat?.id || !currentUserId) {
        console.warn('Cannot initiate edit message: Invalid parameters or no active chat/user.');
        setActionError('Cannot edit message without active chat or user.');
        return;
      }
      const messageToEdit = messages.find((msg) => msg.id === messageId);
      if (!messageToEdit) {
        console.warn(`Cannot initiate edit message ${messageId}: Message not found in state.`);
        setActionError('Message not found.');
        return;
      }
      if (
        messageToEdit.senderId !== currentUserId ||
        messageToEdit.type !== 'text'
      ) {
        console.warn(`Cannot initiate edit message ${messageId}: Not the sender or not a text message.`);
        setActionError('You can only edit your own text messages.');
        return;
      }
      if (messageToEdit.status !== 'sent') {
        console.warn(`Cannot initiate edit message ${messageId}: Message status is '${messageToEdit.status}'.`);
        setActionError('Cannot edit messages that are not yet sent.');
        return;
      }
      if (sendingMessage || editingMessageId !== null) {
        console.warn(`Cannot initiate edit message ${messageId}: Another action is in progress.`);
        setActionError(
          editingMessageId !== null
            ? 'Another message is currently being edited.'
            : 'Another action is in progress.'
        );
        return;
      }
      setEditingMessageId(messageId);
      setMessageInput(currentText);
      console.log(`Initiating edit for message ${messageId} with text: "${currentText}"`);
    },
    [
      activeChat?.id,
      messages,
      currentUserIdRef,
      sendingMessage,
      editingMessageId,
      setEditingMessageId,
      setMessageInput,
      setActionError,
    ]
  );

  // --- Handler for saving edited message ---
  const handleSaveEditedMessage = useCallback(
    async () => {
      const messageId = editingMessageId;
      const currentUserId = currentUserIdRef.current;
      const newText = messageInput.trim();

      if (!messageId || !activeChat?.id || !currentUserId || !newText) {
        console.warn('Cannot save edit: Invalid state or empty message.');
        setEditingMessageId(null);
        setMessageInput('');
        setActionError('Invalid request to save message or empty message.');
        return;
      }
      const messageToEdit = messages.find((msg) => msg.id === messageId);
      if (!messageToEdit) {
        console.warn(`Cannot save edit for message ${messageId}: Message not found in state.`);
        setEditingMessageId(null);
        setMessageInput('');
        setActionError('Message to edit not found.');
        return;
      }
      const originalText = messageToEdit?.content?.text?.data || '';
      if (newText === originalText.trim()) {
        console.log('No change in message text, cancelling save.');
        setEditingMessageId(null);
        setMessageInput('');
        return;
      }
      if (sendingMessage) {
        console.warn('Cannot save edit: Already saving/sending another item.');
        setActionError('Save in progress. Please wait.');
        return;
      }
      const originalMessageState = {
        id: messageId,
        content: messageToEdit.content,
        isEdited: messageToEdit.isEdited,
        time: messageToEdit.time,
        createdAt: messageToEdit.createdAt,
        status: messageToEdit.status,
      };
      setMessages((prevMessages) =>
        updateMessagesOptimisticEdit(prevMessages, messageId, newText)
      );
      setEditingMessageId(null);
      setMessageInput('');
      setSendingMessage(true);
      try {
        const success = await editMessage({ messageId, newData: newText });
        if (success) {
          console.log(`Message ${messageId} edited successfully via socket.`);
          setConversations((prevConvs) =>
            updateConversationsListAfterMessageAction(
              prevConvs,
              activeChat.id,
              messages,
              messageId
            )
          );
        } else {
          console.error(`Failed to edit message ${messageId} via socket.`);
          setActionError('Failed to edit message via socket.');
          setMessages((prevMessages) =>
            revertMessagesOptimisticEdit(prevMessages, originalMessageState)
          );
        }
      } catch (err) {
        console.error(`Error editing message ${messageId} via socket:`, err);
        setActionError(err.message || 'An error occurred while editing message.');
        setMessages((prevMessages) =>
          revertMessagesOptimisticEdit(prevMessages, originalMessageState)
        );
      } finally {
        setSendingMessage(false);
      }
    },
    [
      activeChat?.id,
      editingMessageId,
      messageInput,
      messages,
      currentUserIdRef,
      sendingMessage,
      setMessages,
      setEditingMessageId,
      setMessageInput,
      setSendingMessage,
      editMessage,
      setActionError,
    ]
  );

  // --- Handler for canceling edit ---
  const handleCancelEdit = useCallback(() => {
    console.log(`Cancelling edit for message ${editingMessageId}.`);
    if (sendingMessage) {
      console.warn('Cannot cancel edit: Save in progress.');
      setActionError('Save in progress. Please wait.');
      return;
    }
    setEditingMessageId(null);
    setMessageInput('');
  }, [
    editingMessageId,
    sendingMessage,
    setMessageInput,
    setEditingMessageId,
    setActionError,
  ]);

  // --- Handler for search change ---
  const handleSearchChange = useCallback(
    (event) => {
      const term = event.target.value.toLowerCase();
      setSearchTerm(term);
    },
    [setSearchTerm]
  );

  return {
    handleConversationClick,
    handleMobileBack,
    handleOpenSettings,
    handleCloseSettings,
    handleSendTextMessage,
    handleUploadBeforeBegin,
    handleUploadComplete,
    handleUploadError,
    handleUploadProgress,
    handleDeleteMessage,
    handleInitiateEditMessage,
    handleSaveEditedMessage,
    handleCancelEdit,
    handleSearchChange,
  };
};