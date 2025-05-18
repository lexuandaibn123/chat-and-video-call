import React, { useEffect, useState } from 'react';
import { getPosts, getComments } from '../api/notification';
import NotificationList from '../components/Notification/NotificationList';
import '../components/Notification/style.scss';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [discoverItems, setDiscoverItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsResponse = await getPosts(1, 20);
        if (!postsResponse.success) {
          throw new Error(postsResponse.message || 'Failed to fetch posts');
        }

        console.log('Posts Response:', postsResponse.data);

        const discoverData = postsResponse.data.map(post => ({
          id: post._id,
          name: post.poster?.fullName || 'Unknown User',
          image: post.poster?.avatar || '/default-avatar.jpg',
          mutualFriends: Math.floor(Math.random() * 10) + 1,
        }));
        setDiscoverItems(discoverData);

        const postNotifications = postsResponse.data.map(post => {
          const posterName = post.poster?.fullName || 'Anonymous';
          const posterAvatar = post.poster?.avatar || '/default-avatar.jpg';
          const reactCount = post.reacts?.length || 0;
          const commentCount = post.comments?.length || 0;
          return [
            ...(reactCount > 0
              ? [{
                  id: `${post._id}-react`,
                  user: posterName, // Using poster.fullName as user
                  action: 'liked your post',
                  details: `${posterName} and ${reactCount - 1} others have liked your post`,
                  time: post.datetime_created,
                  image: posterAvatar,
                }]
              : []),
            ...(commentCount > 0
              ? [{
                  id: `${post._id}-comment`,
                  user: posterName, // Using poster.fullName as user
                  action: 'commented on your post',
                  details: `Your post has ${commentCount} comments`,
                  time: post.datetime_created,
                  image: posterAvatar,
                }]
              : []),
          ];
        }).flat();

        const samplePostId = postsResponse.data[0]?._id || '507f1f77bcf86cd799439012';
        const commentsResponse = await getComments(samplePostId, 1, 20);
        if (!commentsResponse.success) {
          throw new Error(commentsResponse.message || 'Failed to fetch comments');
        }

        console.log('Comments Response:', commentsResponse.data);

        const commentNotifications = commentsResponse.data.map(comment => {
          const posterName = comment.poster?.fullName || 'Anonymous'; // Use poster instead of userId
          const posterAvatar = comment.poster?.avatar || '/default-avatar.jpg';
          const contentText = comment.content?.[0]?.data || 'No content'; // Access first content item
          return {
            id: comment._id,
            user: posterName, // Using poster.fullName as user
            action: 'commented on your post',
            details: contentText,
            time: comment.datetime_created,
            image: posterAvatar,
          };
        });

        const allNotifications = [...postNotifications, ...commentNotifications].sort(
          (a, b) => new Date(b.time) - new Date(a.time)
        );
        setNotifications(allNotifications);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

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
          <NotificationList type="notifications" items={notifications} />
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;