import React from 'react';
import './ComponentLoader.css';

const ComponentLoader = ({ message }) => {
  return (
    <div className="component-loader">
      <div className="spinner">
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </div>
      {message && <span className="component-loader-text">{message}</span>}
    </div>
  );
};

export default ComponentLoader;
