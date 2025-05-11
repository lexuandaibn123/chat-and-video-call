import React from 'react';
import ConversationItem from './ConversationItem';

const FriendList = ({ friends, onItemClick, activeChat }) => {
  return (
    <section className="conversation-section">
      <h2 className="section-title">Friends</h2>
      <ul className="conversation-list">
        {/* Map qua mảng friends đã được lọc */}
        {friends.map(friend => (
          <ConversationItem
            key={friend.id} // Sử dụng id (là _id từ backend)
            id={friend.id}
            type="friend" // Loại đã được xác định ở ChatPage
            avatar={friend.avatar} // Sử dụng avatar từ dữ liệu đã xử lý
            name={friend.name}     // Sử dụng tên từ dữ liệu đã xử lý
            lastMessage={friend.lastMessage}
            time={friend.time}
            unread={friend.unread || 0}
            status={friend.status} // Trạng thái online/offline (cần API real-time)
            onClick={onItemClick}
            // Kiểm tra active dựa trên activeChat prop
            isActive={activeChat?.id === friend.id} // Chỉ cần so sánh ID vì type đã được lọc
          />
        ))}
      </ul>
    </section>
  );
};

export default FriendList;