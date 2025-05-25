// src/components/Chat/MessageBubble.jsx
import React, { useState, useRef, useEffect } from 'react';
import defaultAvatarPlaceholder from '../../assets/images/avatar_male.jpg';

const MessageBubble = ({
    time,
    id, // message ID
    type, // 'text', 'image', 'file'
    content, // { text: {...}, image: [...], file: {...} } OR optimistic { image: [{ data: localUrl, ... }] } or { file: { data: null, ...} }
    isEdited,
    isDeleted,
    senderId,
    isGroupChat,
    currentUserId,
    senderName,
    senderAvatar,
    status, 
    onDeleteMessage, // Nhận handler delete
    onEditMessage, // Nhận handler edit
    editingMessageId, // <<< Nhận prop này
}) => {

    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    const sender = senderId === currentUserId ? 'self' : 'other';

    // Logic đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);


    // Toggle menu visibility
    const toggleMenu = () => {
        setShowMenu(!showMenu);
    };

    // Handle Delete Action
    const handleDelete = () => {
        if (onDeleteMessage && !isDeleted && status !== 'uploading' && id !== editingMessageId) { // Prevent deleting while editing or uploading
            onDeleteMessage(id);
            setShowMenu(false); // Close menu after action
        }
    };

    // Handle Edit Action
    const handleEdit = () => {
        const textContent = content?.text?.data || '';
        // Check if editable (text type, not deleted, not uploading/sending, not already being edited)
        if (onEditMessage && type === 'text' && !isDeleted && status !== 'uploading' && status !== 'sending' && id !== editingMessageId) {
            onEditMessage(id, textContent); // <<< Truyền ID và nội dung hiện tại
            setShowMenu(false); // Close menu after action
        }
    };

    // Determine which options to show in the menu
    const canEdit = sender === 'self' && type === 'text' && !isDeleted && status !== 'uploading' && status !== 'sending' && id !== editingMessageId;
    const canDelete = sender === 'self' && !isDeleted && status !== 'uploading' && id !== editingMessageId;

    // Determine if the options button container should be shown
    // Show options only for self, not deleted, and not the message currently being edited
    const shouldShowOptionsButton = sender === 'self' && !isDeleted && id !== editingMessageId;

    // Add class if this message is currently being edited
    const isCurrentlyEditing = id === editingMessageId;


    // Render content based on type and status
    const renderContent = () => {
        if (isDeleted || isCurrentlyEditing) { // Don't render standard content if deleted or editing
             return null; // Or render a placeholder if needed
        }

        switch (type) {
            case 'text':
                const textContent = content?.text?.data || '';
                return textContent.split('\n').map((line, index) => (
                    <p key={index} className="message-text">{line}</p>
                ));

            case 'image':
                const images = content?.image;
                if (!images || !Array.isArray(images) || images.length === 0) {
                    return status === 'uploading' ? <p className="message-text">[Uploading Image...]</p> : <p className="message-text">[No Image Data]</p>;
                }
                return (
                    <div className="message-image-container">
                         {status === 'uploading' && <div className="uploading-overlay"><i className="fas fa-spinner fa-spin"></i> Uploading...</div>}
                         {status === 'failed' && <div className="error-message-overlay"><i className="fas fa-exclamation-circle"></i> Failed</div>}
                        {images.map((img, index) => {
                            const imageUrl = img.data;
                            const imageName = img.metadata?.fileName || `Image ${index + 1}`;
                            if (!imageUrl && status === 'uploading') {
                                // Hiển thị skeleton khi đang upload mà chưa có url
                                return (
                                    <div key={index} className="skeleton-image" />
                                );
                            }
                            if (!imageUrl) {
                                return <p key={index} className="message-text">[Image URL Missing: {imageName}]</p>;
                            }
                            return (
                                <img
                                    key={index}
                                    src={imageUrl}
                                    alt={imageName}
                                    className="message-image"
                                     onClick={(status !== 'uploading' && imageUrl) ? () => window.open(imageUrl, '_blank') : undefined}
                                     style={{ cursor: (status !== 'uploading' && imageUrl) ? 'pointer' : 'default', opacity: status === 'uploading' ? 0.7 : 1 }}
                                />
                            );
                        })}
                    </div>
                );
            case 'file':
                const file = content?.file;
                const fileUrl = file?.data;
                const fileName = file?.metadata?.fileName;
                const fileSize = file?.metadata?.size;

                // Hàm lấy icon theo loại file
                const getFileIconClass = (name) => {
                    if (!name) return "fas fa-file-alt";
                    const ext = name.split('.').pop().toLowerCase();
                    if (["pdf"].includes(ext)) return "fas fa-file-pdf";
                    if (["doc", "docx"].includes(ext)) return "fas fa-file-word";
                    if (["xls", "xlsx"].includes(ext)) return "fas fa-file-excel";
                    if (["ppt", "pptx"].includes(ext)) return "fas fa-file-powerpoint";
                    if (["zip", "rar", "7z"].includes(ext)) return "fas fa-file-archive";
                    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return "fas fa-file-image";
                    if (["mp3", "wav", "ogg"].includes(ext)) return "fas fa-file-audio";
                    if (["mp4", "avi", "mov", "wmv", "mkv"].includes(ext)) return "fas fa-file-video";
                    if (["txt", "md", "rtf"].includes(ext)) return "fas fa-file-alt";
                    return "fas fa-file";
                };

                if (!fileName) {
                    return status === 'uploading'
                    ? <p className="message-text">[Uploading File...]</p>
                    : <p className="message-text">[Invalid File Data: Name Missing]</p>;
                }
                return (
                    <a
                    href={fileUrl || '#'}
                    target={fileUrl ? "_blank" : undefined}
                    rel={fileUrl ? "noopener noreferrer" : undefined}
                    className={`message-file-link ${!fileUrl || status === 'uploading' ? 'disabled-link' : ''}`}
                    onClick={(!fileUrl || status === 'uploading') ? (e) => e.preventDefault() : undefined}
                    style={{ opacity: status === 'uploading' ? 0.7 : 1, cursor: (!fileUrl || status === 'uploading') ? 'default' : 'pointer' }}
                    >
                    {/* Icon luôn hiển thị */}
                    {status === 'uploading'
                        ? <i className="fas fa-spinner fa-spin"></i>
                        : <i className={getFileIconClass(fileName)}></i>
                    }
                    <span className="file-name">{fileName}</span>
                    {fileSize != null && (
                        <span className="file-size">
                            (
                            {fileSize >= 1024 * 1024
                            ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
                            : fileSize >= 1024
                            ? `${(fileSize / 1024).toFixed(1)} KB`
                            : `${fileSize} B`
                            }
                            )
                        </span>
                        )}
                    {status === 'failed' && <i className="fas fa-exclamation-circle file-status-icon failed" title="Failed"></i>}
                    </a>
                );
            default:
                return <p className="message-text">[{type ? type.toUpperCase() : 'UNKNOWN'}] Unsupported message type.</p>;
        }
    };

    const contentElement = renderContent(); // Render the content element

    // Determine if we should render the standard bubble structure or just the deleted one
    const shouldRenderBubble = !isDeleted && !isCurrentlyEditing;
    const shouldRenderDeletedPlaceholder = isDeleted;
    const shouldRenderEditingPlaceholder = isCurrentlyEditing;
    const nonConflictingStatusClass = (status && status !== 'sent' && status !== 'received') ? status : '';


    return (
        // Apply classes to the wrapper including 'editing' if it's the message being edited
        <div id={`message-${id}`} className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'} ${isDeleted ? 'deleted' : ''} ${nonConflictingStatusClass} ${isCurrentlyEditing ? 'editing-message' : ''}`} data-message-id={id} ref={menuRef}>

             {/* SenderInfo for group chat (only for received messages) */}
              {isGroupChat && sender !== 'self' && !isDeleted && !isCurrentlyEditing && (
                   <div className="message-sender-info">
                        <img src={senderAvatar || defaultAvatarPlaceholder} alt={senderName || 'User'} className="sender-avatar" />
                         <span className="sender-name">{senderName || 'Unknown'}</span>
                   </div>
              )}

            {/* Container for bubble and timestamp */}
            {(shouldRenderBubble || shouldRenderEditingPlaceholder || shouldRenderDeletedPlaceholder) && ( // Render this container if any form of the message is shown
                 <div className="message-content-area">
                      {/* Render the actual bubble content OR placeholder */}
                      {isEdited && <span className="edited-indicator">(edited)</span>}
                      {shouldRenderBubble && contentElement && (
                          <div className="message-bubble">
                              {contentElement}
                              {/* Optional status icons */}
                          </div>
                      )}

                      {/* Render deleted message placeholder if deleted */}
                      {shouldRenderDeletedPlaceholder && (
                          <div className="message-bubble deleted-message">
                              <i className="fas fa-trash-alt"></i> Message deleted.
                          </div>
                      )}

                       {/* Render editing placeholder if editing */}
                       {shouldRenderEditingPlaceholder && (
                           <div className="message-bubble editing-message-placeholder">
                               <i className="fas fa-edit"></i> Editing...
                           </div>
                       )}

                      {/* Timestamp (always show unless wrapper is hidden) */}
                      <span className="message-timestamp">{time}</span>
                 </div>
             )}


             {/* Options Button & Menu (Conditionally rendered) */}
             {shouldShowOptionsButton && (
                  <div className={`message-options-container ${sender} ${showMenu ? 'active-menu' : ''}`}>
                       {/* Options Button */}
                       <button
                            className="icon-button message-options-button"
                            title="Message Options"
                            onClick={toggleMenu}
                       >
                            <i className="fas fa-ellipsis-h"></i> {/* Horizontal ellipsis icon */}
                       </button>

                       {/* Options Menu (Conditionally rendered) */}
                       {showMenu && (
                            <div className={`message-options-menu ${sender}`}>
                                 {/* Edit Option (Conditionally rendered) */}
                                 {canEdit && (
                                      <div className="option-item" onClick={handleEdit}>Edit</div>
                                 )}
                                 {/* Delete Option (Conditionally rendered) */}
                                 {canDelete && (
                                      <div className="option-item" onClick={handleDelete}>Delete</div>
                                 )}
                                 {/* Add other potential options here */}
                            </div>
                       )}
                  </div>
             )}
        </div>
    );
};

export default MessageBubble;