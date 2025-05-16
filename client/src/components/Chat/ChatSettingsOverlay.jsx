import React, { useState, useEffect } from 'react';
import defaultUserAvatar from '../../assets/images/avatar_male.jpg';
import defaultGroupAvatar from '../../assets/images/group-chat.png';
import { updateConversationAvatar } from "../../api/conversations";
import { UploadButton } from '../../utils/uploadthing';

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
    onUpdateGroupName
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

    useEffect(() => {
        setNewGroupName(group.name);
        setIsEditingName(false);
        setAddUserInput('');
        setSelectedUserToAdd(null);
        setAvatarUrl(group.avatar || defaultGroupAvatar);
    }, [group.name, group.id, group.avatar]);

    const members = group.members;
    const leaderId = group.leader;
    const isCurrentUserLeader = currentUserId === leaderId;
    const numberOfLeaders = members.filter(m => m.role === 'leader' && m.leftAt === null).length;

    const handleSearchInputChange = (e) => {
        setAddUserInput(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveGroupName();
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmedInput = addUserInput.trim();
        console.log("Submitting search with term:", trimmedInput);
        if (trimmedInput) {
            onAddUserSearch(trimmedInput);
            setSelectedUserToAdd(null);
        }
    };

    const handleAddUserClick = () => {
        if (selectedUserToAdd && group && group.id) {
            const userIdToAdd = selectedUserToAdd._id;
            const conversationId = group.id;
            setAddUserInput('');
            setSelectedUserToAdd(null);
            onAddUserConfirm(conversationId, userIdToAdd);
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
        if (!url) {
            setError("Vui lòng tải lên một ảnh trước.");
            return;
        }
        setError("");
        try {
            await updateConversationAvatar(group.id, url);
            setAvatarUrl(url);
            alert("Cập nhật ảnh đại diện nhóm thành công!");
        } catch (err) {
            setError(`Có lỗi xảy ra: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

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
                                <button className="icon-button" onClick={handleSaveGroupName} title="Save Group Name" disabled={isPerformingAction || !newGroupName.trim()}>
                                    {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                                </button>
                                <button className="icon-button" onClick={() => setIsEditingName(false)} title="Cancel" disabled={isPerformingAction}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2>{group.name || 'Group Settings'}</h2>
                                {members.some(m => m.id?._id === currentUserId && m.leftAt === null) && (
                                    <button className="icon-button edit-name-button" onClick={() => setIsEditingName(true)} title="Edit Group Name" disabled={isPerformingAction}>
                                        <i className="fas fa-edit"></i>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <button className="icon-button" onClick={onClose} title="Close Settings" disabled={isPerformingAction}>
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
                                    margin: "10px 0 0 10px",
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
                        <h4>Members ({members.length})</h4>
                        <ul className="member-list">
                            {members.map(member => (
                                <li
                                    key={member.id?._id || `member-${Math.random()}`}
                                    className={`member-item ${member.leftAt ? 'left-member' : ''}`}
                                >
                                    <img src={member.id?.avatar || defaultUserAvatar} alt={member.id?.fullName || 'User Avatar'} className="avatar small" />
                                    <span className="member-name">
                                        {member.id?.fullName || member.id?.email || 'Unknown User'}
                                        {member.role === 'leader' && member.leftAt === null && " (Leader)"}
                                        {member.id?._id === currentUserId && " (You)"}
                                        {member.leftAt && " (Left)"}
                                    </span>
                                    <div className="member-actions">
                                        {isCurrentUserLeader && member.id?._id !== currentUserId && member.role !== 'leader' && member.leftAt === null && (
                                            <button
                                                className="icon-button small warning"
                                                title="Remove User"
                                                onClick={() => onRemoveUser(group.id, member.id._id)}
                                                disabled={isPerformingAction}
                                            >
                                                {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-times"></i>}
                                            </button>
                                        )}
                                        {isCurrentUserLeader && member.id?._id !== currentUserId && member.role !== 'leader' && member.leftAt === null && (
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
                            <input type="text" placeholder="Search user to add..." value={addUserInput} onChange={handleSearchInputChange} disabled={isPerformingAction} />
                            <button type="submit" disabled={isPerformingAction || !addUserInput.trim()}>{isPerformingAction && !actionError ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}</button>
                        </form>
                        {searchResults && searchResults.length > 0 && (
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
                        {searchResults && searchResults.length === 0 && addUserInput.trim() && !isPerformingAction && !actionError && (
                            <div className="info-message">No users found.</div>
                        )}
                        {selectedUserToAdd && (
                            <button className="add-user-confirm-button" onClick={handleAddUserClick} disabled={isPerformingAction}>
                                {isPerformingAction ? 'Adding...' : `Add ${selectedUserToAdd.fullName || selectedUserToAdd._id}`}
                            </button>
                        )}
                    </div>

                    {isPerformingAction && !actionError && <div className="action-status">Processing... <i className="fas fa-spinner fa-spin"></i></div>}
                    {actionError && <div className="action-error">Error: {actionError}</div>}

                    <div className="group-actions-footer">
                        {members.some(m => m.id?._id === currentUserId && m.leftAt === null) && 
                         !(isCurrentUserLeader && numberOfLeaders <= 1 && members.filter(m => m.leftAt === null).length > 1) && (
                            <button
                                className="button secondary warning"
                                onClick={() => onLeaveGroup(group.id)}
                                disabled={isPerformingAction}
                            >
                                Leave Group
                            </button>
                        )}
                        <button
                            className="button secondary danger"
                            onClick={() => {
                                if (isCurrentUserLeader) {
                                    onDeleteGroup(group.id);
                                } else {
                                    onDeleteConversationMember(group.id);
                                }
                            }}
                            disabled={isPerformingAction}
                        >
                            Delete Group
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatSettingsOverlay;