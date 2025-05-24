import React, { useState } from 'react';
import FriendSuggestionItem from './FriendSuggestionItem';
import NotificationItem from './NotificationItem';

const NotificationList = ({ type, items, userInfo }) => {
  const [suggestions, setSuggestions] = useState(items || []);
  React.useEffect(() => {
    setSuggestions(items || []);
  }, [items]);

  const handleRemove = (id) => {
    setSuggestions(prev => prev.filter(item => item.id !== id));
  };

  return (
    <ul className="notification-list">
      {type === 'discover'
        ? suggestions.map(item => (
            <FriendSuggestionItem
              key={item.id}
              item={item}
              userInfo={userInfo}
              onRemove={handleRemove}
            />
          ))
        : (items || []).map(item => (
            <NotificationItem key={item.id} item={item} />
          ))}
    </ul>
  );
};

export default NotificationList;