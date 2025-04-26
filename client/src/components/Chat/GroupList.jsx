import React from 'react';
import ConversationItem from './ConversationItem';

const GroupList = ({ groups, onItemClick, activeChat }) => {
  return (
    <section className="conversation-section">
      <h2 className="section-title">Groups</h2>
      <ul className="conversation-list">
        {/* Map qua mảng groups đã được lọc */}
        {groups.map(group => (
          <ConversationItem
            key={group.id} // Sử dụng id (là _id từ backend)
            id={group.id}
            type="group" // Loại đã được xác định ở ChatPage
            avatar={group.avatar} // Sử dụng avatar từ dữ liệu đã xử lý
            name={group.name}     // Sử dụng tên từ dữ liệu đã xử lý
            lastMessage={group.lastMessage}
            time={group.time}
            unread={group.unread || 0}
            onClick={onItemClick}
            // Kiểm tra active dựa trên activeChat prop
            isActive={activeChat?.id === group.id} // Chỉ cần so sánh ID vì type đã được lọc
          />
        ))}
      </ul>
    </section>
  );
};

export default GroupList;