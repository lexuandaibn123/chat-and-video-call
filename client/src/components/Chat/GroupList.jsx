import React from 'react';
import ConversationItem from './ConversationItem';

const GroupList = ({ groups, onItemClick, activeChat }) => {
  return (
    <section className="conversation-section">
      <h2 className="section-title">Groups</h2>
      <ul className="conversation-list">
        {groups.map(group => (
          <ConversationItem
            key={group.id}
            id={group.id}
            type="group"
            avatar={group.avatar}
            name={group.name}
            lastMessage={group.lastMessage}
            time={group.time}
            unread={group.unread || 0}
            onClick={onItemClick}
            // Kiểm tra xem item này có đang active không
            isActive={activeChat?.type === 'group' && activeChat?.id === group.id}
          />
        ))}
      </ul>
    </section>
  );
};

export default GroupList;