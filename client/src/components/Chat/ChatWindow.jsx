// src/components/Chat/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';
import { UploadButton } from '../../utils/uploadthing'; // <<< Import UploadButton

const ChatWindow = ({
    activeContact,
    messages,
    onMobileBack,
    isMobile,
    messageInput,
    setMessageInput,
    onSendTextMessage,
    // onSendFile, // <<< REMOVE THIS PROP
    onSaveEditedMessage,
    onCancelEdit,
    isLoadingMessages,
    onOpenSettings,
    onDeleteMessage,
    onEditMessage,
    sendingMessage,
    currentUserId,
    editingMessageId,
    // <<< ADD NEW Uploadthing Handlers as props >>>
    onUploadBeforeBegin,
    onClientUploadComplete,
    onUploadError,
    // <<< End ADD >>>
}) => {
    const messageListEndRef = useRef(null);

    // REMOVE Refs for hidden file inputs
    // const fileInputRef = useRef(null);
    // const imageInputRef = useRef(null);

    // Ref for the message input field to manage focus
    const messageInputRef = useRef(null);


    // EFFECT: Scroll to bottom (remains the same)
    useEffect(() => {
         if (!isLoadingMessages && editingMessageId === null) {
             messageListEndRef.current?.scrollIntoView({ behavior: "auto" });
         }
    }, [messages, isLoadingMessages, editingMessageId]);


    // EFFECT: Focus input when editing starts (remains the same)
    useEffect(() => {
        if (editingMessageId !== null) {
            messageInputRef.current?.focus();
            const input = messageInputRef.current;
            if (input) {
                 const end = input.value.length;
                 setTimeout(() => {
                      input.setSelectionRange(end, end);
                 }, 0);
            }
        }
    }, [editingMessageId]);


    // Handle form submission (remains the same)
    const handleFormSubmit = (event) => {
        event.preventDefault();
        const messageText = messageInput.trim();

        if (editingMessageId !== null) {
             if (messageText) {
                  onSaveEditedMessage();
             } else {
                 console.warn("Cannot save empty message.");
             }
        } else {
            if (messageText) {
                onSendTextMessage(messageText);
            }
        }
    };

    // Handle input change (remains the same)
    const handleInputChange = (e) => {
         setMessageInput(e.target.value);
    };

    // REMOVE handleFileChange and handleImageChange


    // Placeholder if no chat selected (remains the same)
    if (!activeContact) {
        return (
            <section className="active-chat-panel placeholder">
                <i className="far fa-comments placeholder-icon"></i>
                <span>Select a conversation to start chatting.</span>
            </section>
        );
    }

    const isGroupChat = activeContact.isGroup;
    const isEditingMode = editingMessageId !== null; // Convenience flag

    return (
        <section className="active-chat-panel">
            <header className="chat-header">
                {/* ... (header content remains the same) ... */}
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
                    <button className="icon-button" title="Call" disabled={isEditingMode || sendingMessage}><i className="fas fa-phone-alt"></i></button>
                    <button className="icon-button" title="Video Call" disabled={isEditingMode || sendingMessage}><i className="fas fa-video"></i></button>
                    {isGroupChat && onOpenSettings && (
                         <button className="icon-button" title="More Options" onClick={onOpenSettings} disabled={isEditingMode || sendingMessage}>
                              <i className="fas fa-ellipsis-v"></i>
                         </button>
                    )}
                </div>
            </header>

            <div className="message-list-container">
                 {/* ... (message list rendering remains the same) ... */}
                {isLoadingMessages ? (
                     <div className="loading-messages">Loading messages...</div>
                ) : messages.length === 0 ? (
                     <div className="no-messages">Start a conversation!</div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            id={msg.id}
                            type={msg.type}
                            time={msg.time}
                            content={msg.content}
                            isEdited={msg.isEdited}
                            isDeleted={msg.isDeleted}
                            senderId={msg.senderId}
                            senderName={msg.senderName}
                            senderAvatar={msg.senderAvatar}
                            isGroupChat={isGroupChat}
                            currentUserId={currentUserId}
                            status={msg.status} // Pass status for optimistic updates
                            onDeleteMessage={onDeleteMessage}
                            onEditMessage={onEditMessage}
                            editingMessageId={editingMessageId}
                        />
                    ))
                )}
                <div ref={messageListEndRef} />
            </div>

            {/* Form nhập liệu */}
            <form className="chat-input-area" onSubmit={handleFormSubmit}>

                {/* REMOVE hidden file inputs */}

                {/* <<< START NEW UploadButton COMPONENTS >>> */}

                {/* Paperclip Button (Files) */}
                 <div className="icon-button attach-button uploadthing-wrapper"> {/* Use a wrapper for styling */}
                    <UploadButton
                        endpoint={"conversationUploader"} // Match your backend endpoint name
                        key="file-uploader" // Unique key
                        disabled={sendingMessage || !activeContact || isEditingMode} // Disable when busy or editing
                        content={{
                            button: <i className="fas fa-paperclip"></i>, // Use your icon
                            // allowedContent: "Any file, max 4MB", // Optional hint
                        }}
                        // Add appearance styles to match your existing icon buttons
                        appearance={{
                             button: { padding: 0, height: 'auto', lineHeight: 'normal', pointerEvents: 'all' },
                             container: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
                             // label: { display: 'none' },
                        }}
                        // Wire up the handlers passed from parent
                        onBeforeUploadBegin={onUploadBeforeBegin}
                        onClientUploadComplete={onClientUploadComplete}
                        onUploadError={onUploadError}
                    />
                 </div>

                 {/* Camera Button (Images) */}
                  <div className="icon-button uploadthing-wrapper"> {/* Wrapper for styling */}
                    <UploadButton
                        endpoint={"conversationUploader"} // Match your backend endpoint name
                        key="image-uploader" // Unique key
                        multiple={true} // Allow multiple image selection
                        accept="image/*" // Only accept image files
                        disabled={sendingMessage || !activeContact || isEditingMode} // Disable when busy or editing
                        content={{
                            button: <i className="fas fa-camera"></i>, // Use your icon
                            // allowedContent: "Images only, max 4MB each", // Optional hint
                        }}
                         appearance={{
                             button: { padding: 0, height: 'auto', lineHeight: 'normal', pointerEvents: 'all' },
                             container: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
                             // label: { display: 'none' },
                        }}
                        // Wire up the handlers passed from parent
                        onBeforeUploadBegin={onUploadBeforeBegin}
                        onClientUploadComplete={onClientUploadComplete}
                        onUploadError={onUploadError}
                    />
                 </div>
                {/* >>> END NEW UploadButton COMPONENTS >>> */}


                {/* Input for message text or edited text (remains the same) */}
                 <textarea
                     ref={messageInputRef}
                     value={messageInput}
                     onChange={handleInputChange}
                     placeholder={isEditingMode ? "Editing message..." : "Type your message here..."}
                     className={`message-input ${isEditingMode ? 'editing-mode' : ''}`}
                     name="messageInput"
                     autoComplete="off"
                     disabled={isLoadingMessages || !activeContact || sendingMessage}
                     rows={isEditingMode ? 2 : 1}
                     style={{ resize: isEditingMode ? 'vertical' : 'none' }}
                 />


                 {/* Emoji button (remains the same) */}
                <button type="button" className="icon-button" title="Emoji" disabled={sendingMessage || !activeContact || isEditingMode}><i className="far fa-smile"></i></button>

                {/* Cancel Edit Button (remains the same) */}
                 {isEditingMode && (
                      <button
                           type="button"
                           className="icon-button cancel-edit-button"
                           title="Cancel Edit"
                           onClick={onCancelEdit}
                           disabled={sendingMessage}
                      >
                           <i className="fas fa-times"></i>
                      </button>
                 )}


                {/* Send/Save Button (remains the same) */}
                <button
                    type="submit"
                    className="icon-button send-button"
                    title={isEditingMode ? "Save Edit" : "Send Message"}
                    disabled={isLoadingMessages || !activeContact || sendingMessage || (!isEditingMode && !messageInput.trim())}
                >
                     {sendingMessage ? <i className="fas fa-spinner fa-spin"></i> : (isEditingMode ? <i className="fas fa-check"></i> : <i className="fas fa-paper-plane"></i>)}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;