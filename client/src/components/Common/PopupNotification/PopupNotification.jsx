import React from 'react';
import './PopupNotification.scss';

// Thêm prop isResending (mặc định là false)
const PopupNotification = ({ message, type, onClose, onResend, isResending = false }) => {
  return (
    <div className={`popup-notification ${type}`}>
      <div className="popup-content">
        <p>{message}</p>
        <div className="popup-buttons">
          {/* Hiển thị nút Resend nếu có prop onResend */}
          {onResend && type === 'error' && (
            <button
              onClick={onResend}
              className="resend-button-popup"
              disabled={isResending} // Disable nút khi đang gửi lại
            >
              {/* Thay đổi text dựa vào isResending */}
              {isResending ? 'Resending...' : 'Resend Email'}
            </button>
          )}
          {/* Nút Close không bị ảnh hưởng bởi isResending */}
          <button onClick={onClose} className="close-button-popup" disabled={isResending}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PopupNotification;