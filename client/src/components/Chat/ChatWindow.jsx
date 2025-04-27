// src/components/Chat/ChatWindow.jsx
import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';

const ChatWindow = ({
    activeContact,
    messages,
    onMobileBack,
    isMobile,
    // Input state and setter (lifted to parent)
    messageInput, // <<< Receive messageInput value
    setMessageInput, // <<< Receive messageInput setter
    // Handlers for sending/saving/cancelling
    onSendTextMessage, // For new messages
    onSendFile, // For files/images
    onSaveEditedMessage, // <<< New prop for saving edited text
    onCancelEdit, // <<< New prop for cancelling edit
    isLoadingMessages,
    onOpenSettings,
    onDeleteMessage,
    // onEditMessage prop is now the handler to *start* the edit
    onEditMessage, // <<< This prop now calls the handler in ChatPage to SET editingMessageId
    sendingMessage, // Pass sending state down (disables input/buttons)
    currentUserId, // Pass current user ID down
    editingMessageId // <<< Pass editingMessageId down (controls input area mode and bubble state)
}) => {
    // Remove local state and ref if lifted
    // const [messageInput, setMessageInput] = useState(''); // REMOVE
    const messageListEndRef = useRef(null);

    // Refs for hidden file inputs
    const fileInputRef = useRef(null); // For general files (paperclip)
    const imageInputRef = useRef(null); // For images (camera)

    // Ref for the message input field to manage focus
    const messageInputRef = useRef(null);


    // EFFECT: Scroll to bottom when messages change, UNLESS editing
    useEffect(() => {
         // Only scroll if not currently editing a message
         if (!isLoadingMessages && editingMessageId === null) {
             messageListEndRef.current?.scrollIntoView({ behavior: "smooth" });
         }
    }, [messages, isLoadingMessages, editingMessageId]); // Add editingMessageId to dependencies


    // EFFECT: Focus input when editing starts
    useEffect(() => {
        if (editingMessageId !== null) {
            messageInputRef.current?.focus();
            // Move cursor to end of text? textarea.setSelectionRange(end, end)
            const input = messageInputRef.current;
            if (input) {
                 const end = input.value.length;
                 // Using setTimeout to ensure focus happens after render
                 setTimeout(() => {
                      input.setSelectionRange(end, end);
                 }, 0);
            }
        }
    }, [editingMessageId]); // Re-run when editingMessageId changes


    // Handle form submission (either send new or save edit)
    const handleFormSubmit = (event) => {
        event.preventDefault();
        const messageText = messageInput.trim();

        if (editingMessageId !== null) {
             // If in edit mode, call the save handler
             // Basic validation: cannot save empty message (backend should also validate)
             if (messageText) {
                  onSaveEditedMessage(); // Call the handler in ChatPage
             } else {
                  // Optionally show an error to the user
                 console.warn("Cannot save empty message.");
             }
        } else {
            // If not in edit mode, call the send handler for new text message
            if (messageText) {
                onSendTextMessage(messageText); // Call the handler in ChatPage
            }
        }
         // Input clearing handled by parent component handlers (onSend/onSave/onCancel)
    };

    // Handle input change (calls setter from parent)
    const handleInputChange = (e) => {
         setMessageInput(e.target.value);
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
             for (let i = 0; i < files.length; i++) {
                 onSendFile(files[i]); // <<< Call file handler for each image
             }
        }
        // Reset the input value
        event.target.value = null;
    };


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
    const isEditingMode = editingMessageId !== null; // Convenience flag

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
                    <button className="icon-button" title="Call" disabled={isEditingMode}><i className="fas fa-phone-alt"></i></button>
                    <button className="icon-button" title="Video Call" disabled={isEditingMode}><i className="fas fa-video"></i></button>
                    {isGroupChat && onOpenSettings && (
                         <button className="icon-button" title="More Options" onClick={onOpenSettings} disabled={isEditingMode}>
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
                            status={msg.status}
                            onDeleteMessage={onDeleteMessage}
                            onEditMessage={onEditMessage} // This now calls handleInitiateEditMessage in ChatPage
                            editingMessageId={editingMessageId} // Pass down which message is being edited
                        />
                    ))
                )}
                <div ref={messageListEndRef} />
            </div>

            {/* Form nhập liệu */}
            {/* Use onSubmit for both sending new text and saving edited text */}
            <form className="chat-input-area" onSubmit={handleFormSubmit}> {/* <<< Use handleFormSubmit */}

                {/* Hidden file inputs (should be disabled while editing) */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    disabled={sendingMessage || !activeContact || isEditingMode} // Disable while sending/uploading OR editing
                />
                <input
                    type="file"
                    ref={imageInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={sendingMessage || !activeContact || isEditingMode} // Disable while sending/uploading OR editing
                />

                {/* Button to trigger file input (should be disabled while editing) */}
                <button
                    type="button"
                    className="icon-button attach-button"
                    title="Attach File"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingMessage || !activeContact || isEditingMode} // Disable while sending/uploading OR editing
                >
                    <i className="fas fa-paperclip"></i>
                </button>

                {/* Input for message text or edited text */}
                {/* Use ref for focus management */}
                 <textarea
                     ref={messageInputRef} // <<< Use ref here
                     value={messageInput} // <<< Use prop value
                     onChange={handleInputChange} // <<< Use prop setter via local handler
                     placeholder={isEditingMode ? "Editing message..." : "Type your message here..."} // Change placeholder
                     className={`message-input ${isEditingMode ? 'editing-mode' : ''}`} // Add class for styling
                     name="messageInput"
                     autoComplete="off"
                     disabled={isLoadingMessages || !activeContact || sendingMessage} // Disable while loading messages, no chat, or sending/saving
                     rows={isEditingMode ? 2 : 1} // Adjust rows maybe? Or rely on CSS resize
                     style={{ resize: isEditingMode ? 'vertical' : 'none' }} // Allow vertical resize when editing
                 />
                 {/* Or keep it as <input type="text"> if you prefer single line initially */}
                 {/*
                <input
                    ref={messageInputRef}
                    type="text"
                    placeholder={isEditingMode ? "Editing message..." : "Type your message here..."}
                    className={`message-input ${isEditingMode ? 'editing-mode' : ''}`}
                    name="messageInput"
                    autoComplete="off"
                    disabled={isLoadingMessages || !activeContact || sendingMessage}
                    value={messageInput}
                    onChange={handleInputChange}
                />
                 */}


                {/* Button to trigger image input (should be disabled while editing) */}
                 <button
                     type="button"
                     className="icon-button"
                     title="Attach Photo"
                     onClick={() => imageInputRef.current?.click()}
                     disabled={sendingMessage || !activeContact || isEditingMode} // Disable while sending/uploading OR editing
                 >
                     <i className="fas fa-camera"></i>
                 </button>

                 {/* Emoji button (should be disabled while editing) */}
                <button type="button" className="icon-button" title="Emoji" disabled={sendingMessage || !activeContact || isEditingMode}><i className="far fa-smile"></i></button>

                {/* Cancel Edit Button (appears only in editing mode) */}
                 {isEditingMode && (
                      <button
                           type="button" // Important: prevent form submission
                           className="icon-button cancel-edit-button" // Add a specific class
                           title="Cancel Edit"
                           onClick={onCancelEdit} // Calls handler in ChatPage
                           disabled={sendingMessage} // Disable if saving is in progress
                      >
                           <i className="fas fa-times"></i> {/* Close/Cancel icon */}
                      </button>
                 )}


                {/* Send/Save Button (Submits the form) */}
                <button
                    type="submit" // This button submits the form
                    className="icon-button send-button"
                    title={isEditingMode ? "Save Edit" : "Send Message"} // Change title
                    // Disabled if loading, no active chat, sending/saving, or text input is empty
                    disabled={isLoadingMessages || !activeContact || sendingMessage || !messageInput.trim()}
                >
                     {sendingMessage ? <i className="fas fa-spinner fa-spin"></i> : (isEditingMode ? <i className="fas fa-check"></i> : <i className="fas fa-paper-plane"></i>)} {/* Change icon */}
                </button>
            </form>
        </section>
    );
};

export default ChatWindow;