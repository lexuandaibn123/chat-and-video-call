// src/components/Chat/ChatSettingsOverlay.jsx
import React, { useState } from 'react';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg'; // Sử dụng placeholder chung
// import userAvatarPlaceholder from '../../assets/images/user_avatar_placeholder.jpg'; // Có thể dùng avatar mặc định khác cho user

// Component overlay cài đặt chat
// Nhận props:
// group: object activeChat hiện tại (phải là group)
// currentUserId: ID của người dùng hiện tại
// onClose: hàm đóng overlay
// onRemoveUser: hàm xử lý xoá thành viên (userIdToRemove)
// onChangeLeader: hàm xử lý đổi trưởng nhóm (newLeaderId)
// onAddUserSearch: hàm xử lý tìm kiếm người dùng để thêm (searchTerm)
// onAddUserConfirm: hàm xử lý thêm người dùng đã chọn (userIdToAdd)
// isPerformingAction: boolean cho biết đang thực hiện action nào đó
// actionError: string/object lỗi từ action
// searchResults: mảng user objects [{ _id, name, avatar }] từ tìm kiếm
const ChatSettingsOverlay = ({
    group,
    currentUserId,
    onClose,
    onRemoveUser,
    onChangeLeader,
    onAddUserSearch, // Dành cho tìm kiếm người dùng
    onAddUserConfirm, // Dành cho thêm người dùng
    isPerformingAction, // State loading chung cho các action (optional)
    actionError, // State error chung cho các action (optional)
    searchResults // Kết quả tìm kiếm người dùng
}) => {
    if (!group || group.type !== 'group') {
        // Component này chỉ dành cho group, ẩn nếu không phải group
        return null;
    }

    // State cho phần tìm kiếm người dùng để thêm
    const [addUserInput, setAddUserInput] = useState('');
    const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);

    const handleSearchInputChange = (e) => {
        setAddUserInput(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (addUserInput.trim()) {
            // Gọi hàm tìm kiếm prop
            onAddUserSearch(addUserInput.trim());
            setSelectedUserToAdd(null); // Reset lựa chọn khi tìm kiếm mới
        }
    };

     const handleAddUserClick = () => {
         if (selectedUserToAdd && group && group.id) {
             // Gọi hàm thêm người dùng prop
             onAddUserConfirm(group.id, selectedUserToAdd._id);
             // Reset trạng thái thêm sau khi gọi hàm (có thể reset sau khi action hoàn tất thành công)
             setAddUserInput('');
             setSelectedUserToAdd(null);
             // clear searchResults? (tuỳ UX mong muốn)
         }
     };

    // Giả định cấu trúc thành viên có _id và name/avatar
    const members = group.members || [];
    const leaderId = group.leader; // API backend trả về leader ID

    return (
        <div className="chat-settings-overlay">
            <div className="settings-content">
                <header className="settings-header">
                    <h2>{group.name || 'Group Settings'}</h2>
                    <button className="icon-button" onClick={onClose} title="Close Settings">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <div className="settings-body">
                    {/* Thông tin chung về nhóm */}
                    <div className="group-info">
                        <img src={group.avatar || defaultAvatarPlaceholder} alt={group.name} className="avatar large" />
                        <h3>{group.name}</h3>
                        {/* Có thể thêm mô tả nhóm, ngày tạo, vv. */}
                    </div>

                    {/* Danh sách thành viên */}
                    <div className="member-list-section">
                        <h4>Members ({members.length})</h4>
                        <ul className="member-list">
                            {/* Giả định members trong activeChat đã có thông tin user (_id, name) */}
                            {members.map(member => (
                                <li key={member._id} className="member-item">
                                    <img src={member.avatar || defaultAvatarPlaceholder} alt={member.name} className="avatar small" />
                                    <span className="member-name">
                                        {member.name || 'Unknown User'}
                                        {member._id === leaderId && " (Leader)"} {/* Hiển thị ai là trưởng nhóm */}
                                        {member._id === currentUserId && " (You)"} {/* Hiển thị bạn */}
                                    </span>
                                    <div className="member-actions">
                                        {/* Nút Xóa Thành viên (Chỉ leader, không phải bản thân, không phải trưởng nhóm) */}
                                        {currentUserId === leaderId && member._id !== currentUserId && member._id !== leaderId && (
                                            <button
                                                className="icon-button small warning"
                                                title="Remove User"
                                                onClick={() => {
                                                     if (window.confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
                                                         onRemoveUser(group.id, member._id);
                                                     }
                                                }}
                                                disabled={isPerformingAction} // Disable khi đang xử lý
                                            >
                                                <i className="fas fa-user-times"></i>
                                            </button>
                                        )}
                                        {/* Nút Đổi Trưởng Nhóm (Chỉ leader, không phải bản thân, không phải đã là trưởng nhóm) */}
                                         {currentUserId === leaderId && member._id !== currentUserId && member._id !== leaderId && (
                                            <button
                                                className="icon-button small primary"
                                                title="Make Leader"
                                                onClick={() => {
                                                     if (window.confirm(`Are you sure you want to make ${member.name} the new leader?`)) {
                                                        onChangeLeader(group.id, member._id);
                                                     }
                                                }}
                                                disabled={isPerformingAction} // Disable khi đang xử lý
                                            >
                                                 <i className="fas fa-crown"></i> {/* Icon vương miện */}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Phần Thêm Thành viên */}
                    <div className="add-user-section">
                         <h4>Add Member</h4>
                          {/* Chỉ leader mới có thể thêm thành viên */}
                         {currentUserId === leaderId ? (
                             <>
                                <form className="add-user-search-form" onSubmit={handleSearchSubmit}>
                                    <input
                                        type="text"
                                        placeholder="Search user to add..."
                                        value={addUserInput}
                                        onChange={handleSearchInputChange}
                                        disabled={isPerformingAction} // Disable khi đang xử lý
                                    />
                                    <button type="submit" disabled={isPerformingAction || !addUserInput.trim()}>
                                        <i className="fas fa-search"></i>
                                    </button>
                                </form>

                                {/* Hiển thị kết quả tìm kiếm (Giả định: searchResults là mảng user object) */}
                                {searchResults && searchResults.length > 0 && (
                                    <div className="search-results-list">
                                        {searchResults.map(user => (
                                            // Hiển thị user, cho phép chọn
                                            <div
                                                key={user._id}
                                                className={`search-result-item ${selectedUserToAdd?._id === user._id ? 'selected' : ''}`}
                                                onClick={() => setSelectedUserToAdd(user)}
                                            >
                                                 <img src={user.avatar || defaultAvatarPlaceholder} alt={user.name} className="avatar tiny" />
                                                 <span>{user.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Nút xác nhận thêm người dùng đã chọn */}
                                 {selectedUserToAdd && (
                                     <button
                                         className="add-user-confirm-button"
                                         onClick={handleAddUserClick}
                                         disabled={isPerformingAction}
                                     >
                                         Add {selectedUserToAdd.name}
                                     </button>
                                 )}
                             </>
                         ) : (
                             <p className="info-message">Only the group leader can add new members.</p>
                         )}
                    </div>

                    {/* Hiển thị trạng thái xử lý và lỗi */}
                    {isPerformingAction && <div className="action-status">Processing...</div>}
                    {actionError && <div className="action-error">Error: {actionError}</div>}

                    {/* Các tuỳ chọn khác (rời nhóm, xoá nhóm...) */}
                    {/* Ví dụ: Nút Rời nhóm (Không phải leader) */}
                     {currentUserId !== leaderId && (
                          <div className="leave-group-section">
                                <button
                                     className="button secondary warning"
                                     onClick={() => { /* TODO: Implement Leave Group Logic */ alert("Leave group not implemented yet"); }}
                                     disabled={isPerformingAction}
                                >
                                    Leave Group
                                </button>
                          </div>
                     )}
                     {/* Ví dụ: Nút Xoá nhóm (Chỉ leader) */}
                     {currentUserId === leaderId && (
                          <div className="delete-group-section">
                                <button
                                     className="button secondary danger"
                                     onClick={() => { /* TODO: Implement Delete Group Logic */ alert("Delete group not implemented yet"); }}
                                     disabled={isPerformingAction}
                                >
                                    Delete Group
                                </button>
                          </div>
                     )}

                </div>
            </div>
        </div>
    );
};

export default ChatSettingsOverlay;