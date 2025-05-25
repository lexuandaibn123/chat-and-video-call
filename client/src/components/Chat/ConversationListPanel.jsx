import React, { useState, useRef, useCallback } from 'react';
import ConversationItem from './ConversationItem';
import defaultAvatarPlaceholder from '../../assets/images/avatar_male.jpg';
import { getFriendsApi } from "../../api/users";
import { getMyRoomsApi } from '../../api/conversations';
import { processRawRooms } from '../../services/chatService';
import {toast} from 'react-toastify';
import "./Modal.scss";

const ConversationListPanel = ({
  userInfo,
  groups,
  friends,
  onSearchChange,
  onItemClick,
  activeChat,
  onAddClick,
  onCreateConversation,
  addUserSearchResults,
  onAddUserSearch,
  setConversations,
  ongoingCallRoomId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [conversationName, setConversationName] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [page, setPage] = useState(1); // State để theo dõi trang hiện tại
  const [hasMore, setHasMore] = useState(true); // State để kiểm tra còn dữ liệu hay không
  const [isLoadingConversations, setIsLoadingConversations] = useState(false); // State để quản lý trạng thái tải
  const listRef = useRef(null); // Ref để tham chiếu đến danh sách

  const allConversations = [
    ...groups.map(g => ({ ...g, type: 'group' })),
    ...friends.map(f => ({ ...f, type: 'friend' }))
  ].sort((a, b) => {
    const aTime = a.latestMessageTimestamp || a.time || 0;
    const bTime = b.latestMessageTimestamp || b.time || 0;
    const aTs = typeof aTime === 'string' ? new Date(aTime).getTime() : aTime;
    const bTs = typeof bTime === 'string' ? new Date(bTime).getTime() : bTime;
    return bTs - aTs;
  });

  // Hàm fetch dữ liệu với hỗ trợ phân trang
  const fetchInitialData = useCallback(async (pageNum) => {
    const currentUserId = userInfo?._id;
    if (!currentUserId) {
      console.warn('fetchInitialData: User ID is not set.');
      setIsLoadingConversations(false);
      setConversations([]);
      return;
    }
    console.log('Fetching rooms for user:', currentUserId, 'page:', pageNum);
    setIsLoadingConversations(true);
    try {
      const rooms = await getMyRoomsApi(pageNum); // Giả sử API chấp nhận tham số page
      if (rooms.length === 0) {
        setHasMore(false); // Không còn dữ liệu để tải
        return;
      }
      const conversationsData = processRawRooms(rooms, currentUserId);
      setConversations(prev => [...prev, ...conversationsData]); // Thêm dữ liệu mới vào conversations
      console.log('Processed conversations:', conversationsData);
    } catch (err) {
      console.error('Error fetching chat data:', err);
      if (err.message.includes('HTTP error! status: 401') || err.message.includes('not authenticated')) {
        setConversations([]);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  }, [userInfo, setConversations]);

  // Xử lý sự kiện cuộn
  const handleScroll = () => {
    if (listRef.current && hasMore && !isLoadingConversations) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5) { // Cách đáy 5px
        setPage(prevPage => prevPage + 1);
        fetchInitialData(page + 1);
      }
    }
  };

  // Các hàm khác giữ nguyên
  const handleReadConversation = (id) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, unread: 0, lastMessageType: '' } : conv
      )
    );
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSearchTerm('');
    setSelectedUsers([]);
    setConversationName('');
    setHasSearched(false);
    setFriendSuggestions([]);
    setHighlightIndex(-1);
    onAddClick();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchTerm('');
    setSelectedUsers([]);
    setConversationName('');
    setHasSearched(false);
    setFriendSuggestions([]);
    setHighlightIndex(-1);
  };

  const handleSearchChange = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setHasSearched(false);
    setHighlightIndex(-1);

    if (term.trim()) {
      try {
        const friends = await getFriendsApi(term);
        setFriendSuggestions(friends);
      } catch (error) {
        console.error("Failed to fetch friend suggestions:", error);
        setFriendSuggestions([]);
      }
    } else {
      setFriendSuggestions([]);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onAddUserSearch(searchTerm);
      setHasSearched(true);
      setFriendSuggestions([]);
      setHighlightIndex(-1);
    } else {
      setHasSearched(false);
      setFriendSuggestions([]);
      setHighlightIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (friendSuggestions.length === 0) {
      if (e.key === 'Enter') handleSearch();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(idx => idx < friendSuggestions.length - 1 ? idx + 1 : idx);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(idx => idx > 0 ? idx - 1 : idx);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0) {
          handleSelectSuggestion(friendSuggestions[highlightIndex]);
        } else {
          handleSearch();
        }
        break;
      default:
        break;
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUsers(prev =>
      prev.some(u => u._id === user._id)
        ? prev.filter(u => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleSelectSuggestion = (user) => {
    handleSelectUser(user);
    setSearchTerm('');
    setFriendSuggestions([]);
    setHighlightIndex(-1);
  };

  const handleCreateConversation = () => {
    if (!selectedUsers.length) {
      toast.warning("Please select at least one user to create a conversation.");
      return;
    }

    let name = conversationName;
    if (!name) {
      const creatorName = userInfo.fullName || userInfo.email || userInfo._id;
      if (selectedUsers.length === 1) {
        name = `${creatorName}, ${selectedUsers[0].fullName || selectedUsers[0].email || selectedUsers[0]._id}`;
      } else if (selectedUsers.length === 2) {
        name = `${creatorName}, ${selectedUsers.map(u => u.fullName || u.email || u._id).join(', ')}`;
      } else {
        const firstTwo = selectedUsers.slice(0, 2).map(u => u.fullName || u.email || u._id);
        name = `${creatorName}, ${firstTwo.join(', ')}, ... (+${selectedUsers.length - 2})`;
      }
    }

    onCreateConversation(selectedUsers.map(u => u._id), name);
    handleCloseModal();
  };

  return (
    <aside className="conversation-list-panel">
      <div className="search-bar-row">
        <div className="search-bar-container">
          <i className="fas fa-search search-icon" />
          <input
            type="text"
            placeholder="Search"
            className="search-input"
            onChange={onSearchChange}
          />
        </div>
        <button className="add-button" onClick={handleOpenModal} title="Add friend or group">
          <i className="fas fa-plus" />
        </button>
      </div>

      <section className="conversation-section">
        <ul className="conversation-list" ref={listRef} onScroll={handleScroll}>
          {allConversations.map(conv => (
            <ConversationItem
              key={conv.id}
              id={conv.id}
              type={conv.type}
              avatar={conv.avatar}
              name={conv.name}
              lastMessage={conv.lastMessage}
              time={conv.time}
              unread={conv.unread || 0}
              status={conv.status}
              onClick={onItemClick}
              isActive={activeChat?.id === conv.id}
              lastMessageType={conv.lastMessageType || ''}
              onReadConversation={handleReadConversation}
              ongoingCallRoomId={ongoingCallRoomId}
            />
          ))}
        </ul>
        {isLoadingConversations && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span>Loading more...</span>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>New Conversation</h2>
            <button className="modal-close-button" onClick={handleCloseModal} title="Close">
              <i className="fas fa-times" />
            </button>

            <hr />

            <div className="modal-input-group">
              <label>Group Name (optional):</label>
              <input
                type="text"
                placeholder="Enter group name"
                value={conversationName}
                onChange={e => setConversationName(e.target.value)}
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="modal-input-group">
                <label>Selected Users:</label>
                <ul className="selected-users-list">
                  {selectedUsers.map(u => (
                    <li key={u._id} className="selected-user-item">
                      <span>{u.fullName || u.email || u._id}</span>
                      <button
                        className="remove-user-button"
                        onClick={() => handleSelectUser(u)}
                        title="Remove"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                  <i className="fas fa-search" />
                </button>

                {friendSuggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {friendSuggestions.map((f, idx) => (
                      <div
                        key={f._id}
                        className={`suggestion-item${idx === highlightIndex ? ' highlighted' : ''}`}
                        onClick={() => handleSelectSuggestion(f)}
                      >
                        <div className="name-avatar">
                          <img
                            src={f.avatar || defaultAvatarPlaceholder}
                            alt={f.fullName || f.email || f._id}
                            className="avatar tiny"
                          />
                          <span>{f.fullName || f.email || f._id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {hasSearched && !addUserSearchResults.length && (
              <div className="no-results">User not found</div>
            )}
            {addUserSearchResults.length > 0 && (
              <div className="search-results">
                {addUserSearchResults.map(u => (
                  <div
                    key={u._id}
                    className={`search-result-item ${selectedUsers.some(s => s._id === u._id) ? 'selected' : ''}`}
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className="name-avatar">
                      <img
                        src={u.avatar || defaultAvatarPlaceholder}
                        alt={u.fullName || u.email || u._id}
                        className="avatar tiny"
                      />
                      <span>{u.fullName || u.email || u._id}</span>
                    </div>
                    {selectedUsers.some(s => s._id === u._id) && <span className="selected-icon">✔</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={handleCloseModal}>Cancel</button>
              <button
                onClick={handleCreateConversation}
                disabled={!selectedUsers.length}
              >
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