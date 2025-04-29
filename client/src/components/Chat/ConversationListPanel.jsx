import React, { useState } from 'react';
import GroupList from './GroupList';
import FriendList from './FriendList';

const ConversationListPanel = ({ groups, friends, onSearchChange, onItemClick, activeChat, onAddClick, onCreateConversation, addUserSearchResults, onAddUserSearch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [conversationName, setConversationName] = useState('');

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSearchTerm('');
    setSelectedUsers([]);
    setConversationName('');
    onAddClick();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchTerm('');
    setSelectedUsers([]);
    setConversationName('');
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onAddUserSearch(searchTerm);
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
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreateConversation = () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to create a conversation.');
      return;
    }

    const members = selectedUsers.map((user) => user._id);
    onCreateConversation(members, conversationName || undefined);
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
            <h2>Create New Conversation</h2>
            <button className="modal-close-button" onClick={handleCloseModal}>
              ×
            </button>

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
                        ×
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
            {addUserSearchResults.length > 0 && (
              <ul className="search-results">
                {addUserSearchResults.map((user) => (
                  <li
                    key={user._id}
                    className={`search-result-item ${
                      selectedUsers.some((u) => u._id === user._id) ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <span>{user.fullName || user.email || user._id}</span>
                    {selectedUsers.some((u) => u._id === user._id) && (
                      <span className="selected-icon">✔</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

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

// Inline CSS for modal (can be moved to a separate CSS file)
const styles = `
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    position: relative;
  }
  .modal-close-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
  }
  .modal-input-group {
    margin-bottom: 15px;
  }
  .modal-input-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  .modal-input-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .search-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .search-container input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .search-button {
    padding: 8px 12px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .search-button:hover {
    background: #0056b3;
  }
  .selected-users-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    max-height: 100px;
    overflow-y: auto;
  }
  .selected-user-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  .selected-user-item:last-child {
    border-bottom: none;
  }
  .remove-user-button {
    background: #ff4d4f;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
  }
  .search-results {
    list-style: none;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .search-result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    cursor: pointer;
  }
  .search-result-item:hover {
    background: #f0f0f0;
  }
  .search-result-item.selected {
    background: #e0e0e0;
  }
  .selected-icon {
    color: #28a745;
    font-weight: bold;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  .modal-actions button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .modal-actions button:first-child {
    background: #ccc;
  }
  .modal-actions button:last-child {
    background: #007bff;
    color: white;
  }
  .modal-actions button:disabled {
    background: #aaa;
    cursor: not-allowed;
  }
`;

// Inject styles into the document
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default ConversationListPanel;