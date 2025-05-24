import React from 'react';

const NotificationItem = ({ item }) => {
  // Xác định là thông báo tổng comment/react (id kết thúc bằng -react-summary hoặc -comment-summary)
  const isSummary = item.id?.endsWith('-react-summary') || item.id?.endsWith('-comment-summary');

  return (
    <li className="notification-item">
      {isSummary ? (
        // Bell icon SVG, cùng kích thước với profile-image
        <span className="profile-image bell-icon" aria-label="notification">
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
            <circle cx="25" cy="25" r="25" fill="#f1f3f6"/>
            <path d="M25 40c2.2 0 4-1.8 4-4h-8c0 2.2 1.8 4 4 4zm10-8V22c0-5.1-3.3-9.3-8-10.3V10a2 2 0 10-4 0v1.7c-4.7 1-8 5.2-8 10.3v10l-2 2v1h28v-1l-2-2z" fill="#FFD600"/>
          </svg>
        </span>
      ) : (
        <img src={item.image} alt={item.user} className="profile-image" />
      )}
      <div className="item-info">
        <p className="item-action">
          <span>{item.icon}</span> {item.user || 'Unknown User'} {item.action}
        </p>
        <p className="item-details">
          {item.action.includes('new post') || item.action.includes('new photo')
            ? item.contentPreview
            : item.action.includes('liked')
            ? `${item.user} and ${item.reactCount - 1} others liked your post.`
            : item.action.includes('commented')
            ? `${item.user} and ${item.commentCount - 1} others commented on your post.`
            : item.contentPreview}
        </p>
        <p className="item-time">{item.time}</p>
      </div>
    </li>
  );
};

export default NotificationItem;