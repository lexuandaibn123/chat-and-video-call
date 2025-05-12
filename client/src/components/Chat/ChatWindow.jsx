import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import Picker from 'emoji-picker-react';
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';
import { UploadButton } from '../../utils/uploadthing';
import VideoCall from '../VideoCall/VideoCall';

const ChatWindow = ({
  activeContact,
  messages,
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
}) => {
  const messageListEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [callInvite, setCallInvite] = useState(null);

  useEffect(() => {
    if (!socket || !activeContact?.id || !userInfo?.id) {
      console.warn('Socket, activeContact.id, or userInfo.id is missing:', {
        socket,
        activeContactId: activeContact?.id,
        userId: userInfo?.id,
      });
      return;
    }

    // Tham gia phòng cuộc trò chuyện
    socket.emit('joinConversationRoom', { conversationId: activeContact.id });

    const handleCallStarted = (data) => {
      console.log('Received callStarted event:', data);
      if (data.roomId === activeContact.id && !isVideoCallOpen && !callInvite) {
        setCallInvite(data);
        toast.info(`${data.username} đã bắt đầu một cuộc gọi video`, {
          position: 'top-right',
          autoClose: 5000,
          theme: 'dark',
        });
      } else {
        console.warn('callStarted ignored:', {
          receivedRoomId: data.roomId,
          activeContactId: activeContact.id,
          isVideoCallOpen,
          hasCallInvite: !!callInvite,
        });
      }
    };

    socket.on('callStarted', handleCallStarted);

    return () => {
      console.log('Cleaning up socket listeners for activeContact:', activeContact?.id);
      socket.off('callStarted', handleCallStarted);
      socket.emit('leaveConversationRoom', { conversationId: activeContact.id });
    };
  }, [socket, activeContact?.id, userInfo?.id, isVideoCallOpen, callInvite]);

  useEffect(() => {
    if (!isLoadingMessages && editingMessageId === null) {
      messageListEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isLoadingMessages, editingMessageId]);

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

  const handleFormSubmit = (event) => {
    event.preventDefault();
    const messageText = messageInput.trim();
    if (editingMessageId !== null) {
      if (messageText) onSaveEditedMessage();
      else console.warn('Cannot save empty message.');
    } else if (messageText) {
      onSendTextMessage(messageText);
    }
  };

  const handleInputChange = (e) => setMessageInput(e.target.value);

  const handleEmojiClick = (emojiObject) => {
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
    console.log('User declined call for room:', activeContact.id);
    setCallInvite(null);
    toast.info('Đã từ chối cuộc gọi', {
      position: 'top-right',
      autoClose: 3000,
      theme: 'dark',
    });
  };

  const handleLeaveRoom = () => {
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

  return (
    <section className="active-chat-panel">
      <header className="chat-header">
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
        <div className="chat-actions">
          <button className="icon-button" title="Call" disabled={isEditingMode || sendingMessage}>
            <i className="fas fa-phone-alt"></i>
          </button>
          <button
            className="icon-button"
            title="Video Call"
            disabled={isEditingMode || sendingMessage || isVideoCallOpen}
            onClick={() => {
              console.log('Starting video call for room:', activeContact.id);
              setIsVideoCallOpen(true);
            }}
          >
            <i className="fas fa-video"></i>
          </button>
          {isGroupChat && onOpenSettings && (
            <button
              className="icon-button"
              title="More Options"
              onClick={onOpenSettings}
              disabled={isEditingMode || sendingMessage}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
          )}
        </div>
      </header>
      <div className="message-list-container">
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
        <div ref={messageListEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleFormSubmit}>
        <div className="icon-button attach-button uploadthing-wrapper">
          <UploadButton
            endpoint="conversationUploader"
            key="file-uploader"
            disabled={sendingMessage || !activeContact || isEditingMode}
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
            onBeforeUploadBegin={onUploadBeforeBegin}
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
            disabled={sendingMessage || !activeContact || isEditingMode}
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
            onBeforeUploadBegin={onUploadBeforeBegin}
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
                (isEditingMode || messageInput.trim())
              ) {
                document.querySelector('.send-button').click();
              }
            }
          }}
          placeholder={isEditingMode ? 'Editing message...' : 'Type your message here...'}
          className={`message-input ${isEditingMode ? 'editing-mode' : ''}`}
          name="messageInput"
          autoComplete="off"
          disabled={isLoadingMessages || !activeContact || sendingMessage}
          rows={isEditingMode ? 2 : 1}
          style={{ resize: isEditingMode ? 'vertical' : 'none' }}
        />
        <button
          type="button"
          className="icon-button"
          title="Emoji"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={sendingMessage || !activeContact || isEditingMode}
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
            (!isEditingMode && !messageInput.trim())
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