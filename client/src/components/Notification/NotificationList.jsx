import React from 'react';
import FriendSuggestionItem from './FriendSuggestionItem';
import NotificationItem from './NotificationItem';

const NotificationList = ({ type, items }) => {
  return (
    <ul className="notification-list">
      {items.map(item =>
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