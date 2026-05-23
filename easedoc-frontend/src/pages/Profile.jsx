import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiLock, FiSave } from 'react-icons/fi';
import './Profile.css';

const Profile = () => {
  const { user, updateUserSession } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    oldPassword: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (formData.password) {
      if (!formData.oldPassword) {
        toast.error("Please enter your current password to set a new one.");
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("New passwords do not match!");
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        ...(formData.password ? { password: formData.password, oldPassword: formData.oldPassword } : {})
      };
      
      const res = await api.put('/users/profile', payload);
      
      updateUserSession({
        token: res.data.token,
        user: res.data.user
      });
      
      toast.success(res.data.message || 'Profile updated successfully!');
      
      setFormData(prev => ({ ...prev, oldPassword: '', password: '', confirmPassword: '' }));
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-wrapper animate-fade-in">
      <header className="profile-header">
        <div className="header-info">
          <h2>Profile Settings</h2>
          <p>Manage your personal information and security.</p>
        </div>
      </header>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-large">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Current Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleChange}
                  placeholder="Enter current password if changing it"
                />
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>

            {formData.password && (
              <div className="form-group animate-fade-in">
                <label>Confirm New Password</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm your new password"
                  />
                </div>
              </div>
            )}

            <button type="submit" className="save-profile-btn" disabled={loading}>
              {loading ? 'Saving...' : <><FiSave /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
