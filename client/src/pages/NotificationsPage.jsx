import React, { useState } from 'react';
import NotificationList from '../components/Notification/NotificationList';
import '../components/Notification/style.scss';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('notifications');

  // Dữ liệu mẫu
  const discoverItems = [
    { id: 1, name: 'Friends Forever', image: 'url1', mutualFriends: 5 },
    { id: 2, name: 'Mera Gang', image: 'url2', mutualFriends: 5 },
    { id: 3, name: 'Hiking', image: 'url3', mutualFriends: 5 },
  ];
  const notificationItems = [
    { id: 1, user: 'Anil', action: 'liked your post', details: 'Anil and 57 others have liked your post', time: 'Today, 9:52pm', image: 'url1' },
    { id: 2, user: 'Davis', action: 'liked your post', details: 'Davis and 56 others have liked your post', time: 'Today, 9:52pm', image: 'url2' },
    { id: 3, user: 'Ana', action: 'commented on your post', details: 'Your post has 20 comments', time: 'Today, 9:52pm', image: 'url3' },
  ];

  return (
    <div className="page-content">
      <div className="notifications-page">
        <div className="tabs-mobile">
          <button
            onClick={() => setActiveTab('discover')}
            className={activeTab === 'discover' ? 'active' : ''}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={activeTab === 'notifications' ? 'active' : ''}
          >
            Notifications
          </button>
        </div>
        <div className={`discover-section ${activeTab === 'discover' ? 'active' : ''}`}>
          <h2>Discover</h2>
          <NotificationList type="discover" items={discoverItems} />
        </div>
        <div className={`notifications-section ${activeTab === 'notifications' ? 'active' : ''}`}>
          <h2>Notifications</h2>
          <NotificationList type="notifications" items={notificationItems} />
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;