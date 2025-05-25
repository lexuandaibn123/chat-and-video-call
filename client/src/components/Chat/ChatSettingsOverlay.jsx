import React, { useState, useEffect } from 'react';
import defaultUserAvatar from '../../assets/images/avatar_male.jpg';
import defaultGroupAvatar from '../../assets/images/group-chat.png';
import { UploadButton } from '../../utils/uploadthing';
import { toast } from 'react-toastify';
import { getUserDetailsApi, getFriendsApi } from "../../api/users";

const ChatSettingsOverlay = ({
  group,
  currentUserId,
  onClose,
  onRemoveUser,
  onChangeLeader,
  onStepDownLeader,
  onAddUserSearch,
  onAddUserConfirm,
  isPerformingAction,
  actionError,
  searchResults,
  onLeaveGroup,
  onDeleteGroup,
  onDeleteConversationMember,
  onUpdateGroupName,
  updateConversationAvatar
  }) => {
    if (!group || !group.isGroup || !group.members) {
      if (group?.isGroup) console.warn("ChatSettingsOverlay received group data with missing members.");
      return null;
  }

  const [addUserInput, setAddUserInput] = useState('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(group.name);
  const [avatarUrl, setAvatarUrl] = useState(group.avatar || defaultGroupAvatar);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [processedMembers, setProcessedMembers] = useState([]);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  // Hàm trợ giúp xử lý ID
  const getProcessedUserId = (userData) => {
    if (!userData) return null;
    if (typeof userData === 'object' && userData._id) {
      return String(userData._id).trim();
    }
    if (typeof userData === 'string') {
      return String(userData).trim();
    }
    return null;
  };

  // Xử lý group.members để chuyển id thành object
  useEffect(() => {
    const processMembers = async () => {
      const userCache = {};
      const uniqueIdsToFetch = new Set();

      group.members.forEach(member => {
        const userId = getProcessedUserId(member.id);
        if (userId && typeof member.id === 'string') {
          uniqueIdsToFetch.add(userId);
        }
      });

      await Promise.all(
        Array.from(uniqueIdsToFetch).map(async userId => {
          try {
            const user = await getUserDetailsApi(userId);
            userCache[userId] = {
              _id: userId,
              fullName: user.fullName || 'Unknown User',
              email: user.email || '',
              avatar: user.avatar || null,
            };
          } catch (err) {
            console.error(`Error fetching details for ${userId}:`, err);
            userCache[userId] = {
              _id: userId,
              fullName: 'Unknown User',
              email: '',
              avatar: null,
            };
          }
        })
      );

      const updatedMembers = group.members.map(member => {
        const userId = getProcessedUserId(member.id);
        if (!userId) {
          console.warn('Invalid member.id:', member);
          return null;
        }

        let idData;
        if (typeof member.id === 'string') {
          idData = userCache[userId];
        } else if (typeof member.id === 'object' && member.id._id) {
          idData = {
            _id: userId,
            fullName: member.id.fullName || 'Unknown User',
            email: member.id.email || '',
            avatar: member.id.avatar || null,
          };
        } else {
          console.warn('Invalid member.id format:', member);
          return null;
        }

        return {
          ...member,
          id: idData,
        };
      }).filter(m => m !== null);

      setProcessedMembers(updatedMembers);
    };

    processMembers();
  }, [group.members]);

  useEffect(() => {
    setNewGroupName(group.name);
    setIsEditingName(false);
    setAddUserInput('');
    setSelectedUserToAdd(null);
    setAvatarUrl(group.avatar || defaultGroupAvatar);
  }, [group.name, group.id, group.avatar]);

  const leaderIds = Array.isArray(group.leaders) ? group.leaders : [group.leaders];
  const isCurrentUserLeader = leaderIds.includes(currentUserId);
  const numberOfLeaders = processedMembers.filter(m => m.role === 'leader' && m.leftAt === null).length;

  const handleSearchInputChange = async (e) => {
    const term = e.target.value;
    setAddUserInput(term);
    setHighlightIndex(-1);
    setHasSearched(false);

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

  const handleKeyDown = (e) => {
    if (friendSuggestions.length === 0) {
      if (e.key === 'Enter') handleSearchSubmit(e);
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
          handleSearchSubmit(e);
        }
        break;
      default:
        break;
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = addUserInput.trim();
    console.log("Submitting search with term:", trimmedInput);
    setHasSearched(true);
    if (trimmedInput) {
      onAddUserSearch(trimmedInput);
      setSelectedUserToAdd(null);
      setFriendSuggestions([]);
      setHighlightIndex(-1);
    }
  };

  const handleSelectSuggestion = (user) => {
    setSelectedUserToAdd(user);
    setAddUserInput('');
    setFriendSuggestions([]);
    setHighlightIndex(-1);
  };

  const handleAddUserClick = () => {
    if (selectedUserToAdd && group && group.id) {
      const userIdToAdd = selectedUserToAdd._id;
      const conversationId = group.id;
      setAddUserInput('');
      setSelectedUserToAdd(null);
      onAddUserConfirm(conversationId, userIdToAdd, selectedUserToAdd);
    }
  };

  const handleSaveGroupName = () => {
    if (newGroupName.trim() && newGroupName !== group.name) {
      onUpdateGroupName(group.id, newGroupName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const handleAvatarUpdate = async (url) => {
    if (!url || url.length < 1) {
      setError("Vui lòng tải lên một ảnh hợp lệ.");
      setUploading(false);
      return;
    }
    setError("");
    try {
      setAvatarUrl(url);
      const success = await updateConversationAvatar({ conversationId: group.id, newAvatar: url });
      if (!success) {
        throw new Error("Failed to update avatar via WebSocket.");
      }
      toast.success("Group avatar updated successfully!");
    } catch (err) {
      setError(`Có lỗi xảy ra: ${err.message}`);
      setAvatarUrl(group.avatar || defaultGroupAvatar);
    } finally {
      setUploading(false);
    }
  };

  // Lọc thành viên hoạt động để hiển thị
  const activeMembers = processedMembers.filter(m => m.leftAt === null);

  return (
    <div className="chat-settings-overlay">
      <div className="settings-content">
        <header className="settings-header">
          <div className="name-edit-wrap">
            {isEditingName ? (
              <div className="group-name-edit">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  disabled={isPerformingAction}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="icon-button"
                  onClick={handleSaveGroupName}
                  title="Save Group Name"
                  disabled={isPerformingAction || !newGroupName.trim()}
                >
                  {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                </button>
                <button
                  className="icon-button"
                  onClick={() => setIsEditingName(false)}
                  title="Cancel"
                  disabled={isPerformingAction}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <>
                <h2>{group.name || 'Group Settings'}</h2>
                {processedMembers.some(m => m.id?._id === currentUserId && m.leftAt === null) && (
                  <button
                    className="icon-button edit-name-button"
                    onClick={() => setIsEditingName(true)}
                    title="Edit Group Name"
                    disabled={isPerformingAction}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                )}
              </>
            )}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            title="Close Settings"
            disabled={isPerformingAction}
          >
            <i className="fas fa-times"></i>
          </button>
        </header>

        <div className="settings-body">
          <div className="group-info" style={{ position: 'relative' }}>
            <div className="avatar-wrapper">
              <img src={avatarUrl} alt={group.name} className="avatar large" />
              {uploading && (
                <div className="avatar-loading-overlay">
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#fff' }}></i>
                </div>
              )}
            </div>
            <UploadButton
              endpoint="avatarUploader"
              accept="image/*"
              content={{ button: <i className="fas fa-camera" title="Update Group Avatar"></i> }}
              appearance={{
                button: {
                  padding: "8px",
                  background: "#0056b3",
                  color: "white",
                  borderRadius: "50%",
                  cursor: "pointer",
                  margin: "10px 0 5px 0px",
                  fontSize: "16px",
                  width: "36px",
                  height: "36px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
                container: {
                  display: "inline-block",
                  textAlign: "center",
                },
              }}
              onBeforeUploadBegin={(files) => {
                setUploading(true);
                const previewUrl = URL.createObjectURL(files[0]);
                setAvatarUrl(previewUrl);
                return files;
              }}
              onClientUploadComplete={(res) => {
                if (res && res[0]) {
                  const fileUrl = res[0].ufsUrl;
                  handleAvatarUpdate(fileUrl);
                }
                setUploading(false);
              }}
              onUploadError={(error) => {
                setError(`Lỗi tải lên: ${error.message}`);
                setUploading(false);
              }}
              onUploadProgress={(progress) => {
                console.log(`Upload progress: ${progress}%`);
              }}
              disabled={uploading || isPerformingAction}
            />
            {error && <p className="error-message" style={{ color: '#dc3545', marginTop: '5px' }}>{error}</p>}
          </div>

          <div className="member-list-section">
            <h4>Members ({activeMembers.length})</h4>
            <ul className="member-list">
              {activeMembers.map(member => (
                <li
                  key={member.id?._id || `member-${Math.random()}`}
                  className="member-item"
                >
                  <img src={member.id?.avatar || defaultUserAvatar} alt={member.id?.fullName || 'User Avatar'} className="avatar small" />
                  <span className="member-name">
                    {member.id?.fullName || member.id?.email || 'Unknown User'}
                    {member.role === 'leader' && " (Leader)"}
                    {member.id?._id === currentUserId && " (You)"}
                  </span>
                  <div className="member-actions">
                    {isCurrentUserLeader && member.id?._id !== currentUserId && member.role !== 'leader' && (
                      <button
                        className="icon-button small warning"
                        title="Remove User"
                        onClick={() => onRemoveUser(group.id, member.id._id, member.id)}
                        disabled={isPerformingAction}
                      >
                        {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-times"></i>}
                      </button>
                    )}
                    {isCurrentUserLeader && member.id?._id !== currentUserId && member.role !== 'leader' && (
                      <button
                        className="icon-button small primary"
                        title="Make Leader"
                        onClick={() => onChangeLeader(group.id, member.id._id)}
                        disabled={isPerformingAction}
                      >
                        {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-crown"></i>}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="add-user-section">
            <h4>Add Member</h4>
            <form className="add-user-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder="Search user to add..."
                value={addUserInput}
                onChange={handleSearchInputChange}
                onKeyDown={handleKeyDown}
                disabled={isPerformingAction}
              />
              <button type="submit" disabled={isPerformingAction || !addUserInput.trim()}>
                {isPerformingAction && !actionError ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              </button>

              {friendSuggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {friendSuggestions.map((friend, idx) => (
                    <div
                      key={friend._id}
                      className={`suggestion-item ${idx === highlightIndex ? 'highlighted' : ''}`}
                      onClick={() => handleSelectSuggestion(friend)}
                    >
                      <div className="name-avatar">
                        <img
                          src={friend.avatar || defaultUserAvatar}
                          alt={friend.fullName || friend.email || friend._id}
                          className="avatar tiny"
                        />
                        <span>{friend.fullName || friend.email || friend._id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
            {hasSearched && searchResults && searchResults.length > 0 && (
              <div className="search-results-list">
                {searchResults.map(user => (
                  <div
                    key={user._id}
                    className={`search-result-item ${selectedUserToAdd?._id === user._id ? 'selected' : ''}`}
                    onClick={() => setSelectedUserToAdd(user)}
                  >
                    <img src={user.avatar || defaultUserAvatar} alt={user.fullName || 'User Avatar'} className="avatar tiny" />
                    <span>{user.fullName || user.email || user._id}</span>
                  </div>
                ))}
              </div>
            )}
            {hasSearched && searchResults && searchResults.length === 0 && addUserInput.trim() && !isPerformingAction && !actionError && (
              <div className="info-message">No users found.</div>
            )}
            {selectedUserToAdd && (
              <button className="add-user-confirm-button" onClick={handleAddUserClick} disabled={isPerformingAction}>
                {isPerformingAction ? 'Adding...' : `Add ${selectedUserToAdd.fullName || selectedUserToAdd._id}`}
              </button>
            )}
          </div>

          {isPerformingAction && !actionError && <div className="action-status">Processing... <i className="fas fa-spinner fa-spin"></i></div>}
          {/* {actionError && <div className="action-error">Error: {actionError}</div>} */}

          <div className="group-actions-footer">
            <button
              className="button secondary clear"
              onClick={() => onDeleteConversationMember(group.id)}
              disabled={isPerformingAction}
            >
              Clear Messages
            </button>
            {processedMembers.some(m => m.id?._id === currentUserId && m.leftAt === null && processedMembers.filter(m => m.leftAt === null).length > 1) && (
              <button
                className="button secondary warning"
                onClick={() => onLeaveGroup(group.id)}
                disabled={isPerformingAction}
              >
                Leave Group
              </button>
            )}
            {isCurrentUserLeader && (
              <button
                className="button secondary danger"
                onClick={() => onDeleteGroup(group.id)}
                disabled={isPerformingAction}
              >
                Delete Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsOverlay;