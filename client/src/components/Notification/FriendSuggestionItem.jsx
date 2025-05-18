import React from 'react';

const FriendSuggestionItem = ({ item }) => {
  return (
    <li className="friend-suggestion-item">
      <img src={item.image} alt={item.name} className="profile-image" />
      <div className="item-info">
        <p className="item-name">{item.name}</p>
        <p className="mutual-friends">{item.mutualFriends} mutual friends</p>
      </div>
    </li>
  );
};

export default FriendSuggestionItem;