// src/components/Chat/ChatWindow.jsx (using sample data version)
import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';

// Thêm onOpenSettings vào props
const ChatWindow = ({ activeContact, messages, onMobileBack, isMobile, onSendMessage, isLoadingMessages, onOpenSettings }) => {
    const messageListEndRef = useRef(null);

    const handleSend = (event) => {
        event.preventDefault();
        const inputElement = event.target.elements.messageInput;
        const messageText = inputElement.value.trim();
        if (messageText) {
            onSendMessage(messageText);
            inputElement.value = ''; // Xóa input sau khi gửi
        }
    };

    useEffect(() => {
        if (!isLoadingMessages) {
             messageListEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoadingMessages]);

    if (!activeContact) {
        return (
            <section className="active-chat-panel placeholder">
                <i className="far fa-comments placeholder-icon"></i>
                <span>Select a conversation to start chatting.</span>
            </section>
        );
    }

    return (
        <section className="active-chat-panel">
            <header className="chat-header">
                {isMobile && (
                    <button className="icon-button back-button" title="Back" onClick={onMobileBack}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                )}
                <div className="contact-info">
                    <img src={activeContact.avatar || defaultAvatarPlaceholder } alt={activeContact.name || 'User Avatar'} className="avatar" />
                    <div className="name-status">
                        <span className="contact-name">{activeContact.name || 'Unknown'}</span>
                        <span className="contact-status">{activeContact.statusText || (activeContact.type === 'group' ? 'Group' : 'Offline')}</span>
                    </div>
                </div>
                <div className="chat-actions">
                    <button className="icon-button" title="Call"><i className="fas fa-phone-alt"></i></button>
                    <button className="icon-button" title="Video Call"><i className="fas fa-video"></i></button>
                    {/* <<< Thêm nút More Options và gắn sự kiện onClick >>> */}
                    {/* Chỉ hiển thị nút nếu active chat là group VÀ có hàm onOpenSettings */}
                    {activeContact.type === 'group' && onOpenSettings && (
                         <button className="icon-button" title="More Options" onClick={onOpenSettings}>
                              <i className="fas fa-ellipsis-v"></i>
                         </button>
                    )}
                </div>
            </header>

            <div className="message-list-container">
                {isLoadingMessages ? (
                     <div className="loading-messages">Loading messages...</div>
                ) : messages.length === 0 ? (
                     <div className="no-messages">Start a conversation!</div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            sender={msg.sender}
                            text={msg.text}
                            time={msg.time}
                        />
                    ))
                )}
                <div ref={messageListEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                <button type="button" className="icon-button attach-button" title="Attach File"><i className="fas fa-paperclip"></i></button>
                <input
                    type="text"
                    placeholder="Type your message here..."
                    className="message-input"
                    name="messageInput"
                    autoComplete="off"
                    disabled={isLoadingMessages || !activeContact}
                />
                <button type="button" className="icon-button" title="Emoji"><i className="far fa-smile"></i></button>
                <button type="button" className="icon-button" title="Attach Photo"><i className="fas fa-camera"></i></button>
                <button
                    type="submit"
                    className="icon-button send-button"
                    title="Send Message"
                    disabled={isLoadingMessages || !activeContact || !document.querySelector('.message-input')?.value.trim()}
                >
                    <i className="fas fa-paper-plane"></i>
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;