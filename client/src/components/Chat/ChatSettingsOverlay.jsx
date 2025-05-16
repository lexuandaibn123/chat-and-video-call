// src/components/Chat/ChatSettingsOverlay.jsx
import React, { useState, useEffect } from 'react';
import defaultUserAvatar from '../../assets/images/avatar_male.jpg';
import defaultGroupAvatar from '../../assets/images/group-chat.png';

// Component overlay cài đặt chat
// Nhận props:
// group: object activeChat hiện tại (phải là group), bao gồm members: [{ id: { _id, name, avatar }, role, ... }], leader: 'leaderUserId', ...
// activeChat.members đã được populate trong ChatPage và được truyền xuống
// ... các props khác
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
    // Ensure group is valid and is a group conversation with populated members
    // activeChat.members đã được set là mảng populated users trong ChatPage
    if (!group || !group.isGroup || !group.members) {
        // >>> GỢI Ý: Show loading here if group.members is null/empty temporarily <<<
         if (group?.isGroup) console.warn("ChatSettingsOverlay received group data with missing members.");
        return null; // Render nothing if data isn't ready
    }

    const [addUserInput, setAddUserInput] = useState('');
    const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState(group.name);

    // Effect để reset trạng thái sửa tên và search khi group thay đổi
    useEffect(() => {
        setNewGroupName(group.name);
        setIsEditingName(false);
        setAddUserInput(''); // Reset search input
        setSelectedUserToAdd(null); // Reset selected user
         // searchResults is controlled by ChatPage, no need to reset here
    }, [group.name, group.id]); // Reset when group or group ID changes

    // Use members (đã populated) từ group prop
    // members: [{ id: { _id, name, avatar }, role, ... }]
    const members = group.members;
    const leaderId = group.leader; // Leader ID (user._id string) từ group prop
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
         // selectedUserToAdd should be a user object from search results { _id, fullName, avatar }
         if (selectedUserToAdd && group && group.id) {
            const userIdToAdd = selectedUserToAdd._id;
             const conversationId = group.id;
             setAddUserInput('');
             setSelectedUserToAdd(null);
             onAddUserConfirm(conversationId, userIdToAdd);
             // Reset form fields immediately (optimistic UX)
             // searchResults will likely be cleared by ChatPage after successful add
         }
     };

     const handleSaveGroupName = () => {
         if (newGroupName.trim() && newGroupName !== group.name) {
             onUpdateGroupName(group.id, newGroupName.trim()); // Calls ChatPage's update handler
             // setIsEditingName(false); // Let ChatPage handler decide when to close edit mode (e.g., after success)
         } else {
              setIsEditingName(false); // Close edit mode if no change or empty name
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
                             {/* Cho phép sửa tên nếu người dùng hiện tại là thành viên active */}
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
                    {/* Thông tin chung về nhóm */}
                    <div className="group-info">
                        <img src={group.avatar || defaultGroupAvatar} alt={group.name} className="avatar large" />
                        {/* Tên nhóm được hiển thị ở header */}
                    </div>

                    {/* Danh sách thành viên */}
                    <div className="member-list-section">
                        <h4>Members ({members.length})</h4>
                        <ul className="member-list">
                            {/* members: [{ id: { _id, name, avatar }, role, ... }] */}
                            {members.map(member => (
                                // member.id là object user populated
                                // Sử dụng member.id._id làm key DUY NHẤT
                                // Kiểm tra member.id tồn tại trước khi truy cập ._id
                                <li
                                    key={member.id?._id || `member-${Math.random()}`} // <-- SỬA LỖI KEY: Sử dụng member.id._id làm key
                                    className={`member-item ${member.leftAt ? 'left-member' : ''}`}
                                >
                                    {/* Sử dụng thông tin từ member.id (populated user object) */}
                                    <img src={member.id?.avatar || defaultUserAvatar} alt={member.id?.fullName || 'User Avatar'} className="avatar small" />
                                    <span className="member-name">
                                        {member.id?.fullName || member.id?.email || 'Unknown User'} {/* Lấy tên đầy đủ hoặc email */}
                                        {member.role === 'leader' && member.leftAt === null && " (Leader)"} {/* Chỉ hiển thị (Leader) nếu còn active */}
                                        {member.id?._id === currentUserId && " (You)"}
                                         {member.leftAt && " (Left)"} {/* Hiển thị nếu đã rời nhóm */}
                                    </span>
                                    <div className="member-actions">
                                        {/* Nút Xóa Thành viên (Chỉ leader, không phải bản thân, không phải trưởng nhóm, member chưa rời) */}
                                        {/* So sánh currentUserId (string) với member.id._id (string) */}
                                        {isCurrentUserLeader && member.id?._id !== currentUserId && member.role !== 'leader' && member.leftAt === null && (
                                            <button
                                                className="icon-button small warning"
                                                title="Remove User"
                                                onClick={() => onRemoveUser(group.id, member.id._id)} // Pass conversationId và user._id string
                                                disabled={isPerformingAction}
                                            >
                                                {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-times"></i>}
                                            </button>
                                        )}
                                        {/* Nút Đổi Trưởng Nhóm (Chỉ leader, không phải bản thân, không phải đã là trưởng nhóm, member chưa rời) */}
                                        {isCurrentUserLeader && member.id?._id !== currentUserId && member.role !== 'leader' && member.leftAt === null && (
                                            <button
                                                className="icon-button small primary"
                                                title="Make Leader"
                                                onClick={() => onChangeLeader(group.id, member.id._id)} // Pass conversationId và user._id string
                                                disabled={isPerformingAction}
                                            >
                                                 {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-crown"></i>} {/* Icon vương miện */}
                                            </button>
                                        )}
                                         {/* Nút Rời khỏi vai trò Leader (Chỉ leader, khi có > 1 leader active) */}
                                         {/* {member.role === 'leader' && member.id?._id === currentUserId && numberOfLeaders > 1 && (
                                            <button
                                                className="icon-button small secondary"
                                                title="Step Down as Leader"
                                                onClick={() => onStepDownLeader(group.id, currentUserId)} // Pass conversationId và current user ID string
                                                disabled={isPerformingAction}
                                            >
                                                 {isPerformingAction ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-user-tie"></i>} {/* Icon đổi vai trò */}
                                            {/* </button>
                                        )}  */}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Phần Thêm Thành viên */}
                    {/* Chỉ leader mới có thể thêm thành viên */}
                    <div className="add-user-section">
                         <h4>Add Member</h4>
                        <form className="add-user-search-form" onSubmit={handleSearchSubmit}>
                            <input type="text" placeholder="Search user to add..." value={addUserInput} onChange={handleSearchInputChange} disabled={isPerformingAction} />
                            <button type="submit" disabled={isPerformingAction || !addUserInput.trim()}>{isPerformingAction && !actionError ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}</button>
                        </form>
                        {/* Hiển thị kết quả tìm kiếm */}
                        {searchResults && searchResults.length > 0 && (
                            <div className="search-results-list">
                                {searchResults.map(user => (
                                    // user object from search results: { _id, fullName, avatar, ... }
                                    // Sử dụng user._id làm key DUY NHẤT
                                    <div
                                        key={user._id} // <-- SỬA LỖI KEY: Sử dụng user._id
                                        className={`search-result-item ${selectedUserToAdd?._id === user._id ? 'selected' : ''}`}
                                        onClick={() => setSelectedUserToAdd(user)}
                                    >
                                        <img src={user.avatar || defaultUserAvatar} alt={user.fullName || 'User Avatar'} className="avatar tiny" />
                                        <span>{user.fullName || user.email || user._id}</span> {/* Hiển thị tên, email, hoặc ID */}
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


                    {/* Hiển thị trạng thái xử lý và lỗi */}
                    {isPerformingAction && !actionError && <div className="action-status">Processing... <i className="fas fa-spinner fa-spin"></i></div>}
                    {actionError && <div className="action-error">Error: {actionError}</div>}

                    {/* Các tuỳ chọn khác (rời nhóm, xoá nhóm...) */}
                     <div className="group-actions-footer">
                          {/* Nút Rời nhóm */}
                          {/* activeChat.members là mảng members đã populated */}
                          {members.some(m => m.id?._id === currentUserId && m.leftAt === null) && // Check if current user is an active member (using populated user._id)
                           !(isCurrentUserLeader && numberOfLeaders <= 1 && members.filter(m => m.leftAt === null).length > 1) // Cannot leave if you are the only leader among active members (>1 total active members)
                           && (
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
                                        onDeleteConversationMember(group.id); // Gọi hàm khác nếu không phải leader
                                        }
                                    }}
                                    disabled={isPerformingAction}
                            >
                                Delete Group
                            </button>
                           {/* Nút Delete Conversation (for member who left) - TODO */}
                     </div>

                </div>
            </div>
        </div>
    );
};

export default ChatSettingsOverlay;