import React, { createContext, useState, useContext } from 'react';
import Popup from '../components/Popup';

const PopupContext = createContext();

export const usePopup = () => {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error('usePopup must be used within a PopupProvider');
    }
    return context;
};

export const PopupProvider = ({ children }) => {
    const [popup, setPopup] = useState(null);

    const showPopup = ({ 
        type = 'info', 
        message, 
        title, 
        onConfirm, 
        onCancel, 
        confirmText, 
        cancelText,
        showInput = false,
        placeholder = 'Enter value...',
        initialValue = ''
    }) => {
        setPopup({ 
            type, 
            message, 
            title, 
            onConfirm, 
            onCancel, 
            confirmText, 
            cancelText,
            showInput,
            placeholder,
            initialValue
        });
    };

    const hidePopup = () => {
        setPopup(null);
    };

    const handleConfirm = (value) => {
        if (popup?.onConfirm) popup.onConfirm(value);
        hidePopup();
    };

    const handleCancel = () => {
        if (popup?.onCancel) popup.onCancel();
        hidePopup();
    };

    return (
        <PopupContext.Provider value={{ showPopup, hidePopup }}>
            {children}
            {popup && (
                <Popup
                    type={popup.type}
                    message={popup.message}
                    title={popup.title}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    confirmText={popup.confirmText}
                    cancelText={popup.cancelText}
                    showCancel={true}
                    showInput={popup.showInput}
                    placeholder={popup.placeholder}
                    initialValue={popup.initialValue}
                />
            )}
        </PopupContext.Provider>
    );
};
