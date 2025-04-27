// src/components/Chat/MessageBubble.jsx
import React, { useEffect } from 'react';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';
// Optional: Import Font Awesome icons if you want custom icons for file types
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faFile, faFileAlt, faFileImage, faFilePdf, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Add faSpinner

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
    status, // <<< NHẬN STATUS PROP (uploading, sending, sent, failed)
    // ... action handlers ...
}) => {

    // Tính toán sender dựa trên so sánh (senderId và currentUserId đều đã được trim ở ChatPage)
    const sender = senderId === currentUserId ? 'self' : 'other';

    // Render content based on type and status
    const renderContent = () => {
        // If message is deleted or failed after sending, show specific status/placeholder instead of content
        // If status is 'failed', render failure indicator instead of content (unless you want to show content with an error icon)
        if (isDeleted) {
             // Deleted state is handled in the wrapper check, renderContent should not be called for deleted
             return null;
        }

        // Handle different types
        switch (type) {
            case 'text':
                const textContent = content?.text?.data || '';
                return textContent.split('\n').map((line, index) => (
                    <p key={index} className="message-text">{line}</p>
                ));

            case 'image':
                // content.image is an array of image objects { metadata: { fileName, ... }, data: "URL", ... }
                // For optimistic update, data might be a local URL (blob)
                const images = content?.image;
                if (!images || !Array.isArray(images) || images.length === 0) {
                    // Handle cases with no images or invalid data
                    return status === 'uploading' ? <p className="message-text">[Uploading Image...]</p> : <p className="message-text">[No Image Data]</p>;
                }

                return (
                    <div className="message-image-container">
                         {/* Add uploading indicator overlay or style if status is 'uploading' */}
                         {status === 'uploading' && <div className="uploading-overlay"><i className="fas fa-spinner fa-spin"></i> Uploading...</div>}
                         {status === 'failed' && <div className="error-message-overlay"><i className="fas fa-exclamation-circle"></i> Failed</div>}

                        {images.map((img, index) => {
                            // Access URL from 'data' field, which could be local URL during optimistic update
                            const imageUrl = img.data;
                            const imageName = img.metadata?.fileName || `Image ${index + 1}`;

                            if (!imageUrl) {
                                // Fallback if URL is missing even in data
                                return <p key={index} className="message-text">[Image URL Missing: {imageName}]</p>;
                            }

                            return (
                                <img
                                    key={index}
                                    src={imageUrl}
                                    alt={imageName}
                                    className="message-image"
                                    // Disable click while uploading
                                     onClick={status !== 'uploading' ? () => window.open(imageUrl, '_blank') : undefined}
                                     style={{ cursor: status !== 'uploading' ? 'pointer' : 'default', opacity: status === 'uploading' ? 0.7 : 1 }} // Dim while uploading
                                />
                            );
                        })}
                    </div>
                );


            case 'file':
                 // content.file is a file object { metadata: { fileName, ... }, data: "URL", ... }
                 // For optimistic update, data might be null, name/size should be in metadata
                 const file = content?.file;
                 // Access URL from 'data' field
                 const fileUrl = file?.data;
                 const fileName = file?.metadata?.fileName;
                 const fileSize = file?.metadata?.size; // Access size from metadata


                 if (!fileName) {
                      // Handle cases with no name or invalid data
                      return status === 'uploading' ? <p className="message-text">[Uploading File...]</p> : <p className="message-text">[Invalid File Data: Name Missing]</p>;
                 }

                 // Display file info even if URL is not available (e.g., during upload)
                 return (
                      // Disable link while uploading or if URL is missing
                      <a
                         href={fileUrl || '#'} // Use # or null if url is missing, href="" might cause page reload
                         target={fileUrl ? "_blank" : undefined} // Only open in new tab if URL exists
                         rel={fileUrl ? "noopener noreferrer" : undefined} // Only add rel if URL exists
                         className={`message-file-link ${!fileUrl ? 'disabled-link' : ''}`}
                         onClick={!fileUrl ? (e) => e.preventDefault() : undefined} // Prevent default click if no URL
                         style={{ opacity: status === 'uploading' ? 0.7 : 1, cursor: !fileUrl ? 'default' : 'pointer' }} // Dim/change cursor while uploading
                      >
                           {/* Add uploading indicator or style if status is 'uploading' */}
                           {status === 'uploading' ?
                               <i className="fas fa-spinner fa-spin"></i> : // Font Awesome spinner
                               <i className="fas fa-file-alt"></i> // Font Awesome file icon
                           }
                           <span className="file-name">{fileName}</span>
                           {/* Display size if available */}
                           {fileSize && <span className="file-size">({(fileSize / 1024).toFixed(1)} KB)</span>}

                            {status === 'failed' && <i className="fas fa-exclamation-circle file-status-icon failed" title="Failed"></i>} {/* Font Awesome error icon */}
                      </a>
                 );


            default:
                // Handle unknown types
                return <p className="message-text">[{type ? type.toUpperCase() : 'UNKNOWN'}] Unsupported message type.</p>;
        }
    };

    // Deleted state is handled by wrapper class and specific bubble style in CSS
    // The renderContent function will return null if isDeleted is true
    const contentElement = renderContent();

    // Hide the bubble completely if deleted and no specific deleted style is needed
    // Or keep wrapper if deleted style handles visibility
    // if (isDeleted && !contentElement) { // Check if deleted AND renderContent returned null
    //     return null; // Or return the deleted placeholder wrapper defined earlier
    // }


    return (
        // Apply 'sent' or 'received', and 'deleted', 'failed', 'uploading' classes to the wrapper
        <div className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'} ${isDeleted ? 'deleted' : ''} ${status ? status : ''}`} data-message-id={id}>
             {/* ... SenderInfo for group chat (TODO) ... */}

             {/* Render the content bubble ONLY if not deleted and content is available */}
             {!isDeleted && contentElement && (
                <div className="message-bubble">
                    {contentElement} {/* Render the content */}
                    {isEdited && <span className="edited-indicator">(edited)</span>}
                     {/* Optional: Status icons next to timestamp if needed, or here */}
                     {/* {sender === 'self' && status === 'sent' && <i className="fas fa-check-double message-status-icon"></i>} */}
                     {/* {sender === 'self' && status === 'failed' && <i className="fas fa-exclamation-circle message-status-icon failed"></i>} */}
                </div>
             )}

             {/* Render deleted message placeholder if deleted */}
             {isDeleted && (
                 <div className="message-bubble deleted-message">
                     <i className="fas fa-trash-alt"></i> Message deleted.
                 </div>
             )}


            <span className="message-timestamp">{time}</span>

            {/* Status dot (sending, sent, read) */}
            {/* This can be added as CSS pseudo-elements or spans */}
            {/* {sender === 'self' && status === 'sending' && <span className="message-status-dot sending"></span>} */}
            {/* {sender === 'self' && status === 'sent' && <span className="message-status-dot sent"></span>} */}
        </div>
    );
};

export default MessageBubble;