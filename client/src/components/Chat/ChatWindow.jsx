import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import Picker from 'emoji-picker-react';
import MessageBubble from './MessageBubble';
import defaultUserAvatar from '../../assets/images/avatar_male.jpg';
import defaultGroupAvatar from '../../assets/images/group-chat.png';
import { UploadButton } from '../../utils/uploadthing';
import { getMessagesByRoomIdApi } from '../../api/conversations';
import { processRawMessages } from '../../services/chatService';
import VideoCall from '../VideoCall/VideoCall';

const ChatWindow = ({
  activeContact,
  messages,
  setMessages,
  onMobileBack,
  isMobile,
  messageInput,
  setMessageInput,
  onSendTextMessage,
  onSaveEditedMessage,
  onCancelEdit,
  isLoadingMessages,
  onOpenSettings,
  onDeleteMessage,
  onEditMessage,
  sendingMessage,
  currentUserId,
  editingMessageId,
  onUploadBeforeBegin,
  onClientUploadComplete,
  onUploadError,
  onUploadProgress,
  userInfo,
  socket,
  sendTyping,
  sendStopTyping,
  isCallOngoing,
}) => {
  const messageListEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageListRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [callInvite, setCallInvite] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  console.log('Active contact:', activeContact);
  console.log('[DEBUG] ChatWindow props.isCallOngoing:', isCallOngoing);

  const isUserInGroup = activeContact?.isGroup
    ? activeContact.detailedMembers.some(member => member.id === userInfo.id)
    : true;

  useEffect(() => {
    if (!socket || !activeContact?.id || !userInfo?.id) return;

    socket.emit('joinConversationRoom', { conversationId: activeContact.id });

    const handleTyping = (data) => {
      const { roomId, memberId } = data || {};
      if (
        roomId === activeContact.id &&
        memberId !== userInfo.id &&
        isUserInGroup
      ) {
        setTypingUsers((prev) => {
          if (!prev.includes(memberId)) {
            return [...prev, memberId];
          }
          return prev;
        });
      }
    };

    const handleStopTyping = (data) => {
      const { roomId, memberId } = data || {};
      if (roomId === activeContact.id && isUserInGroup) {
        setTypingUsers((prev) => prev.filter((id) => id !== memberId));
      }
    };

    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.emit('leaveConversationRoom', { conversationId: activeContact.id });
      setTypingUsers([]);
    };
  }, [socket, activeContact?.id, userInfo?.id, isUserInGroup, isVideoCallOpen, callInvite]);

  useEffect(() => {
    if (activeContact && isInitialLoad && !isLoadingMessages && messages.length > 0) {
      messageListEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setIsInitialLoad(false);
    }
  }, [activeContact, isInitialLoad, isLoadingMessages, messages]);

  useEffect(() => {
    if (editingMessageId !== null) {
      messageInputRef.current?.focus();
      const input = messageInputRef.current;
      if (input) {
        const end = input.value.length;
        setTimeout(() => input.setSelectionRange(end, end), 0);
      }
    }
  }, [editingMessageId]);

  const fetchMessages = useCallback(async (pageNum) => {
    if (!activeContact?.id || !userInfo?.id || !messageListRef.current || !hasMore || isLoadingMore) {
      console.warn('fetchMessages: Invalid conditions.', { activeContact, userId: userInfo?.id });
      setIsLoadingMore(false);
      return;
    }
    console.log('Fetching messages for room:', activeContact.id, 'for user:', userInfo.id, 'page:', pageNum);

    const messageList = messageListRef.current;
    const firstMessageId = messages.length > 0 ? messages[0].id : null;
    const scrollHeightBefore = messageList.scrollHeight;
    const scrollTopBefore = messageList.scrollTop;

    setIsLoadingMore(true);
    try {
      const limit = 30;
      const skip = (pageNum - 1) * limit;
      const newMessages = await getMessagesByRoomIdApi({
        conversationId: activeContact.id,
        limit,
        skip,
      });
      const formattedMessages = await processRawMessages(newMessages, userInfo.id);
      if (newMessages.length < limit) {
        setHasMore(false);
      }

      setMessages(prev => [...formattedMessages, ...prev]);

      if (firstMessageId) {
        setTimeout(() => {
          if (messageListRef.current) {
            const scrollHeightAfter = messageListRef.current.scrollHeight;
            const heightDiff = scrollHeightAfter - scrollHeightBefore;
            messageListRef.current.scrollTop = scrollTopBefore + heightDiff;
          }
        }, 0);
      }
    } catch (err) {
      console.error(`Error fetching messages for ${activeContact.id}:`, err);
      if (err.message.includes('HTTP error! status: 401')) {
        toast.error('Session expired. Please login again.', {
          position: 'top-right',
          autoClose: 3000,
          theme: 'dark',
        });
      } else {
        toast.error(err.message || 'Failed to load messages.', {
          position: 'top-right',
          autoClose: 3000,
          theme: 'dark',
        });
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeContact, userInfo, setMessages, messages, hasMore, isLoadingMore]);

  const handleScroll = () => {
    if (messageListRef.current && hasMore && !isLoadingMore) {
      const { scrollTop } = messageListRef.current;
      if (scrollTop <= 5) {
        const newPage = page + 1;
        setPage(newPage);
        fetchMessages(newPage);
      }
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    const messageText = messageInput.trim();
    if (editingMessageId !== null) {
      if (messageText) onSaveEditedMessage();
      else console.warn('Cannot save empty message.');
    } else if (messageText) {
      onSendTextMessage(messageText);
    }
    if (sendStopTyping) {
      sendStopTyping(activeContact.id);
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (!isUserInGroup) return;
    if (sendTyping && e.target.value.trim() && !editingMessageId) {
      sendTyping(activeContact.id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(activeContact.id);
      }, 2000);
    }
  };

  const handleEmojiClick = (emojiObject) => {
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    const emoji = emojiObject.emoji;
    const textarea = messageInputRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = messageInput.substring(0, start) + emoji + messageInput.substring(end);
      setMessageInput(newValue);
      setTimeout(() => {
        textarea.selectionStart = start + emoji.length;
        textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
      if (sendTyping && !editingMessageId) {
        sendTyping(activeContact.id);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          sendStopTyping(activeContact.id);
        }, 2000);
      }
    }
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        !event.target.closest('.emoji-picker-container') &&
        !event.target.closest('.icon-button[title="Emoji"]')
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  const handleJoinCall = () => {
    if (!activeContact?.id) {
      console.warn('No active contact selected');
      toast.error('Không có liên hệ đang hoạt động', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    console.log('User joined call for room:', activeContact.id);
    setIsVideoCallOpen(true);
    setCallInvite(null);
  };

  const handleDeclineCall = () => {
    if (!activeContact?.id) {
      console.warn('No active contact selected');
      toast.error('Không có liên hệ đang hoạt động', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    console.log('User declined call for room:', activeContact.id);
    setCallInvite(null);
    toast.info('Đã từ chối cuộc gọi', {
      position: 'top-right',
      autoClose: 3000,
      theme: 'dark',
    });
  };

  const handleLeaveRoom = () => {
    if (!isUserInGroup) {
      toast.error('You are not a member of this group.', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'dark',
      });
      return;
    }
    if (socket && activeContact?.id && userInfo?.id) {
      console.log('Emitting leaveRoom for user:', userInfo.id, 'in room:', activeContact.id);
      socket.emit('leaveRoom', {
        conversationId: activeContact.id,
        userId: userInfo.id,
      });
    }
    setIsVideoCallOpen(false);
    setCallInvite(null);
    toast.info('Bạn đã rời cuộc gọi', {
      position: 'top-right',
      autoClose: 3000,
      theme: 'dark',
    });
  };

  if (!activeContact) {
    return (
      <section className="active-chat-panel placeholder">
        <i className="far fa-comments placeholder-icon"></i>
        <span>Select a conversation to start chatting.</span>
      </section>
    );
  }

  const isGroupChat = activeContact.isGroup;
  const isEditingMode = editingMessageId !== null;
  const defaultAvatarPlaceholder = isGroupChat ? defaultGroupAvatar : defaultUserAvatar;

  return (
    <section className="active-chat-panel">
      <header className="chat-header">
        <div className="back-avatar_wrap">
          {isMobile && (
            <button className="icon-button back-button" title="Back" onClick={onMobileBack}>
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div className="contact-info">
            <img
              src={activeContact.avatar || defaultAvatarPlaceholder}
              alt={activeContact.name || 'User Avatar'}
              className="avatar"
            />
            <div className="name-status">
              <span className="contact-name">{activeContact.name || 'Unknown'}</span>
              <span className="contact-status">
                {activeContact.statusText || (isGroupChat ? 'Group' : 'Offline')}
              </span>
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <button
            className={`icon-button ${isCallOngoing || callInvite ? 'ongoing-call' : ''}`}
            title={isCallOngoing ? 'There is an ongoing video call' : callInvite ? 'Join the video call' : 'Video Call'}
            disabled={isEditingMode || sendingMessage || !isUserInGroup}
            onClick={() => {
              if (!isUserInGroup) {
                toast.error('You are not a member of this group.', {
                  position: 'top-right',
                  autoClose: 3000,
                  theme: 'dark',
                });
                return;
              }
              if (isCallOngoing || callInvite) {
                handleJoinCall();
              } else {
                console.log('Starting video call for room:', activeContact.id);
                setIsVideoCallOpen(true);
              }
            }}
          >
            <i className="fas fa-video"></i>
          </button>
          {isGroupChat && onOpenSettings && (
            <button
              className="icon-button"
              title="More Options"
              onClick={() => {
                if (!isUserInGroup) {
                  toast.error('You are not a member of this group.', {
                    position: 'top-right',
                    autoClose: 3000,
                    theme: 'dark',
                  });
                  return;
                }
                onOpenSettings();
              }}
              disabled={isEditingMode || sendingMessage || !isUserInGroup}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
          )}
        </div>
      </header>
      <div className="message-list-container" ref={messageListRef} onScroll={handleScroll}>
        {isLoadingMore && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading more messages...</span>
          </div>
        )}
        {isLoadingMessages ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">Start a conversation!</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              id={msg.id}
              type={msg.type}
              time={msg.time}
              content={msg.content}
              isEdited={msg.isEdited}
              isDeleted={msg.isDeleted}
              senderId={msg.senderId}
              senderName={msg.senderName}
              senderAvatar={msg.senderAvatar}
              isGroupChat={isGroupChat}
              currentUserId={currentUserId}
              status={msg.status}
              onDeleteMessage={onDeleteMessage}
              onEditMessage={onEditMessage}
              editingMessageId={editingMessageId}
            />
          ))
        )}
        {typingUsers.length > 0 && (
          <div className="typing-bubble-list">
            {typingUsers.map((userId) => {
              const memberObj = activeContact.members?.find(
                m => (typeof m.id === 'object' ? m.id._id : m.id) === userId
              );
              const avatarUrl =
                (memberObj && memberObj.id && memberObj.id.avatar) ||
                defaultUserAvatar;
              return (
                <div className="typing-bubble" key={userId}>
                  <img
                    src={avatarUrl}
                    alt="Typing user"
                    className="typing-avatar"
                  />
                  <div className="dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!isUserInGroup && isGroupChat && (
          <div className="group-access-denied-message">
            You are not a member of this group and cannot send messages or participate in this conversation.
          </div>
        )}
        <div ref={messageListEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleFormSubmit}>
        <div className="icon-button attach-button uploadthing-wrapper">
          <UploadButton
            endpoint="conversationUploader"
            key="file-uploader"
            multiple={true}
            disabled={sendingMessage || !activeContact || isEditingMode || !isUserInGroup}
            content={{ button: <i className="fas fa-paperclip"></i> }}
            appearance={{
              button: { padding: 0, height: 'auto', lineHeight: 'normal', pointerEvents: 'all' },
              container: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              },
            }}
            onBeforeUploadBegin={(files) => {
              if (!isUserInGroup) {
                toast.error('You are not a member of this group.', {
                  position: 'top-right',
                  autoClose: 3000,
                  theme: 'dark',
                });
                return false;
              }
              return onUploadBeforeBegin(files);
            }}
            onClientUploadComplete={onClientUploadComplete}
            onUploadError={onUploadError}
            onUploadProgress={onUploadProgress}
          />
        </div>
        <div className="icon-button uploadthing-wrapper">
          <UploadButton
            endpoint="conversationUploader"
            key="image-uploader"
            multiple={true}
            accept="image/*"
            disabled={sendingMessage || !activeContact || isEditingMode || !isUserInGroup}
            content={{ button: <i className="fas fa-camera"></i> }}
            appearance={{
              button: { padding: 0, height: 'auto', lineHeight: 'normal', pointerEvents: 'all' },
              container: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
              },
            }}
            onBeforeUploadBegin={(files) => {
              if (!isUserInGroup) {
                toast.error('You are not a member of this group.', {
                  position: 'top-right',
                  autoClose: 3000,
                  theme: 'dark',
                });
                return false;
              }
              return onUploadBeforeBegin(files);
            }}
            onClientUploadComplete={onClientUploadComplete}
            onUploadError={onUploadError}
            onUploadProgress={onUploadProgress}
          />
        </div>
        <textarea
          ref={messageInputRef}
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (
                !isLoadingMessages &&
                activeContact &&
                !sendingMessage &&
                (isEditingMode || messageInput.trim()) &&
                isUserInGroup
              ) {
                document.querySelector('.send-button').click();
              }
            }
          }}
          placeholder={isEditingMode ? 'Editing message...' : 'Type your message here'}
          className={`message-input ${isEditingMode ? 'editing-mode' : ''}`}
          name="messageInput"
          autoComplete="off"
          disabled={isLoadingMessages || !activeContact || sendingMessage || !isUserInGroup}
          rows={isEditingMode ? 2 : 1}
          style={{ resize: isEditingMode ? 'vertical' : 'none' }}
        />
        <button
          type="button"
          className="icon-button"
          title="Emoji"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={sendingMessage || !activeContact || isEditingMode || !isUserInGroup}
        >
          <i className="far fa-smile"></i>
        </button>
        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <Picker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        {isEditingMode && (
          <button
            type="button"
            className="icon-button cancel-edit-button"
            title="Cancel Edit"
            onClick={onCancelEdit}
            disabled={sendingMessage}
          >
            <i className="fas fa-times"></i>
          </button>
        )}
        <button
          type="submit"
          className="icon-button send-button"
          title={isEditingMode ? 'Save Edit' : 'Send Message'}
          disabled={
            isLoadingMessages ||
            !activeContact ||
            sendingMessage ||
            (!isEditingMode && !messageInput.trim()) ||
            !isUserInGroup
          }
        >
          {sendingMessage ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : isEditingMode ? (
            <i className="fas fa-check"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>
      </form>
      {callInvite && (
        <div className="call-invite-popup">
          <div className="call-invite-content">
            <p>
              {callInvite.username} has started a video call in room {callInvite.roomId}. Join or decline?
            </p>
            <button onClick={handleJoinCall}>Join</button>
            <button onClick={handleDeclineCall}>Decline</button>
          </div>
        </div>
      )}
      {isVideoCallOpen && (
        <VideoCall
          roomId={activeContact.id}
          userId={userInfo.id}
          onClose={handleLeaveRoom}
        />
      )}
    </section>
  );
};

export default ChatWindow;