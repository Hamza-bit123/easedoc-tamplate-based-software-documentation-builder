import React from 'react';
import './EasDocLoader.css';

const EasDocLoader = ({ message = "Fetching custom templates" }) => {
  return (
    <div className="easdoc-loader-layout">
      {/* Optional ambient background glow - uses your global variables */}
      <div className="easdoc-ambient-glow"></div>
      
      {/* Unified Identity Logo */}
      <div className="easdoc-brand-container">
        <div className="easdoc-e-logo-box">E</div>
        <div className="easdoc-asdoc-reveal">asDoc</div>
      </div>

      {/* Dynamic Status Message via Props */}
      <div className="easdoc-status-pill">
        <span className="easdoc-status-text">{message}</span>
        <div className="easdoc-dots-group">
          <div className="easdoc-dot"></div>
          <div className="easdoc-dot"></div>
          <div className="easdoc-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default EasDocLoader;