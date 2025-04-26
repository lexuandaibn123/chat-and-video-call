import React from 'react';
// Đảm bảo đường dẫn placeholder chính xác
import defaultUserAvatar from '../../assets/images/avatar_placeholder.jpg';
import defaultGroupAvatar from '../../assets/images/avatar_placeholder.jpg';

const ConversationItem = ({ type, id, avatar, name, lastMessage, time, unread, status, onClick, isActive }) => {
  // Chọn avatar mặc định dựa trên type
  const defaultAvatar = type === 'group' ? defaultGroupAvatar : defaultUserAvatar;

  return (
    // Thêm class 'active' nếu đây là item đang được chọn
    <li
      className={`conversation-list-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(type, id)} // Gọi hàm onClick với type và id
    >
      {/* Sử dụng avatar từ prop, fallback về default */}
      <img src={avatar || defaultAvatar} alt={name} className="avatar" />
      <div className="conversation-details">
        {/* Sử dụng name và lastMessage từ prop */}
        <span className="conversation-name">{name || 'Unknown'}</span>
        <span className="last-message">{lastMessage || 'No messages yet.'}</span>
      </div>
      <div className="conversation-meta">
        {/* Sử dụng time và unread từ prop */}
        <span className="timestamp">{time || ''}</span> {/* Hiển thị thời gian nếu có */}
        {/* Hiển thị badge unread hoặc status icon */}
        {unread > 0 ? (
          <span className="unread-badge">{unread}</span>
        ) : status === 'sent-read' ? ( // Cần logic để xác định status này
          <i className="fas fa-check-double message-status-icon"></i>
        ) : null }
      </div>
    </li>
  );
};

export default ConversationItem;