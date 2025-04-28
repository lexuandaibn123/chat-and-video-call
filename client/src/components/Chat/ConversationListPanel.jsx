import React from 'react';
import GroupList from './GroupList';
import FriendList from './FriendList';

const ConversationListPanel = ({ groups, friends, onSearchChange, onItemClick, activeChat, onAddClick }) => {
  return (
    <aside className="conversation-list-panel">
      <div className="search-bar-row">
        <div className="search-bar-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Search"
            className="search-input"
            onChange={onSearchChange}
          />
        </div>
        <button className="add-button" onClick={onAddClick} title="Add friend or group">
          <i className="fas fa-plus"></i>
        </button>
      </div>
      <FriendList friends={friends} onItemClick={onItemClick} activeChat={activeChat} />
      <GroupList groups={groups} onItemClick={onItemClick} activeChat={activeChat} />
    </aside>
  );
};

export default ConversationListPanel;