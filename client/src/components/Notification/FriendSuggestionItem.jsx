import React from 'react';
import { createConversationApi } from '../../api/conversations';
import {toast} from 'react-toastify';

const FriendSuggestionItem = ({ item, userInfo, onRemove }) => {
  const handleMessage = async () => {
    const confirmed = window.confirm(`Do you want to start a conversation with ${item.name}?`);
    if (!confirmed) return;
    try {
      await createConversationApi({
        members: [userInfo.id, item.id],
        name: ""
      });
      toast.success("Conversation created successfully!");
      if (onRemove) onRemove(item.id);
    } catch (error) {
      toast.error(`Failed to create conversation: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <li className="friend-suggestion-item">
      <img src={item.image} alt={item.name} className="profile-image" />
      <div className="item-info">
        <p className="item-name">{item.name}</p>
        {item.mutualFriends != null && (
          <p className="mutual-friends">{item.mutualFriends} mutual friends</p>
        )}
      </div>
      <button
        className="message-btn"
        title="Message"
        type="button"
        onClick={handleMessage}
      >
        <i className="fas fa-comment-dots"></i>
      </button>
    </li>
  );
};

export default FriendSuggestionItem;