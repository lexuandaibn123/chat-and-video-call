import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import defaultAvatarPlaceholder from '../../assets/images/avatar_placeholder.jpg';

const ChatWindow = ({ activeContact, messages, onMobileBack, isMobile, onSendMessage }) => {
    const messageListEndRef = useRef(null); // Ref để tự động cuộn xuống cuối

    // Hàm xử lý gửi tin nhắn (ví dụ)
    const handleSend = (event) => {
        event.preventDefault();
        const inputElement = event.target.elements.messageInput; // Lấy input element bằng name
        const messageText = inputElement.value.trim();
        if (messageText) {
        onSendMessage(messageText); // Gọi hàm prop để xử lý logic gửi
        inputElement.value = ''; // Xóa input sau khi gửi
        }
    };

    // Tự động cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        messageListEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]); // Chạy lại khi messages thay đổi

    // Placeholder nếu chưa chọn chat
    if (!activeContact) {
        return (
        <section className="active-chat-panel placeholder">
            <i className="far fa-comments placeholder-icon"></i>
            <span>Select a conversation to start chatting.</span>
        </section>
        );
    }

    return (
        <section className="active-chat-panel">
        <header className="chat-header">
            {isMobile && (
                <button className="icon-button back-button" title="Back" onClick={onMobileBack}>
                    <i className="fas fa-arrow-left"></i>
                </button>
            )}
            <div className="contact-info">
            <img src={activeContact || defaultAvatarPlaceholder } alt={activeContact.name} className="avatar" />
            <div className="name-status">
                <span className="contact-name">{activeContact.name}</span>
                <span className="contact-status">{activeContact.statusText || 'Offline'}</span>
            </div>
            </div>
            <div className="chat-actions">
            <button className="icon-button" title="Call"><i className="fas fa-phone-alt"></i></button>
            <button className="icon-button" title="Video Call"><i className="fas fa-video"></i></button>
            <button className="icon-button" title="More Options"><i className="fas fa-ellipsis-v"></i></button>
            </div>
        </header>

        <div className="message-list-container">
            {messages.map(msg => (
            <MessageBubble
                key={msg.id}
                sender={msg.sender}
                text={msg.text}
                time={msg.time}
            />
            ))}
            {/* Phần tử trống để làm điểm neo cuộn xuống */}
            <div ref={messageListEndRef} />
        </div>

        {/* Form bao bọc input để xử lý submit */}
        <form className="chat-input-area" onSubmit={handleSend}>
            <button type="button" className="icon-button attach-button" title="Attach File"><i className="fas fa-paperclip"></i></button>
            <input
                type="text"
                placeholder="Type your message here..."
                className="message-input"
                name="messageInput" // Thêm name để lấy giá trị dễ dàng
                autoComplete="off"
            />
            <button type="button" className="icon-button" title="Emoji"><i className="far fa-smile"></i></button>
            <button type="button" className="icon-button" title="Attach Photo"><i className="fas fa-camera"></i></button>
            {/* Nút gửi có thể thay đổi icon dựa trên input có text hay không */}
            <button type="submit" className="icon-button mic-button" title="Send Message">
                {/* <i className="fas fa-microphone"></i> Thay bằng icon Send */}
                <i className="fas fa-paper-plane"></i>
            </button>
        </form>
        </section>
    );
};

export default ChatWindow;