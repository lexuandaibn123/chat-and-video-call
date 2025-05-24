import React, { useEffect, useState } from 'react';
import { getPosts, getMyPosts, getComments } from '../api/notification';
import { infoApi } from "../api/auth";
import { getPotentialFriendsApi } from "../api/users";
import NotificationList from '../components/Notification/NotificationList';
import defaultUserAvatar from '../assets/images/avatar_male.jpg';
import '../components/Notification/style.scss';

const NotificationsPage = () => {
  const [user, setUser] = useState({
    id: "",
    fullName: "",
    email: "",
    avatar: ""
  });
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [discoverItems, setDiscoverItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const [myPosts, setMyPosts] = useState([]);

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

  const currentUserId = user.id;

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
    if (!user.id) return;
    const fetchData = async () => {
      try {
        // Fetch posts for notifications
        const postsResponse = await getPosts(1, 20);
        const myPostsResponse = await getMyPosts(1, 20);
        if (!postsResponse.success) throw new Error(postsResponse.message || 'Failed to fetch posts');
        if (!myPostsResponse.success) throw new Error(myPostsResponse.message || 'Failed to fetch my posts');
        console.log('Posts:', postsResponse.data);
        console.log('My Posts:', myPostsResponse.data);

        // Fetch potential friends for Discover (returns array directly)
        const potentialFriends = await getPotentialFriendsApi();
        console.log('Potential Friends:', potentialFriends);
        // Enrich each friend with full profile (avatar) via infoApi
        const discoverData = potentialFriends.map(item => ({
          id: item.info._id,
          name: item.info.fullName,
          image: item.info.avatar || defaultUserAvatar,
          mutualFriends: item.mutualFriends.length
        }));
        setDiscoverItems(discoverData);

        // Build notifications from posts
        const postNotifications = postsResponse.data
          .filter(post => post.poster?._id !== currentUserId) // chỉ bài của bạn bè
          .map(post => {
            const hasImage = post.content?.some(c => c.type === 'image');
            return {
              id: `${post._id}-new-post`,
              user: post.poster?.fullName || 'Anonymous',
              image: post.poster?.avatar || defaultUserAvatar,
              datetime: post.datetime_created,
              time: formatTimeAgo(post.datetime_created),
              action: hasImage ? 'posted a new photo' : 'made a new post',
              details: post.content?.[0]?.data || '',
              icon: hasImage ? '📷' : '✍️',
              contentPreview: post.content?.[0]?.data || ''
            };
          });

        const reactAndCommentNotifications = myPostsResponse.data.flatMap(post => {
          const notis = [];
          const likeCount = post.reacts?.length || 0;
          const commentCount = post.comments?.length || 0;

          // Thông báo tổng số lượt like
          if (likeCount > 0) {
            notis.push({
              id: `${post._id}-react-summary`,
              user: 'Your post', // Không có user cụ thể
              image: defaultUserAvatar,
              datetime: post.datetime_created,
              time: formatTimeAgo(post.datetime_created),
              action: ` received ${likeCount} like${likeCount > 1 ? 's' : ''}.`,
              // details: `Your post received ${likeCount} like${likeCount > 1 ? 's' : ''}.`,
              icon: '❤️',
              reactCount: likeCount,
              contentPreview: post.content?.[0]?.data || '',
            });
          }

          // Thông báo tổng số lượt comment
          if (commentCount > 0) {
            notis.push({
              id: `${post._id}-comment-summary`,
              user: 'Your post', // Không có user cụ thể
              image: defaultUserAvatar,
              datetime: post.datetime_created,
              time: formatTimeAgo(post.datetime_created),
              action: ` received ${commentCount} comment${commentCount > 1 ? 's' : ''}.`,
              // details: `Your post received ${commentCount} comment${commentCount > 1 ? 's' : ''}.`,
              icon: '💬',
              commentCount: commentCount,
              contentPreview: post.content?.[0]?.data || '',
            });
          }

          return notis;
        });
        // Lấy chi tiết comment bằng getComments
        let commentNotifications = [];
        for (const myPost of myPostsResponse.data || []) {
          const commentsResp = await getComments(myPost._id, 1, 20);
          if (commentsResp.success) {
            const others = commentsResp.data.filter(c => c.userId?._id !== currentUserId);
            commentNotifications.push(...others.map(c => ({
              id: `${myPost._id}-comment-${c._id}`,
              user: c.userId?.fullName || 'Anonymous',
              action: 'commented on your post',
              details: c.content?.text?.data || '',
              datetime: c.datetime_created,
              time: formatTimeAgo(c.datetime_created),
              image: c.userId?.avatar || defaultUserAvatar,
              icon: '💬',
              commentCount: others.length,
              contentPreview: `${others.length} people commented on your post.`
            })));
          }
        }

        // Combine and sort
        const allNotifications = [
          ...postNotifications,
          ...reactAndCommentNotifications,
          ...commentNotifications
        ]
          .filter(noti => noti.user !== 'Anonymous')
          .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        setNotifications(allNotifications);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) fetchData();
  }, [currentUserId]);

  if (loading || !user.id) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <div>Loading...</div>
      </div>
    );
  }
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="page-content">
      <div className="notifications-page">
        <div className="tabs-mobile">
          <button onClick={() => setActiveTab('notifications')} className={activeTab === 'notifications' ? 'active' : ''}>
            Notifications
          </button>
          <button onClick={() => setActiveTab('discover')} className={activeTab === 'discover' ? 'active' : ''}>
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
            <NotificationList type="discover" items={discoverItems} userInfo={user.id ? user : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
