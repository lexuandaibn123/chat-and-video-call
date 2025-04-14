import React from 'react';
import defaultUserAvatar from '../../assets/images/avatar_placeholder.jpg';
import defaultGroupAvatar from '../../assets/images/avatar_placeholder.jpg';

// Component này không cần SCSS riêng nếu dùng Chat.scss chung

const ConversationItem = ({ type, id, avatar, name, lastMessage, time, unread, status, onClick, isActive }) => {
  const defaultAvatar = type === 'group' ? defaultGroupAvatar : defaultUserAvatar; // Cập nhật đường dẫn ảnh mặc định

  return (
    // Thêm class 'active' nếu đây là item đang được chọn
    <li
      className={`conversation-list-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(type, id)} // Gọi hàm onClick khi li được nhấn
    >
      <img src={avatar || defaultAvatar} alt={name} className="avatar" />
      <div className="conversation-details">
        <span className="conversation-name">{name}</span>
        <span className="last-message">{lastMessage}</span>
      </div>
      <div className="conversation-meta">
        <span className="timestamp">{time}</span>
        {unread > 0 ? (
          <span className="unread-badge">{unread}</span>
        ) : status === 'sent-read' ? (
          <i className="fas fa-check-double message-status-icon"></i>
        ) : null }
      </div>
    </li>
  );
};

export default ConversationItem;