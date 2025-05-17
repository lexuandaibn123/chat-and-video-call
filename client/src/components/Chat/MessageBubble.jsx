import React, { useState, useRef, useEffect } from 'react';
import defaultAvatarPlaceholder from '../../assets/images/avatar_male.jpg';
import { getUserDetailsApi } from '../../api/users';

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
    onDeleteMessage, // Nhận handler delete
    onEditMessage, // Nhận handler edit
    editingMessageId, // Nhận prop này
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [senderDetails, setSenderDetails] = useState(null); // Lưu thông tin sender
    const menuRef = useRef(null);

    // Xử lý senderId để lấy thông tin người gửi
    useEffect(() => {
        const processSenderId = async () => {
            if (!senderId) {
                setSenderDetails({
                    _id: 'unknown',
                    fullName: 'Unknown User',
                    email: '',
                    avatar: null,
                });
                return;
            }

            if (typeof senderId === 'string') {
                // senderId là chuỗi, gọi getUserDetailsApi
                try {
                    const user = await getUserDetailsApi(senderId);
                    setSenderDetails({
                        _id: senderId,
                        fullName: user.fullName || 'Unknown User',
                        email: user.email || '',
                        avatar: user.avatar || null,
                    });
                } catch (err) {
                    console.error(`Error fetching user details for ${senderId}:`, err);
                    setSenderDetails({
                        _id: senderId,
                        fullName: 'Unknown User',
                        email: '',
                        avatar: null,
                    });
                }
            } else if (typeof senderId === 'object' && senderId._id) {
                // senderId đã là object
                setSenderDetails({
                    _id: senderId._id,
                    fullName: senderId.fullName || 'Unknown User',
                    email: senderId.email || '',
                    avatar: senderId.avatar || null,
                });
            } else {
                console.warn('Invalid senderId format:', senderId);
                setSenderDetails({
                    _id: 'unknown',
                    fullName: 'Unknown User',
                    email: '',
                    avatar: null,
                });
            }
        };

        processSenderId();
    }, [senderId]);

    // Đóng menu khi click ra ngoài
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

    // Xác định sender và senderName
    const sender = senderDetails?._id === currentUserId ? 'self' : 'other';
    const senderName = senderDetails?._id === currentUserId ? 'You' : senderDetails?.fullName || 'Unknown User';
    const senderAvatar = senderDetails?.avatar || defaultAvatarPlaceholder;

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
                            if (!imageUrl && status !== 'uploading') {
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
                                    onClick={
                                        status !== 'uploading' && imageUrl
                                            ? () => window.open(imageUrl, '_blank')
                                            : undefined
                                    }
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
                        onClick={
                            !fileUrl || status === 'uploading' ? (e) => e.preventDefault() : undefined
                        }
                        style={{
                            opacity: status === 'uploading' ? 0.7 : 1,
                            cursor: !fileUrl || status === 'uploading' ? 'default' : 'pointer',
                        }}
                    >
                        {status === 'uploading' ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fas fa-file-alt"></i>
                        )}
                        <span className="file-name">{fileName}</span>
                        {fileSize != null && (
                            <span className="file-size">({(fileSize / 1024).toFixed(1)} KB)</span>
                        )}
                        {status === 'failed' && (
                            <i className="fas fa-exclamation-circle file-status-icon failed" title="Failed"></i>
                        )}
                    </a>
                );
            default:
                return (
                    <p className="message-text">
                        [{type ? type.toUpperCase() : 'UNKNOWN'}] Unsupported message type.
                    </p>
                );
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
            className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'} ${
                isDeleted ? 'deleted' : ''
            } ${nonConflictingStatusClass} ${isCurrentlyEditing ? 'editing-message' : ''}`}
            data-message-id={id}
            ref={menuRef}
        >
            {isGroupChat && sender !== 'self' && !isDeleted && !isCurrentlyEditing && (
                <div className="message-sender-info">
                    <img
                        src={senderAvatar}
                        alt={senderName}
                        className="sender-avatar"
                    />
                    <span className="sender-name">{senderName}</span>
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
                <div className={`message-options-container ${sender}`}>
                    <button
                        className="icon-button message-options-button"
                        title="Message Options"
                        onClick={toggleMenu}
                    >
                        <i className="fas fa-ellipsis-h"></i>
                    </button>

                    {showMenu && (
                        <div className={`message-options-menu ${sender}`}>
                            {canEdit && (
                                <div className="option-item" onClick={handleEdit}>
                                    Edit
                                </div>
                            )}
                            {canDelete && (
                                <div className="option-item" onClick={handleDelete}>
                                    Delete
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageBubble;