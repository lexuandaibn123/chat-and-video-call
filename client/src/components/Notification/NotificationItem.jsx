import React from 'react';

const NotificationItem = ({ item }) => {
  return (
    <li className="notification-item">
      <img src={item.image} alt={item.user} className="profile-image" />
      <div className="item-info">
        <p className="item-action">
          <span>{item.icon}</span> {item.user || 'Unknown User'} {item.action}
        </p>
        <p className="item-details">{item.contentPreview}</p>
        <p className="item-time">{item.time}</p>
      </div>
    </li>
  );
};

export default NotificationItem;