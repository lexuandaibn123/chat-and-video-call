import React, { useEffect, useState } from 'react';
import { getPosts, getComments } from '../api/notification';
import { infoApi } from "../api/auth";
import { getPotentialFriendsApi } from "../api/users";
import NotificationList from '../components/Notification/NotificationList';
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
    const fetchData = async () => {
      try {
        // Fetch posts for notifications
        const postsResponse = await getPosts(1, 20);
        if (!postsResponse.success) throw new Error(postsResponse.message || 'Failed to fetch posts');

                // Fetch potential friends for Discover (returns array directly)
        const potentialFriends = await getPotentialFriendsApi();
        console.log('Potential Friends:', potentialFriends);
        // Enrich each friend with full profile (avatar) via infoApi
        const discoverData = await Promise.all(
          potentialFriends.map(async item => {
            // assuming infoApi can accept an ID parameter to fetch other user
            const userInfoResp = await infoApi(item.info._id);
            const avatar = userInfoResp.success && userInfoResp.userInfo?.avatar
              ? userInfoResp.userInfo.avatar
              : '/default-avatar.jpg';
            return {
              id: item.info._id,
              name: item.info.fullName,
              image: avatar,
              mutualFriends: item.mutualFriends.length
            };
          })
        );
        setDiscoverItems(discoverData);

        // Build notifications from posts
        const postNotifications = postsResponse.data.flatMap(post => {
          const posterId = post.poster?._id;
          const isOwnPost = posterId === currentUserId;
          const base = {
            id: post._id,
            user: post.poster?.fullName || 'Anonymous',
            image: post.poster?.avatar || '/default-avatar.jpg',
            datetime: post.datetime_created,
            time: formatTimeAgo(post.datetime_created)
          };
          if (!isOwnPost) {
            const hasImage = post.content?.some(c => c.type === 'image');
            return [{
              ...base,
              id: `${post._id}-new-post`,
              action: hasImage ? 'posted a new photo' : 'made a new post',
              details: post.content?.[0]?.data || '',
              icon: hasImage ? '📷' : '✍️',
              contentPreview: post.content?.[0]?.data || ''
            }];
          }
          const notis = [];
          const likes = post.reacts?.length || 0;
          if (likes) notis.push({
            ...base,
            id: `${post._id}-react`,
            action: 'liked your post',
            details: `${likes} likes on your post`,
            icon: '❤️',
            reactCount: likes,
            contentPreview: `${likes} others liked your post.`
          });
          const comments = post.comments?.length || 0;
          if (comments) notis.push({
            ...base,
            id: `${post._id}-comment`,
            action: 'commented on your post',
            details: `${comments} comments on your post`,
            icon: '💬',
            commentCount: comments,
            contentPreview: `${comments} others commented on your post.`
          });
          return notis;
        });

        // Fetch detailed comments on user's post
        const myPost = postsResponse.data.find(p => p.poster?._id === currentUserId);
        let commentNotifications = [];
        if (myPost) {
          const commentsResp = await getComments(myPost._id, 1, 20);
          if (commentsResp.success) {
            const others = commentsResp.data.filter(c => c.userId?._id !== currentUserId);
            commentNotifications = others.map(c => ({
              id: c._id,
              user: c.userId?.fullName || 'Anonymous',
              action: 'commented on your post',
              details: c.content?.text?.data || '',
              datetime: c.datetime_created,
              time: formatTimeAgo(c.datetime_created),
              image: c.userId?.avatar || '/default-avatar.jpg',
              icon: '💬',
              commentCount: others.length,
              contentPreview: `${others.length} others commented on your post.`
            }));
          }
        }

        // Combine and sort
        const allNotifications = [...postNotifications, ...commentNotifications]
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

  if (loading) return <div>Loading...</div>;
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
            <NotificationList type="discover" items={discoverItems} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
