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
    <div className="notification-list-container">
      {type === 'discover' ? (
        suggestions.length === 0 ? (
          <div className="no-suggestions">
            <i className="fas fa-exclamation-circle" aria-hidden="true"></i> No new friend suggestions
          </div>
        ) : (
          <ul className="notification-list">
            {suggestions.map(item => (
              <FriendSuggestionItem
                key={item.id}
                item={item}
                userInfo={userInfo}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )
      ) : (
        (items || []).length === 0 ? (
          <div className="no-notifications">
            <i className="fas fa-exclamation-circle" aria-hidden="true"></i> No new notifications
          </div>
        ) : (
          <ul className="notification-list">
            {(items || []).map(item => (
              <NotificationItem key={item.id} item={item} />
            ))}
          </ul>
        )
      )}
    </div>
  );
};

export default NotificationList;