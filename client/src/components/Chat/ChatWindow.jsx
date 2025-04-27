// src/components/Chat/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react'; // Import useState
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';

// Add new props: onEditMessage, onDeleteMessage (if implementing message actions)
const ChatWindow = ({ activeContact, messages, onMobileBack, isMobile, onSendMessage, isLoadingMessages, onOpenSettings, onDeleteMessage, onEditMessage, sendingMessage, currentUserId  }) => {
    const [messageInput, setMessageInput] = useState('');
    const messageListEndRef = useRef(null);

    const handleSend = (event) => {
        event.preventDefault();
        // Use the state value instead of querying the DOM
        const messageText = messageInput.trim(); // <<<< USE STATE VALUE

        if (messageText) {
            onSendMessage(messageText);
            // Clear the input by clearing the state
            setMessageInput(''); // <<<< CLEAR STATE INSTEAD OF DOM
        }
    };

    useEffect(() => {
        // Only scroll to bottom if not loading messages (e.g., initial load)
        // and if the user is likely at the bottom already (optional, for less intrusive scrolling)
         if (!isLoadingMessages) { // Add condition !isLoadingMessages
             messageListEndRef.current?.scrollIntoView({ behavior: "smooth" });
         }
    }, [messages, isLoadingMessages]); // Add isLoadingMessages to dependencies

    // Placeholder if no chat selected
    if (!activeContact) {
        return (
            <section className="active-chat-panel placeholder">
                <i className="far fa-comments placeholder-icon"></i>
                <span>Select a conversation to start chatting.</span>
            </section>
        );
    }

    // Check if the active chat is a group chat
    const isGroupChat = activeContact.isGroup; // Use the isGroup flag from activeChat

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
                        <span className="contact-status">{activeContact.statusText || (isGroupChat ? 'Group' : 'Offline')}</span>
                    </div>
                </div>
                <div className="chat-actions">
                    <button className="icon-button" title="Call"><i className="fas fa-phone-alt"></i></button>
                    <button className="icon-button" title="Video Call"><i className="fas fa-video"></i></button>
                    {/* Show More Options button only for group chats */}
                    {isGroupChat && onOpenSettings && (
                         <button className="icon-button" title="More Options" onClick={onOpenSettings}>
                              <i className="fas fa-ellipsis-v"></i>
                         </button>
                    )}
                </div>
            </header>

            {/* Khu vực hiển thị tin nhắn */}
            <div className="message-list-container">
                {isLoadingMessages ? (
                     <div className="loading-messages">Loading messages...</div>
                ) : messages.length === 0 ? (
                     <div className="no-messages">Start a conversation!</div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            id={msg.id}
                            // <<< KHÔNG CÒN TRUYỀN SENDER TỪ CHATPAGE >>>
                            // sender={msg.sender} // Removed
                            // ---------------------------------------
                            text={msg.text}
                            time={msg.time}
                            type={msg.type}
                            content={msg.content}
                            isEdited={msg.isEdited}
                            isDeleted={msg.isDeleted}
                            senderId={msg.senderId} // <<< TRUYỀN senderId NHẬN TỪ API
                            isGroupChat={isGroupChat}
                            currentUserId={currentUserId} // <<< TRUYỀN currentUserId
                        />
                    ))
                )}
                <div ref={messageListEndRef} />
            </div>

            {/* Form nhập liệu */}
            <form className="chat-input-area" onSubmit={handleSend}>
                <button type="button" className="icon-button attach-button" title="Attach File"><i className="fas fa-paperclip"></i></button>
                <input
                    type="text"
                    placeholder="Type your message here..."
                    className="message-input"
                    name="messageInput"
                    autoComplete="off"
                    // Disable if loading messages, no active chat, or currently sending
                    disabled={isLoadingMessages || !activeContact || sendingMessage} // <<<< Keep sendingMessage here
                    value={messageInput} // <<<< BIND VALUE TO STATE
                    onChange={(e) => setMessageInput(e.target.value)} // <<<< UPDATE STATE ON CHANGE
                />
                <button type="button" className="icon-button" title="Emoji"><i className="far fa-smile"></i></button>
                <button type="button" className="icon-button" title="Attach Photo"><i className="fas fa-camera"></i></button>
                <button
                    type="submit"
                    className="icon-button send-button"
                    title="Send Message"
                    // Disable if loading, no active chat, sending, or input state is empty
                    disabled={isLoadingMessages || !activeContact || sendingMessage || !messageInput.trim()} // <<<< CHECK STATE VALUE
                >
                     {sendingMessage ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;