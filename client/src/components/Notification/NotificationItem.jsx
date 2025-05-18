import React from 'react';

const NotificationItem = ({ item }) => {
  return (
    <li className="notification-item">
      <img src={item.image} alt={item.user} className="profile-image" />
      <div className="item-info">
        <p className="item-action">
          {item.user} {item.action}
        </p>
        <p className="item-details">{item.details}</p>
        <p className="item-time">{item.time}</p>
      </div>
    </li>
  );
};

export default NotificationItem;