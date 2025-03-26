import React from 'react';
import './PopupNotification.scss';

const PopupNotification = ({ message, type, onClose }) => {
  return (
    <div className={`popup-notification ${type}`}>
      <div className="popup-content">
        <p>{message}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default PopupNotification;