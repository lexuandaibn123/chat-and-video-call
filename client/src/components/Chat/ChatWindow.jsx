// src/components/Chat/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';

// Receive new props for sending different types
const ChatWindow = ({
    activeContact,
    messages,
    onMobileBack,
    isMobile,
    // Renamed onSendMessage to be more specific
    onSendTextMessage, // <<< New prop for sending text
    onSendFile, // <<< New prop for sending files/images
    isLoadingMessages,
    onOpenSettings,
    onDeleteMessage,
    onEditMessage,
    sendingMessage, // Pass sending state down
    currentUserId // Pass current user ID down
}) => {
    const [messageInput, setMessageInput] = useState('');
    const messageListEndRef = useRef(null);

    // Refs for hidden file inputs
    const fileInputRef = useRef(null); // For general files (paperclip)
    const imageInputRef = useRef(null); // For images (camera)


    // Handle text message send
    const handleSendText = (event) => {
        event.preventDefault();
        const messageText = messageInput.trim();
        if (messageText) {
            // Use the specific text handler
            onSendTextMessage(messageText); // <<< Call text handler
            setMessageInput('');
        }
    };

    // Handle file input change (for paperclip icon)
    const handleFileChange = (event) => {
        const file = event.target.files[0]; // Get the first selected file
        if (file) {
            // Use the file send handler
            onSendFile(file); // <<< Call file handler
        }
        // Reset the input value so the same file can be selected again
        event.target.value = null;
    };

    // Handle image input change (for camera icon)
    const handleImageChange = (event) => {
        const files = event.target.files; // Get all selected files (as FileList)
        if (files && files.length > 0) {
             // If your API supports sending multiple images in one message:
             // You could iterate here and call onSendFile for each OR
             // modify onSendFile to accept FileList
             // For simplicity, let's send each selected image as a separate message
             for (let i = 0; i < files.length; i++) {
                 onSendFile(files[i]); // <<< Call file handler for each image
             }
        }
        // Reset the input value
        event.target.value = null;
    };


    useEffect(() => {
         if (!isLoadingMessages) {
             messageListEndRef.current?.scrollIntoView({ behavior: "smooth" });
         }
    }, [messages, isLoadingMessages]);

    // Placeholder if no chat selected
    if (!activeContact) {
        return (
            <section className="active-chat-panel placeholder">
                <i className="far fa-comments placeholder-icon"></i>
                <span>Select a conversation to start chatting.</span>
            </section>
        );
    }

    const isGroupChat = activeContact.isGroup;

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
                    {/* Keep existing action buttons or add new ones */}
                    <button className="icon-button" title="Call"><i className="fas fa-phone-alt"></i></button>
                    <button className="icon-button" title="Video Call"><i className="fas fa-video"></i></button>
                    {isGroupChat && onOpenSettings && (
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
                            id={msg.id}
                            // Pass necessary props down
                            type={msg.type}
                            time={msg.time}
                            content={msg.content}
                            isEdited={msg.isEdited}
                            isDeleted={msg.isDeleted}
                            senderId={msg.senderId} // Trimmed senderId from state
                            senderName={msg.senderName} // Pass sender name/avatar for group view if needed
                            senderAvatar={msg.senderAvatar}
                            isGroupChat={isGroupChat}
                            currentUserId={currentUserId} // Trimmed currentUserId
                            status={msg.status} // <<< Pass status (uploading, sending, sent, failed)
                        />
                    ))
                )}
                <div ref={messageListEndRef} />
            </div>

            {/* Form nhập liệu */}
            {/* Use onSubmit for text message, buttons trigger file selection */}
            <form className="chat-input-area" onSubmit={handleSendText}> {/* <<< Use handleSendText */}
                {/* Hidden file inputs */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange} // <<< Handle file selection
                     disabled={sendingMessage || !activeContact} // Disable while sending/uploading
                />
                <input
                    type="file"
                    ref={imageInputRef}
                    style={{ display: 'none' }}
                    accept="image/*" // Only accept image files
                    multiple // Allow selecting multiple images
                    onChange={handleImageChange} // <<< Handle image selection
                     disabled={sendingMessage || !activeContact} // Disable while sending/uploading
                />

                {/* Button to trigger file input */}
                <button
                    type="button"
                    className="icon-button attach-button"
                    title="Attach File"
                    onClick={() => fileInputRef.current?.click()} // <<< Trigger file input
                    disabled={sendingMessage || !activeContact} // Disable while sending/uploading
                >
                    <i className="fas fa-paperclip"></i>
                </button>

                <input
                    type="text"
                    placeholder="Type your message here..."
                    className="message-input"
                    name="messageInput"
                    autoComplete="off"
                    disabled={isLoadingMessages || !activeContact || sendingMessage} // Disable while loading messages, no active chat, or sending/uploading
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                />

                {/* Button to trigger image input */}
                 <button
                     type="button"
                     className="icon-button"
                     title="Attach Photo"
                     onClick={() => imageInputRef.current?.click()} // <<< Trigger image input
                     disabled={sendingMessage || !activeContact} // Disable while sending/uploading
                 >
                     <i className="fas fa-camera"></i>
                 </button>

                 {/* Emoji button */}
                <button type="button" className="icon-button" title="Emoji" disabled={sendingMessage || !activeContact}><i className="far fa-smile"></i></button>


                {/* Send Button (Only for text messages via form submit) */}
                <button
                    type="submit" // This button submits the form for text messages
                    className="icon-button send-button"
                    title="Send Message"
                    // Disable if loading, no active chat, sending/uploading, or text input is empty
                    disabled={isLoadingMessages || !activeContact || sendingMessage || !messageInput.trim()}
                >
                     {sendingMessage ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;