import React from 'react';
import FriendSuggestionItem from './FriendSuggestionItem';
import NotificationItem from './NotificationItem';

const NotificationList = ({ type, items }) => {
  // Default to empty array if items is undefined
  const safeItems = items || [];

  return (
    <ul className="notification-list">
      {safeItems.map(item =>
        type === 'discover' ? (
          <FriendSuggestionItem key={item.id} item={item} />
        ) : (
          <NotificationItem key={item.id} item={item} />
        )
      )}
    </ul>
  );
};

export default NotificationList;