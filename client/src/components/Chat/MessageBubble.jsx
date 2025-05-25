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
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
    if (onDeleteMessage && !isDeleted && status !== 'uploading' && id !== editingMessageId) {
      onDeleteMessage(id);
      setShowMenu(false);
    }
  };

  // Handle Edit Action
  const handleEdit = () => {
    const textContent = content?.text?.data || '';
    if (
      onEditMessage &&
      type === 'text' &&
      !isDeleted &&
      status !== 'uploading' &&
      status !== 'sending' &&
      id !== editingMessageId
    ) {
      onEditMessage(id, textContent);
      setShowMenu(false);
    }
  };

  // Handle image click to show popup
  const handleImageClick = (index) => {
    if (status !== 'uploading' && content?.image?.[index]?.data) {
      setSelectedImageIndex(index);
      setShowImagePopup(true);
    }
  };

  // Close image popup
  const handleClosePopup = () => {
    setShowImagePopup(false);
    setSelectedImageIndex(0);
  };

  // Navigate to previous image
  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : content.image.length - 1));
  };

  // Navigate to next image
  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev < content.image.length - 1 ? prev + 1 : 0));
  };

  // Determine which options to show in the menu
  const canEdit =
    sender === 'self' &&
    type === 'text' &&
    !isDeleted &&
    status !== 'uploading' &&
    status !== 'sending' &&
    id !== editingMessageId;
  const canDelete = sender === 'self' && !isDeleted && status !== 'uploading' && id !== editingMessageId;

  // Determine if the options button container should be shown
  const shouldShowOptionsButton = sender === 'self' && !isDeleted && id !== editingMessageId;

  // Add class if this message is currently being edited
  const isCurrentlyEditing = id === editingMessageId;

  // Render content based on type and status
  const renderContent = () => {
    if (isDeleted || isCurrentlyEditing) {
      return null;
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
          return status === 'uploading' ? (
            <p className="message-text">[Uploading Image...]</p>
          ) : (
            <p className="message-text">[No Image Data]</p>
          );
        }
        return (
          <div className="message-image-container">
            {status === 'uploading' && (
              <div className="uploading-overlay">
                <i className="fas fa-spinner fa-spin"></i> Uploading...
              </div>
            )}
            {status === 'failed' && (
              <div className="error-message-overlay">
                <i className="fas fa-exclamation-circle"></i> Failed
              </div>
            )}
            {images.map((img, index) => {
              const imageUrl = img.data;
              const imageName = img.metadata?.fileName || `Image ${index + 1}`;
              if (!imageUrl && status === 'uploading') {
                return <div key={index} className="skeleton-image" />;
              }
              if (!imageUrl) {
                return (
                  <p key={index} className="message-text">
                    [Image URL Missing: {imageName}]
                  </p>
                );
              }
              return (
                <img
                  key={index}
                  src={imageUrl}
                  alt={imageName}
                  className="message-image"
                  onClick={() => handleImageClick(index)}
                  style={{
                    cursor: status !== 'uploading' && imageUrl ? 'pointer' : 'default',
                    opacity: status === 'uploading' ? 0.7 : 1,
                  }}
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

        const getFileIconClass = (name) => {
          if (!name) return 'fas fa-file-alt';
          const ext = name.split('.').pop().toLowerCase();
          if (['pdf'].includes(ext)) return 'fas fa-file-pdf';
          if (['doc', 'docx'].includes(ext)) return 'fas fa-file-word';
          if (['xls', 'xlsx'].includes(ext)) return 'fas fa-file-excel';
          if (['ppt', 'pptx'].includes(ext)) return 'fas fa-file-powerpoint';
          if (['zip', 'rar', '7z'].includes(ext)) return 'fas fa-file-archive';
          if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'fas fa-file-image';
          if (['mp3', 'wav', 'ogg'].includes(ext)) return 'fas fa-file-audio';
          if (['mp4', 'avi', 'mov', 'wmv', 'mkv'].includes(ext)) return 'fas fa-file-video';
          if (['txt', 'md', 'rtf'].includes(ext)) return 'fas fa-file-alt';
          return 'fas fa-file';
        };

        if (!fileName) {
          return status === 'uploading' ? (
            <p className="message-text">[Uploading File...]</p>
          ) : (
            <p className="message-text">[Invalid File Data: Name Missing]</p>
          );
        }
        return (
          <a
            href={fileUrl || '#'}
            target={fileUrl ? '_blank' : undefined}
            rel={fileUrl ? 'noopener noreferrer' : undefined}
            className={`message-file-link ${!fileUrl || status === 'uploading' ? 'disabled-link' : ''}`}
            onClick={!fileUrl || status === 'uploading' ? (e) => e.preventDefault() : undefined}
            style={{
              opacity: status === 'uploading' ? 0.7 : 1,
              cursor: !fileUrl || status === 'uploading' ? 'default' : 'pointer',
            }}
          >
            {status === 'uploading' ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className={getFileIconClass(fileName)}></i>
            )}
            <span className="file-name">{fileName}</span>
            {fileSize != null && (
              <span className="file-size">
                (
                {fileSize >= 1024 * 1024
                  ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
                  : fileSize >= 1024
                  ? `${(fileSize / 1024).toFixed(1)} KB`
                  : `${fileSize} B`}
                )
              </span>
            )}
            {status === 'failed' && (
              <i className="fas fa-exclamation-circle file-status-icon failed" title="Failed"></i>
            )}
          </a>
        );
      default:
        return <p className="message-text">[{type ? type.toUpperCase() : 'UNKNOWN'}] Unsupported message type.</p>;
    }
  };

  const contentElement = renderContent();

  const shouldRenderBubble = !isDeleted && !isCurrentlyEditing;
  const shouldRenderDeletedPlaceholder = isDeleted;
  const shouldRenderEditingPlaceholder = isCurrentlyEditing;
  const nonConflictingStatusClass =
    status && status !== 'sent' && status !== 'received' ? status : '';

  return (
    <div
      id={`message-${id}`}
      className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'} ${isDeleted ? 'deleted' : ''} ${nonConflictingStatusClass} ${
        isCurrentlyEditing ? 'editing-message' : ''
      }`}
      data-message-id={id}
      ref={menuRef}
    >
      {isGroupChat && sender !== 'self' && !isDeleted && !isCurrentlyEditing && (
        <div className="message-sender-info">
          <img
            src={senderAvatar || defaultAvatarPlaceholder}
            alt={senderName || 'User'}
            className="sender-avatar"
          />
          <span className="sender-name">{senderName || 'Unknown'}</span>
        </div>
      )}

      {(shouldRenderBubble || shouldRenderEditingPlaceholder || shouldRenderDeletedPlaceholder) && (
        <div className="message-content-area">
          {isEdited && <span className="edited-indicator">(edited)</span>}
          {shouldRenderBubble && contentElement && (
            <div className="message-bubble">{contentElement}</div>
          )}

          {shouldRenderDeletedPlaceholder && (
            <div className="message-bubble deleted-message">
              <i className="fas fa-trash-alt"></i> Message deleted.
            </div>
          )}

          {shouldRenderEditingPlaceholder && (
            <div className="message-bubble editing-message-placeholder">
              <i className="fas fa-edit"></i> Editing...
            </div>
          )}

          <span className="message-timestamp">{time}</span>
        </div>
      )}

      {shouldShowOptionsButton && (
        <div className={`message-options-container ${sender} ${showMenu ? 'active-menu' : ''}`}>
          <button className="icon-button message-options-button" title="Message Options" onClick={toggleMenu}>
            <i className="fas fa-ellipsis-h"></i>
          </button>

          {showMenu && (
            <div className={`message-options-menu ${sender}`}>
              {canEdit && <div className="option-item" onClick={handleEdit}>Edit</div>}
              {canDelete && <div className="option-item" onClick={handleDelete}>Delete</div>}
            </div>
          )}
        </div>
      )}

      {showImagePopup && content?.image?.length > 0 && (
        <div className="image-popup-overlay" onClick={handleClosePopup}>
          <div className="image-popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-popup-close" onClick={handleClosePopup}>
              <i className="fas fa-times"></i>
            </button>
            {content.image.length > 1 && (
              <>
                <button className="image-popup-nav prev" onClick={handlePrevImage}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button className="image-popup-nav next" onClick={handleNextImage}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </>
            )}
            <img
              src={content.image[selectedImageIndex].data}
              alt={content.image[selectedImageIndex].metadata?.fileName || `Image ${selectedImageIndex + 1}`}
              className="image-popup-img"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;