// src/components/Chat/MessageEditDialog.jsx (Create this new file)
import React, { useState, useEffect, useRef } from 'react';

const MessageEditDialog = ({ messageId, initialText, onSave, onCancel, isLoading }) => {
    const [editText, setEditText] = useState(initialText);
    const inputRef = useRef(null); // Ref to focus the input

    // Focus input when dialog opens
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle saving
    const handleSave = () => {
        const trimmedText = editText.trim();
        if (trimmedText && onSave && !isLoading) {
            onSave(messageId, trimmedText);
        } else if (!trimmedText) {
             alert('Message cannot be empty.'); // Basic validation
        }
    };

    // Handle cancelling
    const handleCancel = () => {
        if (onCancel && !isLoading) {
            onCancel();
        }
    };

    // Handle key presses (Enter for save, Escape for cancel)
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent newline in input
            handleSave();
        } else if (event.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        // Overlay or positioned container for the dialog
        <div className="message-edit-dialog-overlay">
            <div className="message-edit-dialog">
                <h4>Edit Message</h4>
                <textarea
                    ref={inputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows="3" // Adjust rows as needed
                    disabled={isLoading}
                />
                <div className="dialog-actions">
                    <button
                        className="button secondary" // Use your button classes
                        onClick={handleCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="button primary" // Use your button classes
                        onClick={handleSave}
                        disabled={!editText.trim() || isLoading} // Disable if empty or loading
                    >
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageEditDialog;