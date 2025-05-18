import React, { useEffect, useState } from 'react';
import { getPosts, getComments } from '../api/notification';
import { infoApi } from "../api/auth";
import NotificationList from '../components/Notification/NotificationList';
import '../components/Notification/style.scss';

const NotificationsPage = () => {
  const [user, setUser] = useState({
    id:"",
    fullName: "",
    email: "",
    avatar: ""
  });
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [discoverItems, setDiscoverItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        const response = await infoApi();

        if (response.success && response.userInfo) {
          setUser({
            id: response.userInfo.id || "",
            fullName: response.userInfo.fullName || "",
            email: response.userInfo.email || "",
            avatar: response.userInfo.avatar || "" 
          });
        } else {
          setError("Không thể lấy thông tin người dùng");
        }
      } catch (err) {
        setError(err.message || "Đã xảy ra lỗi khi lấy thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const currentUserId = user?._id; 
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const postsResponse = await getPosts(1, 20);
        if (!postsResponse.success) {
          throw new Error(postsResponse.message || 'Failed to fetch posts');
        }

        // Lọc người dùng duy nhất cho phần "Discover"
        const uniqueUsers = new Set();
        const discoverData = postsResponse.data
          .filter(post => {
            const userId = post.poster?._id;
            if (!userId || uniqueUsers.has(userId)) return false;
            uniqueUsers.add(userId);
            return true;
          })
          .map(post => ({
            id: post.poster._id,
            name: post.poster?.fullName || 'Unknown User',
            image: post.poster?.avatar || '/default-avatar.jpg',
            mutualFriends: Math.floor(Math.random() * 10) + 1, // Thay bằng dữ liệu thực nếu có
          }));
        setDiscoverItems(discoverData);

        // Tạo thông báo dựa trên bài đăng
        const postNotifications = postsResponse.data.map(post => {
          const posterId = post.poster?._id;
          const posterName = post.poster?.fullName || 'Anonymous';
          const posterAvatar = post.poster?.avatar || '/default-avatar.jpg';
          const isOwnPost = posterId === currentUserId;

          if (isOwnPost) {
            // Thông báo cho bài đăng của mình
            const reactCount = post.reacts?.length || 0;
            const commentCount = post.comments?.length || 0;
            return [
              ...(reactCount > 0
                ? [{
                    id: `${post._id}-react`,
                    user: posterName,
                    action: 'liked your post',
                    details: `${posterName} and ${reactCount - 1} others liked your post`,
                    time: post.datetime_created,
                    image: posterAvatar,
                    icon: '❤️',
                  }]
                : []),
              ...(commentCount > 0
                ? [{
                    id: `${post._id}-comment`,
                    user: posterName,
                    action: 'commented on your post',
                    details: `Your post has ${commentCount} comments`,
                    time: post.datetime_created,
                    image: posterAvatar,
                    icon: '💬',
                  }]
                : []),
            ];
          } else {
            // Thông báo cho bài đăng của người khác
            const hasImage = post.content?.some(content => content.type === 'image');
            const action = hasImage ? 'posted a new photo' : 'made a new post';
            return [{
              id: `${post._id}-new-post`,
              user: posterName,
              action,
              details: post.content?.[0]?.data || 'No content',
              time: formatTimeAgo(post.datetime_created),
              image: posterAvatar,
              icon: hasImage ? '📷' : '✍️',
            }];
          }
        }).flat();

        // Fetch comments cho bài đăng của mình
        const ownPostId = postsResponse.data.find(post => post.poster?._id === currentUserId)?._id || '507f1f77bcf86cd799439012';
        const commentsResponse = await getComments(ownPostId, 1, 20);
        if (!commentsResponse.success) {
          throw new Error(commentsResponse.message || 'Failed to fetch comments');
        }

        const commentNotifications = commentsResponse.data.map(comment => ({
          id: comment._id,
          user: comment.poster?.fullName || 'Anonymous',
          action: 'commented on your post',
          details: comment.content?.[0]?.data || 'No content',
          time: formatTimeAgo(comment.datetime_created),
          image: comment.poster?.avatar || '/default-avatar.jpg',
          icon: '💬',
        }));

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
  }, [currentUserId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="page-content">
      <div className="notifications-page">
        <div className="tabs-mobile">
          <button
            onClick={() => setActiveTab('notifications')}
            className={activeTab === 'notifications' ? 'active' : ''}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={activeTab === 'discover' ? 'active' : ''}
          >
            Discover
          </button>
        </div>
        <div className={`notifications-section ${activeTab === 'notifications' ? 'active' : ''}`}>
          <h2>Notifications</h2>
          <div className="scrollable-content">
            <NotificationList type="notifications" items={notifications} />
          </div>
        </div>
        <div className={`discover-section ${activeTab === 'discover' ? 'active' : ''}`}>
          <h2>Discover</h2>
          <div className="scrollable-content">
            <NotificationList type="discover" items={discoverItems} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;