import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import './Popup.css';

const Popup = ({ 
    type, 
    message, 
    title, 
    onConfirm, 
    onCancel, 
    confirmText, 
    cancelText, 
    showCancel,
    showInput,
    placeholder,
    initialValue
}) => {
    const [inputValue, setInputValue] = useState(initialValue);

    useEffect(() => {
        setInputValue(initialValue);
    }, [initialValue]);

    const icons = {
        success: <FiCheckCircle className="popup-icon success" />,
        error: <FiAlertCircle className="popup-icon error" />,
        warning: <FiAlertTriangle className="popup-icon warning" />,
    };

    const handleBackdropClick = (e) => {
        if (onCancel) onCancel();
        else onConfirm();
    };

    return (
        <div className="popup-overlay animate-fade-in" onClick={handleBackdropClick}>
            <div className="popup-card animate-scale-up" onClick={e => e.stopPropagation()}>
                <button className="popup-close" onClick={onCancel}><FiX /></button>
                <div className="popup-content">
                    <div className="icon-container">
                        {icons[type] || icons.warning}
                    </div>
                    <h3>{title || type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                    <p>{message}</p>

                    {showInput && (
                        <div className="popup-input-wrapper">
                            <input 
                                type="text"
                                className="form-input"
                                placeholder={placeholder}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onConfirm(inputValue);
                                }}
                            />
                        </div>
                    )}
                </div>
                <div className="popup-actions">
                    {showCancel && (
                        <button className="btn btn-secondary" onClick={onCancel}>
                            {cancelText || 'Cancel'}
                        </button>
                    )}
                    <button 
                        className={`btn btn-${type === 'error' ? 'danger' : 'primary'}`} 
                        onClick={() => onConfirm(showInput ? inputValue : undefined)}
                    >
                        {confirmText || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Popup;
