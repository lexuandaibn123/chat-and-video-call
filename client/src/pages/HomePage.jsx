import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// --- IMPORT API FUNCTION ---
import { logoutApi } from '../api/auth'; // Điều chỉnh đường dẫn

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
      <div className="chat-container" style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}>
        {/* Left Sidebar */}
        <div className="sidebar" style={{
          width: '60px',
          backgroundColor: '#7c3aed',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0'
        }}>
          <div className="profile-pic" style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px solid white',
            overflow: 'hidden',
            marginBottom: '32px'
          }}>
            <img src="https://via.placeholder.com/40" alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
          <div className="nav-icons" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
            flex: 1
          }}>
            <svg className="nav-icon" style={{color: 'white', cursor: 'pointer', width: '24px', height: '24px'}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <svg className="nav-icon" style={{color: 'white', cursor: 'pointer', width: '24px', height: '24px'}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <svg className="nav-icon" style={{color: 'white', cursor: 'pointer', width: '24px', height: '24px'}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <svg className="nav-icon" style={{color: 'white', cursor: 'pointer', width: '24px', height: '24px'}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <svg className="nav-icon" style={{color: 'white', cursor: 'pointer', width: '24px', height: '24px', marginTop: 'auto', marginBottom: '16px'}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <line x1="9" y1="10" x2="15" y2="10"></line>
          </svg>
        </div>
  
        {/* Middle Section - Lists */}
        <div className="lists-section" style={{
          width: '260px',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e5e5',
          overflowY: 'auto'
        }}>
          <div className="search-container" style={{padding: '16px', position: 'relative'}}>
            <svg className="search-icon" style={{position: 'absolute', left: '24px', top: '24px', color: '#9ca3af'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" className="search-input" placeholder="Search" style={{
              width: '100%',
              padding: '8px 8px 8px 36px',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '14px'
            }} />
          </div>
  
          {/* Groups Section */}
          <div className="list-section" style={{padding: '8px 16px'}}>
            <h2 className="section-title" style={{fontSize: '18px', fontWeight: 600, marginBottom: '8px'}}>Groups</h2>
            
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#f97316'}}>FF</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Friends Forever</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>Hahahaha!!</div>
                </div>
              </div>
              <div className="item-time" style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap'}}>Today, 9:32pm</div>
            </div>
  
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#3b82f6'}}>MG</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Mera Gang</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>Kyaaaaa??!!</div>
                </div>
              </div>
              <div className="item-time" style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap'}}>Yesterday, 12:31pm</div>
            </div>
  
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#22c55e'}}>HK</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Hiking</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>It's not going to happen</div>
                </div>
              </div>
              <div className="item-time" style={{fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap'}}>Wednesday, 9:12am</div>
            </div>
          </div>
  
          {/* Friends Section */}
          <div className="list-section" style={{padding: '8px 16px', marginTop: '16px'}}>
            <h2 className="section-title" style={{fontSize: '18px', fontWeight: 600, marginBottom: '8px'}}>Friends</h2>
            
            <div className="list-item active" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#f3f4f6'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#8b5cf6'}}>AN</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Anil</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>April fool's day</div>
                </div>
              </div>
              <div className="check-icon" style={{color: '#8b5cf6', marginLeft: 'auto'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
  
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#f97316'}}>CH</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Chutthiya</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>Raag</div>
                </div>
              </div>
              <div className="notification-badge" style={{
                backgroundColor: '#ef4444',
                color: 'white',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>1</div>
            </div>
  
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#ec4899'}}>MM</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Mary ma'am</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>You have to report...</div>
                </div>
              </div>
              <div className="notification-badge" style={{
                backgroundColor: '#ef4444',
                color: 'white',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>1</div>
            </div>
  
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#6b7280'}}>BG</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Bill Gates</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>Nevermind bro</div>
                </div>
              </div>
              <div className="notification-badge" style={{
                backgroundColor: '#ef4444',
                color: 'white',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}>5</div>
            </div>
  
            <div className="list-item" style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderRadius: '6px', cursor: 'pointer'}}>
              <div className="item-info" style={{display: 'flex', gap: '8px'}}>
                <div className="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0}}>
                  <div className="avatar-fallback" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500, fontSize: '12px', backgroundColor: '#ef4444'}}>VH</div>
                </div>
                <div className="item-details" style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="item-name" style={{fontSize: '14px', fontWeight: 500}}>Victoria H</div>
                  <div className="item-preview" style={{fontSize: '12px', color: '#6b7280'}}>Okay brother, let's see...</div>
                </div>
              </div>
              <div className="check-icon" style={{color: '#8b5cf6', marginLeft: 'auto'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
  
        {/* Right Section - Chat */}
        <div className="chat-section" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
          {/* Chat Header */}
          <div className="chat-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #e5e5e5',
            backgroundColor: 'white'
          }}>
            <div className="chat-user" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <div className="user-avatar" style={{width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden'}}>
                <div className="avatar-fallback" style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 500,
                  backgroundColor: '#8b5cf6'
                }}>AN</div>
              </div>
              <div className="user-info">
                <h3 style={{fontSize: '16px', fontWeight: 600}}>Anil</h3>
                <div className="user-status" style={{fontSize: '12px', color: '#6b7280'}}>Online - Last seen: 2:02pm</div>
              </div>
            </div>
            <div className="header-actions" style={{display: 'flex', gap: '8px'}}>
              <div className="action-icon" style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div className="action-icon" style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7l-7 5 7 5V7z"></path>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
              <div className="action-icon" style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </div>
            </div>
          </div>
  
          {/* Chat Messages */}
          <div className="chat-messages" style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            backgroundColor: '#f5f5f5'
          }}>
            {/* Received Messages */}
            <div className="message-group" style={{marginBottom: '16px'}}>
              <div className="message-received" style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '70%'
              }}>
                <div className="message-bubble" style={{
                  padding: '12px',
                  borderRadius: '18px',
                  marginBottom: '4px',
                  display: 'inline-block',
                  backgroundColor: '#e5e7eb'
                }}>Hey There!</div>
                <div className="message-bubble" style={{
                  padding: '12px',
                  borderRadius: '18px',
                  marginBottom: '4px',
                  display: 'inline-block',
                  backgroundColor: '#e5e7eb'
                }}>How are you?</div>
                <div className="message-time" style={{fontSize: '12px', color: '#6b7280'}}>Today, 8:30pm</div>
              </div>
            </div>
  
            {/* Sent Messages */}
            <div className="message-group" style={{marginBottom: '16px'}}>
              <div className="message-sent" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginLeft: 'auto',
                maxWidth: '70%'
              }}>
                <div className="message-bubble" style={{
                  padding: '12px',
                  borderRadius: '18px',
                  marginBottom: '4px',
                  display: 'inline-block',
                  backgroundColor: '#7c3aed',
                  color: 'white'
                }}>Hello!</div>
                <div className="message-time" style={{fontSize: '12px', color: '#6b7280'}}>Today, 8:33pm</div>
              </div>
            </div>
  
            {/* Sent Messages */}
            <div className="message-group" style={{marginBottom: '16px'}}>
              <div className="message-sent" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginLeft: 'auto',
                maxWidth: '70%'
              }}>
                <div className="message-bubble" style={{
                  padding: '12px',
                  borderRadius: '18px',
                  marginBottom: '4px',
                  display: 'inline-block',
                  backgroundColor: '#7c3aed',
                  color: 'white'
                }}>I am fine and how are you?</div>
                <div className="message-time" style={{fontSize: '12px', color: '#6b7280'}}>Today, 8:34pm</div>
              </div>
            </div>
  
            {/* Received Messages */}
            <div className="message-group" style={{marginBottom: '16px'}}>
              <div className="message-received" style={{
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '70%'
              }}>
                <div className="message-bubble" style={{
                  padding: '12px',
                  borderRadius: '18px',
                  marginBottom: '4px',
                  display: 'inline-block',
                  backgroundColor: '#e5e7eb'
                }}>I am doing well, Can we meet tomorrow?</div>
                <div className="message-time" style={{fontSize: '12px', color: '#6b7280'}}>Today, 8:36pm</div>
              </div>
            </div>
  
            {/* Sent Messages */}
            <div className="message-group" style={{marginBottom: '16px'}}>
              <div className="message-sent" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                marginLeft: 'auto',
                maxWidth: '70%'
              }}>
                <div className="message-bubble" style={{
                  padding: '12px',
                  borderRadius: '18px',
                  marginBottom: '4px',
                  display: 'inline-block',
                  backgroundColor: '#7c3aed',
                  color: 'white'
                }}>Yes Sure!</div>
                <div className="message-time" style={{fontSize: '12px', color: '#6b7280'}}>Today, 8:38pm</div>
              </div>
            </div>
          </div>
  
          {/* Message Input */}
          <div className="message-input-container" style={{
            padding: '12px',
            borderTop: '1px solid #e5e5e5',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div className="attachment-btn" style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </div>
            <div className="input-wrapper" style={{
              flex: 1,
              position: 'relative'
            }}>
              <input type="text" className="message-input" placeholder="Type your message here..." style={{
                width: '100%',
                padding: '12px',
                paddingRight: '80px',
                border: '1px solid #e5e5e5',
                borderRadius: '4px',
                fontSize: '14px'
              }} />
              <div className="input-actions" style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                gap: '8px'
              }}>
                <div className="input-action" style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </div>
                <div className="input-action" style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
              </div>
            </div>
            <button className="send-btn" style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#7c3aed',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none'
            }}>
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