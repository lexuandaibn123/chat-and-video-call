import React, { useState } from 'react';
import GroupList from './GroupList';
import FriendList from './FriendList';
import defaultAvatarPlaceholder from '../../assets/images/avatar_male.jpg';
import "./Modal.scss";

const ConversationListPanel = ({ userInfo, groups, friends, onSearchChange, onItemClick, activeChat, onAddClick, onCreateConversation, addUserSearchResults, onAddUserSearch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [conversationName, setConversationName] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSearchTerm('');
    setSelectedUsers([]);
    setConversationName('');
    setHasSearched(false);
    onAddClick();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchTerm('');
    setSelectedUsers([]);
    setConversationName('');
    setHasSearched(false);
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setHasSearched(false);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onAddUserSearch(searchTerm);
      setHasSearched(true);
    } else {
      setHasSearched(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== u._id)
        : [...prev, user]
    );
  };

  const handleCreateConversation = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to create a conversation.');
      return;
    }

    let processedConversationName = conversationName || '';
    if (!processedConversationName && selectedUsers.length > 0) {
      if (selectedUsers.length <= 2) {
        processedConversationName = selectedUsers.map(user => user.fullName || user._id || 'Unknown').join(', ');
      } else {
        const firstTwoUsers = selectedUsers.slice(0, 2).map(user => user.fullName || user._id || 'Unknown');
        const remainingCount = selectedUsers.length - 2;
        processedConversationName = `${userInfo.fullName}, ` + firstTwoUsers.join(', ') + `, ... (+${remainingCount})`;
      }
    }

    const members = selectedUsers.map((user) => user._id);
    onCreateConversation(members, processedConversationName || undefined);
    handleCloseModal();
  };

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
        <button className="add-button" onClick={handleOpenModal} title="Add friend or group">
          <i className="fas fa-plus"></i>
        </button>
      </div>
      <FriendList friends={friends} onItemClick={onItemClick} activeChat={activeChat} />
      <GroupList groups={groups} onItemClick={onItemClick} activeChat={activeChat} />

      {/* Modal for creating a new conversation */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>New Conversation</h2>
            <button className="modal-close-button" onClick={handleCloseModal} title="Exit">
              <i className="fas fa-times"></i>
            </button>

            <hr />

            {/* Input for group name (optional) */}
            <div className="modal-input-group">
              <label>Group Name (optional):</label>
              <input
                type="text"
                placeholder="Enter group name"
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
              />
            </div>

            {/* Display selected users */}
            {selectedUsers.length > 0 && (
              <div className="modal-input-group">
                <label>Selected Users:</label>
                <ul className="selected-users-list">
                  {selectedUsers.map((user) => (
                    <li key={user._id} className="selected-user-item">
                      <span>{user.fullName || user.email || user._id}</span>
                      <button
                        className="remove-user-button"
                        onClick={() => handleSelectUser(user)}
                        title="Remove user"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search users */}
            <div className="modal-input-group">
              <label>Search Users:</label>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search by email or ID"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                />
                <button className="search-button" onClick={handleSearch}>
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>

            {/* Search results */}
            {hasSearched && addUserSearchResults.length === 0 ? (
              <div className="no-results">User not found</div>
            ) : addUserSearchResults.length > 0 ? (
              <div className="search-results">
                {addUserSearchResults.map((user) => (
                  <div
                    key={user._id}
                    className={`search-result-item ${
                      selectedUsers.some((u) => u._id === user._id) ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className = "name-avatar">
                      <img
                        src={user.avatar || defaultAvatarPlaceholder}
                        alt={user.fullName || user.email || user._id}
                        className="avatar tiny"
                      />
                      <span>{user.fullName || user.email || user._id}</span>
                    </div>
                    {selectedUsers.some((u) => u._id === user._id) && (
                      <span className="selected-icon">✔</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="modal-actions">
              <button onClick={handleCloseModal}>Cancel</button>
              <button onClick={handleCreateConversation} disabled={selectedUsers.length === 0}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ConversationListPanel;