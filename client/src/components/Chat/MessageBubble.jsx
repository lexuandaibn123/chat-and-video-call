// src/components/Chat/MessageBubble.jsx
import React, { useEffect } from 'react';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';
// Có thể cần thêm icon cho file types nếu muốn
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faFile, faFileAlt, faFileImage, faFilePdf, ... } from '@fortawesome/free-solid-svg-icons';

const MessageBubble = ({
    time,
    id, // message ID
    type, // 'text', 'image', 'file'
    content, // { text: {...}, image: [...], file: {...} }
    isEdited,
    isDeleted,
    senderId,
    isGroupChat,
    currentUserId,
    senderName,
    senderAvatar,
    // ... action handlers ...
}) => {

    // Thêm console log để debug so sánh ID nếu cần thiết
    // useEffect(() => {
    //     console.log(`[Message ${id}] senderId: "${senderId}" (${typeof senderId}), currentUserId: "${currentUserId}" (${typeof currentUserId}), Comparison: ${senderId === currentUserId}`);
    // }, [id, senderId, currentUserId]);


    // Tính toán sender dựa trên so sánh (senderId và currentUserId đều đã được trim ở ChatPage)
    const sender = senderId === currentUserId ? 'self' : 'other';

    // Render content based on type
    const renderContent = () => {
        // Nếu tin nhắn bị xóa, không cần render content gốc
        if (isDeleted) return null; // Content gốc không hiển thị khi deleted

        switch (type) {
            case 'text':
                const textContent = content?.text?.data || '';
                // Sử dụng dangerouslySetInnerHTML nếu nội dung text có thể chứa HTML an toàn (cẩn thận XSS!)
                // Hoặc parse markdown/links nếu cần
                return textContent.split('\n').map((line, index) => (
                    // Sử dụng <p> hoặc <div> để giữ nguyên định dạng dòng
                    <p key={index} className="message-text">{line}</p>
                ));

            case 'image':
                // content.image là một MẢNG các đối tượng ảnh { url, thumbnailUrl, ... }
                const images = content?.image;
                if (!images || !Array.isArray(images) || images.length === 0) {
                    return <p className="message-text">[Invalid Image Data]</p>;
                }
                // Render nhiều ảnh nếu có
                return (
                    <div className="message-image-container">
                        {images.map((img, index) => (
                            // Sử dụng thumbnailUrl nếu có, nếu không dùng url
                            // Thêm alt text cho ảnh (có thể lấy từ metadata nếu API cung cấp)
                            <img
                                key={index}
                                src={img.thumbnailUrl || img.url}
                                alt={img.metadata?.fileName || `Image ${index + 1}`}
                                className="message-image"
                                // Optional: Thêm onClick để mở ảnh gốc trong modal/tab mới
                                // onClick={() => window.open(img.url, '_blank')}
                            />
                        ))}
                    </div>
                );


            case 'file':
                 // content.file là một ĐỐI TƯỢNG file { url, name, size, type, ... }
                 const file = content?.file;
                 if (!file || !file.url || !file.name) {
                      return <p className="message-text">[Invalid File Data]</p>;
                 }
                 // Optional: Chọn icon dựa trên file type
                 // const getFileIcon = (mimeType) => {
                 //     if (mimeType?.startsWith('image/')) return faFileImage;
                 //     if (mimeType === 'application/pdf') return faFilePdf;
                 //     // Add more types
                 //     return faFileAlt; // Default file icon
                 // };
                 // <FontAwesomeIcon icon={getFileIcon(file.type)} />

                 return (
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="message-file-link">
                           <i className="fas fa-file-alt"></i> {/* Font Awesome icon, make sure it's included in your project */}
                           <span className="file-name">{file.name}</span>
                           {/* Optional: Hiển thị kích thước file */}
                           {/* {file.size && <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>} */}
                      </a>
                 );


            default:
                // Handle unknown types
                return <p className="message-text">[{type.toUpperCase()}] Unsupported message type.</p>;
        }
    };

    // Nếu tin nhắn bị xóa, render placeholder deleted
    if (isDeleted) {
        return (
            <div className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'} deleted`} data-message-id={id}>
                {/* Optional: Show sender name/avatar for deleted received messages in group chat */}
                {/* {isGroupChat && sender === 'other' && senderName && <div className="sender-name-deleted">{senderName}</div>} */}
                <div className="message-bubble deleted-message">
                    <i className="fas fa-trash-alt"></i> Message deleted.
                </div>
                 <span className="message-timestamp">{time}</span>
            </div>
        );
    }

    return (
        // Sử dụng 'sender' đã tính toán để áp dụng class CSS
        <div className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'}`} data-message-id={id}>
             {/* >>> GỢI Ý THAY ĐỔI GIAO DIỆN/LOGIC <<< */}
             {/* In group chats, display sender name/avatar for 'received' messages */}
             {/* {isGroupChat && sender === 'other' && ( */}
             {/*     <div className="sender-info"> */}
             {/*          <img src={senderAvatar || defaultAvatarPlaceholder} alt={senderName || 'User'} className="sender-avatar" /> */}
             {/*          <span className="sender-name">{senderName || 'Unknown User'}</span> */}
             {/*     </div> */}
             {/* )} */}

            <div className="message-bubble">
                {/* Gọi renderContent() để hiển thị nội dung dựa trên type */}
                {renderContent()}
                 {isEdited && <span className="edited-indicator">(edited)</span>}
            </div>
            {/* Optional: Message context menu trigger */}
            {/* <div className="message-options-trigger"><i className="fas fa-ellipsis-h"></i></div> */}

            <span className="message-timestamp">{time}</span>

            {/* Status dot (sending, sent, read) */}
            {/* {sender === 'self' && status === 'sending' && <span className="message-status-dot sending"></span>} */}
            {/* {sender === 'self' && status === 'sent' && <span className="message-status-dot sent"></span>} */}
        </div>
    );
};

export default MessageBubble;