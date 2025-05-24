import React from 'react';
import defaultUserAvatar from '../../assets/images/avatar_male.jpg';
import defaultGroupAvatar from '../../assets/images/group-chat.png';

const ConversationItem = ({
  type,
  id,
  avatar,
  name,
  lastMessage,
  time,
  unread,
  status,
  onClick,
  isActive,
  onReadConversation,
  lastMessageType,
  ongoingCallRoomId
}) => {
  const defaultAvatar = type === 'group' ? defaultGroupAvatar : defaultUserAvatar;

  // Xác định icon dựa trên lastMessageType và unread
  let icon = null;
  if (unread === 0 && (lastMessageType === 'system' || lastMessageType === 'notification')) {
    icon = <i className="fas fa-info-circle system-icon" title="System notification"></i>;
  }

  // Thêm icon cho cuộc gọi đang diễn ra nếu isCallOngoing là true
  let callIcon = null;
  console.log('ongoingCallRoomId:', ongoingCallRoomId, 'id:', id);
  if (ongoingCallRoomId === id) {
    callIcon = <i className="fas fa-video call-icon" title="Đang có cuộc gọi"></i>;
  }

  return (
    <li
      className={`conversation-list-item ${isActive ? 'active' : ''}`}
      onClick={() => {
        onReadConversation(id);
        onClick(type, id);
      }}
    >
      <img src={avatar || defaultAvatar} alt={name} className="avatar" />
      <div className="conversation-details">
        <span className="conversation-name">{name || 'Unknown'}</span>
        <span className="last-message">{lastMessage || 'No messages yet.'}</span>
      </div>
      <div className="conversation-meta">
        <span className="timestamp">{time || ''}</span>
        <div className="icon-container">
          {callIcon}
          {icon}
        </div>
        {unread > 0 ? (
          <span className="unread-badge">{unread}</span>
        ) : status === 'sent-read' ? (
          <i className="fas fa-check-double message-status-icon"></i>
        ) : null}
      </div>
    </li>
  );
};

export default ConversationItem;