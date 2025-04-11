import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// --- IMPORT API FUNCTION ---
import { logoutApi } from '../api/auth'; // Điều chỉnh đường dẫn
import './HomePage.scss'

const Home = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      // --- GỌI HÀM API ---
      await logoutApi();
      // -------------------
      console.log('Logout successful on server');
      // Các bước logout client sẽ nằm trong finally
    } catch (error) { // --- Lỗi đã được ném từ hàm API ---
      console.error('Server logout error:', error);
      setLogoutError(error.message || 'Logout failed on server.');
      // Dù lỗi server, vẫn logout client trong finally
      // --------------------------------------
    } finally {
      // Luôn logout client
      localStorage.removeItem('access_token');
      setIsLoggingOut(false);
      navigate('/auth');
    }
  };

  // Kiểm tra token trước khi render
  const accessToken = localStorage.getItem('access_token');
   if (!accessToken && !isLoggingOut) {
      return null;
   }

  // --- JSX return giữ nguyên như code trước của bạn ---
  return (
    <div>
      <div className="chat-container">
        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="profile-pic">
            <img src="https://via.placeholder.com/40" alt="Profile" onClick={handleLogout}/>
          </div>
          <div className="nav-icons">
            <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <svg className="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <svg className="nav-icon bottom-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <line x1="9" y1="10" x2="15" y2="10"></line>
          </svg>
        </div>

        {/* Middle Section - Lists */}
        <div className="lists-section">
          <div className="search-container">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" className="search-input" placeholder="Search" />
          </div>

          {/* Groups Section */}
          <div className="list-section">
            <h2 className="section-title">Groups</h2>
            
            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-orange">FF</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Friends Forever</div>
                  <div className="item-preview">Hahahaha!!</div>
                </div>
              </div>
              <div className="item-time">Today, 9:32pm</div>
            </div>

            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-blue">MG</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Mera Gang</div>
                  <div className="item-preview">Kyaaaaa??!!</div>
                </div>
              </div>
              <div className="item-time">Yesterday, 12:31pm</div>
            </div>

            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-green">HK</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Hiking</div>
                  <div className="item-preview">It's not going to happen</div>
                </div>
              </div>
              <div className="item-time">Wednesday, 9:12am</div>
            </div>
          </div>

          {/* Friends Section */}
          <div className="list-section friends-section">
            <h2 className="section-title">Friends</h2>
            
            <div className="list-item active">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-purple">AN</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Anil</div>
                  <div className="item-preview">April fool's day</div>
                </div>
              </div>
              <div className="check-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-orange">CH</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Chutthiya</div>
                  <div className="item-preview">Raag</div>
                </div>
              </div>
              <div className="notification-badge">1</div>
            </div>

            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-pink">MM</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Mary ma'am</div>
                  <div className="item-preview">You have to report...</div>
                </div>
              </div>
              <div className="notification-badge">1</div>
            </div>

            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-gray">BG</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Bill Gates</div>
                  <div className="item-preview">Nevermind bro</div>
                </div>
              </div>
              <div className="notification-badge">5</div>
            </div>

            <div className="list-item">
              <div className="item-info">
                <div className="avatar">
                  <div className="avatar-fallback avatar-red">VH</div>
                </div>
                <div className="item-details">
                  <div className="item-name">Victoria H</div>
                  <div className="item-preview">Okay brother, let's see...</div>
                </div>
              </div>
              <div className="check-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Chat */}
        <div className="chat-section">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-user">
              <div className="user-avatar">
                <div className="avatar-fallback avatar-purple">AN</div>
              </div>
              <div className="user-info">
                <h3>Anil</h3>
                <div className="user-status">Online - Last seen: 2:02pm</div>
              </div>
            </div>
            <div className="header-actions">
              <div className="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div className="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
              <div className="action-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {/* Received Messages */}
            <div className="message-group">
              <div className="message-received">
                <div className="message-bubble">Hey There!</div>
                <div className="message-bubble">How are you?</div>
                <div className="message-time">Today, 8:30pm</div>
              </div>
            </div>

            {/* Sent Messages */}
            <div className="message-group">
              <div className="message-sent">
                <div className="message-bubble">Hello!</div>
                <div className="message-time">Today, 8:33pm</div>
              </div>
            </div>

            {/* Sent Messages */}
            <div className="message-group">
              <div className="message-sent">
                <div className="message-bubble">I am fine and how are you?</div>
                <div className="message-time">Today, 8:34pm</div>
              </div>
            </div>

            {/* Received Messages */}
            <div className="message-group">
              <div className="message-received">
                <div className="message-bubble">I am doing well, Can we meet tomorrow?</div>
                <div className="message-time">Today, 8:36pm</div>
              </div>
            </div>

            {/* Sent Messages */}
            <div className="message-group">
              <div className="message-sent">
                <div className="message-bubble">Yes Sure!</div>
                <div className="message-time">Today, 8:38pm</div>
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="message-input-container">
            <div className="attachment-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </div>
            <div className="input-wrapper">
              <input type="text" className="message-input" placeholder="Type your message here..." />
              <div className="input-actions">
                <div className="input-action">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </div>
                <div className="input-action">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
              </div>
            </div>
            <button className="send-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Style giữ nguyên ---
const buttonStyle = {
  padding: '10px 20px',
  fontSize: '16px',
  cursor: 'pointer',
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  marginTop: '20px',
};

export default Home;