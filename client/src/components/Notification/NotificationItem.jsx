import React from 'react';

const NotificationItem = ({ item }) => {
  return (
    <li className="notification-item">
      <img src={item.image} alt={item.user} className="profile-image" />
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