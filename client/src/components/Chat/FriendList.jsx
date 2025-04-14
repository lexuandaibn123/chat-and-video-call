import React from 'react';
import ConversationItem from './ConversationItem';

const FriendList = ({ friends, onItemClick, activeChat }) => {
  return (
    <section className="conversation-section">
      <h2 className="section-title">Friends</h2>
      <ul className="conversation-list">
        {friends.map(friend => (
          <ConversationItem
            key={friend.id}
            id={friend.id}
            type="friend"
            avatar={friend.avatar}
            name={friend.name}
            lastMessage={friend.lastMessage}
            time={friend.time}
            unread={friend.unread || 0}
            status={friend.status}
            onClick={onItemClick}
             // Kiểm tra xem item này có đang active không
            isActive={activeChat?.type === 'friend' && activeChat?.id === friend.id}
          />
        ))}
      </ul>
    </section>
  );
};

export default FriendList;