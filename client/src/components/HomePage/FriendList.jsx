import React from 'react';
import './FriendList.scss';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { infoApi } from '../../api/auth'; // Import infoApi nếu cần

const fakeData = [
    { id: 1, name: 'John Doe', status: 'online', avatar: 'https://via.placeholder.com/50' },
    { id: 2, name: 'Jane Smith', status: 'offline', avatar: 'https://via.placeholder.com/50' },
    { id: 3, name: 'Mike Johnson', status: 'busy', avatar: 'https://via.placeholder.com/50' },
    { id: 4, name: 'Sarah Williams', status: 'online', avatar: 'https://via.placeholder.com/50' },
];

const FriendList = () => {
    const [friends, setFriends] = useState([]);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                // const response = await fetch('http://localhost:5000/api/friends');
                // const data = await response.json();
                // Simulating API response with fake friend data
                setFriends(fakeData);
            } catch (error) {
                console.error('Error fetching friends:', error);
            }
        };

        fetchFriends();
    }, []);

    return (
        <div className="friend-list-container">
            <h2>Friends</h2>
            <div className="search-bar">
                <input type="text" placeholder="Search friends..." />
            </div>
            <div className="friends-list">
                {friends.map((friend) => (
                    <div key={friend.id} className="friend-item">
                        <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                        <div className="friend-info">
                            <span className="friend-name">{friend.name}</span>
                            <span className={`friend-status ${friend.status}`}>{friend.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FriendList;