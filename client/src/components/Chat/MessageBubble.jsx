import React from 'react';

const MessageBubble = ({ sender, text, time }) => {
  return (
    <div className={`message-bubble-wrapper ${sender === 'self' ? 'sent' : 'received'}`}>
      <div className="message-bubble">
        {Array.isArray(text) ? text.map((line, index) => (
          <p key={index} className="message-text">{line}</p>
        )) : (
          <p className="message-text">{text}</p>
        )}
      </div>
      <span className="message-timestamp">{time}</span>
      {/* Status dot đã được xử lý bằng CSS ::after trong SCSS hoàn thiện hơn */}
      {/* {sender === 'self' && <span className="message-status-dot"></span>} */}
    </div>
  );
};

export default MessageBubble;